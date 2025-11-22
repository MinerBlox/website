const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const { Firestore } = require("@google-cloud/firestore");

const USERNAME = "repsscentral_";

const db = new Firestore({
  projectId: process.env.FIREBASE_PROJECT_ID,
  credentials: {
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }
});

async function run() {
  const api = `https://www.tiktok.com/api/post/item_list/?aid=1988&uniqueId=${USERNAME}&count=40&cursor=0`;

  let response = await fetch(api, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json"
    }
  });

  let text = await response.text();
  let json;

  if (text.startsWith("<")) {
    const match = text.match(/"ItemModule":({.+?}),"VideoModule"/s);
    if (!match) throw new Error("TikTok HTML returned without SIGI_STATE");
    const raw = match[1];
    json = JSON.parse(raw);
  } else {
    json = JSON.parse(text);
    json = json.itemList || [];
  }

  const videos = Array.isArray(json) ? json : Object.values(json);

  for (const v of videos) {
    await db.collection("tiktok_videos").doc(v.id).set({
      thumbnail: v.cover || v.video?.cover,
      videoUrl: `https://www.tiktok.com/@${USERNAME}/video/${v.id}`,
      createdAt: Date.now(),
      assigned: false
    }, { merge: true });
  }

  console.log("Sync complete ✔");
}

run();
