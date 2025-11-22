const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const { Firestore } = require("@google-cloud/firestore");

// Firestore NAM5-Compatible initialization
const db = new Firestore({
  projectId: process.env.FIREBASE_PROJECT_ID,
  credentials: {
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  databaseId: "(default)",
});

// TikTok user
const USERNAME = "repsscentral_";

// TikTok API URL (web feed)
const FEED_URL = `https://www.tiktok.com/api/post/item_list/?aid=1988&uniqueId=${USERNAME}&count=30`;

async function run() {
  console.log("Fetching TikTok feed…");

  const response = await fetch(FEED_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
      Referer: "https://www.tiktok.com/",
    },
  });

  console.log("TikTok status:", response.status);

  if (!response.ok) {
    console.error("Failed to fetch TikTok:", await response.text());
    return;
  }

  const json = await response.json();

  if (!json.itemList || json.itemList.length === 0) {
    console.log("No videos found.");
    return;
  }

  console.log(`Found ${json.itemList.length} videos.`);

  for (const item of json.itemList) {
    const id = item.id;
    const thumbnail = item.video.cover;
    const url = `https://www.tiktok.com/@${USERNAME}/video/${id}`;

    console.log("Writing:", id);

    await db.collection("tiktok_videos").doc(id).set(
      {
        thumbnail,
        videoUrl: url,
        createdAt: Date.now(),
        assigned: false,
      },
      { merge: true }
    );
  }

  console.log("DONE ✓");
}

run();
