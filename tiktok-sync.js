// TikTok Sync Script (UK-safe, GitHub Actions compatible)
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
const { Firestore } = require("@google-cloud/firestore");

const USERNAME = "repsscentral_";
const URLBIRD = `https://urlebird.com/user/${USERNAME}/`;

const db = new Firestore({
  projectId: process.env.FIREBASE_PROJECT_ID,
  credentials: {
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }
});

async function safeJSON(text) {
  try { return JSON.parse(text); }
  catch { return null; }
}

async function fetchAPI() {
  const api = `https://www.tiktok.com/api/post/item_list/?aid=1988&uniqueId=${USERNAME}&count=35&cursor=0`;
  try {
    const res = await fetch(api, { headers: { "User-Agent": "Mozilla/5.0" }});
    const text = await res.text();
    const json = safeJSON(text);
    return json?.itemList || null;
  } catch { return null; }
}

async function fetchSIGI() {
  try {
    const html = await fetch(`https://www.tiktok.com/@${USERNAME}`).then(r => r.text());
    const match = html.match(/"ItemModule":({.+?}),"UserModule"/s);
    if (!match) return null;
    const json = safeJSON(match[1]);
    return json ? Object.values(json) : null;
  } catch { return null; }
}

async function fetchURLBird() {
  try {
    const html = await fetch(URLBIRD).then(r => r.text());
    const ids = [...html.matchAll(/\/video\/(\d+)\//g)].map(m => m[1]);
    const unique = [...new Set(ids)];
    let out = [];
    for (let id of unique) {
      const videoHTML = await fetch(`https://urlebird.com/video/${id}/`).then(r => r.text());
      const og = videoHTML.match(/property="og:image" content="(.*?)"/);
      out.push({ id, cover: og ? og[1] : "" });
    }
    return out;
  } catch { return null; }
}

async function save(videos) {
  if (!videos || videos.length === 0) return console.log("No videos found.");
  for (const v of videos) {
    await db.collection("tiktok_videos").doc(v.id).set({
      thumbnail: v.cover || "",
      videoUrl: `https://www.tiktok.com/@${USERNAME}/video/${v.id}`,
      createdAt: Date.now(),
      assigned: false
    }, { merge: true });
    console.log("Saved:", v.id);
  }
}

async function run() {
  console.log("Starting TikTok sync…");

  let videos = await fetchAPI();
  if (videos) { console.log("API OK"); return save(videos); }

  videos = await fetchSIGI();
  if (videos) { console.log("SIGI OK"); return save(videos); }

  videos = await fetchURLBird();
  if (videos) { console.log("URLBird OK"); return save(videos); }

  console.log("❌ All methods failed");
}

run();
