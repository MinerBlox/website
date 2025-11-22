const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const { Firestore } = require("@google-cloud/firestore");

const USERNAME = "repsscentral_";

// NAM5 Firestore client
const db = new Firestore({
  projectId: process.env.FIREBASE_PROJECT_ID,
  credentials: {
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  databaseId: "(default)",
});

// TikTok API endpoint (reliable)
const TIKTOK_API = `https://www.tiktok.com/api/post/item_list/?aid=1988&uniqueId=${USERNAME}&count=30&cursor=0&region=US&app_language=en`;

async function run() {
  console.log("Fetching TikTok feed…");

  const response = await fetch(TIKTOK_API, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
      Referer: "https://www.tiktok.com/@repsscentral_",
      "Accept-Language": "en-US,en;q=0.9",
      Accept: "application/json",
    },
  });

  console.log("TikTok status:", response.status);

  let text = await response.text();

  // Sometimes TikTok wraps JSON in <script>window['SIGI_STATE']=... 
  if (text.startsWith("<")) {
    console.log("HTML detected — extracting JSON from SIGI_STATE");

    const match = text.match(/"ItemModule":({.+?}),"VideoModule"/s);
    if (!match) {
      console.log("❌ No SIGI_STATE JSON found.");
      return;
    }

    const raw = match[1];
    const json = JSON.parse(raw);

    const videoKeys = Object.keys(json);

    console.log("Extracted video IDs:", videoKeys);

    for (const id of videoKeys) {
      let vid = json[id];
      await saveVideo(id, vid.cover, vid.id);
    }

    console.log("DONE ✓");
    return;
  }

  // Pure JSON response
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    console.log("❌ JSON parse failed:", e);
    console.log("Returned text was:", text.slice(0, 200));
    return;
  }

  if (!json.itemList) {
    console.log("No items found.");
    return;
  }

  console.log(`Found ${json.itemList.length} videos`);

  for (const item of json.itemList) {
    await saveVideo(item.id, item.video.cover, item.id);
  }

  console.log("DONE ✓");
}

async function saveVideo(id, thumbnail, videoId) {
  const url = `https://www.tiktok.com/@${USERNAME}/video/${videoId}`;

  console.log("Saving:", videoId);

  try {
    await db.collection("tiktok_videos").doc(videoId).set(
      {
        thumbnail,
        videoUrl: url,
        createdAt: Date.now(),
        assigned: false,
      },
      { merge: true }
    );

    console.log("🔥 SAVED:", videoId);
  } catch (err) {
    console.log("❌ FIRESTORE ERROR:", err);
  }
}

run();
