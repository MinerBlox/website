const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { Firestore } = require('@google-cloud/firestore');

// ---------- DEBUG LOGGING ----------
console.log("=== DEBUG: ENVIRONMENT VARIABLES ===");
console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
console.log("FIREBASE_CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL);
console.log("FIREBASE_PRIVATE_KEY starts with:", process.env.FIREBASE_PRIVATE_KEY?.slice(0, 30));
console.log("====================================");

// Firestore NAM5-Compatible initialization
console.log("Initializing Firestore client...");

const db = new Firestore({
  projectId: process.env.FIREBASE_PROJECT_ID,
  credentials: {
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  databaseId: '(default)',
});

console.log("Firestore client initialized ✓");

// URLBird profile URL
const PROFILE_URL = "https://urlebird.com/user/repsscentral_/";

async function run() {
  console.log("Fetching profile HTML from URLBird…");

  let response;
  try {
    response = await fetch(PROFILE_URL);
  } catch (e) {
    console.error("❌ Failed to fetch URLBird:", e);
    return;
  }

  console.log("URLBird response status:", response.status);

  const html = await response.text();

  console.log("HTML length received:", html.length);

  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const links = [...doc.querySelectorAll("a")];
  console.log("Total <a> links found:", links.length);

  const videoIDs = links
    .map(a => {
      const match = a.href.match(/\/video\/(\d+)\//);
      return match ? match[1] : null;
    })
    .filter(Boolean);

  console.log("Extracted video IDs:", videoIDs);

  const uniqueIDs = [...new Set(videoIDs)];
  console.log(`Unique videos found: ${uniqueIDs.length}`);

  for (let id of uniqueIDs) {
    console.log(`Processing video ${id}…`);

    try {
      const videoPage = await fetch(`https://urlebird.com/video/${id}/`);
      const videoHTML = await videoPage.text();

      console.log(`Fetched video page for ${id}, length:`, videoHTML.length);

      const vmDom = new JSDOM(videoHTML);
      const vmDoc = vmDom.window.document;

      const ogImage = vmDoc.querySelector('meta[property="og:image"]');
      const thumbnail = ogImage ? ogImage.content : "";

      console.log("Thumbnail:", thumbnail);

      console.log("Attempting Firestore write…");

      await db.collection("tiktok_videos").doc(id).set(
        {
          thumbnail,
          videoUrl: `https://www.tiktok.com/@repsscentral_/video/${id}`,
          createdAt: Date.now(),
          assigned: false,
        },
        { merge: true }
      );

      console.log("🔥 Firestore write SUCCESS for:", id);

    } catch (err) {
      console.log("❌ Firestore write FAILED for", id, err);
    }
  }

  console.log("=== DONE SYNCING ===");
}

run();
