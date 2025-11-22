const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const admin = require("firebase-admin");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

const db = admin.firestore();

// URLBird URL
const PROFILE_URL = "https://urlebird.com/user/repsscentral_/";

async function run() {
  console.log("Fetching URLBird…");
  const response = await fetch(PROFILE_URL);
  const html = await response.text();

  // Parse HTML
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Extract video IDs
  const links = [...doc.querySelectorAll("a")];
  const videoIDs = links
    .map(a => {
      const match = a.href.match(/\/video\/(\d+)\//);
      return match ? match[1] : null;
    })
    .filter(Boolean);

  const uniqueIDs = [...new Set(videoIDs)];

  console.log(`Found ${uniqueIDs.length} videos.`);

  for (let id of uniqueIDs) {
    try {
      const videoPage = await fetch("https://urlebird.com/video/" + id + "/");
      const videoHTML = await videoPage.text();

      const vmDom = new JSDOM(videoHTML);
      const vmDoc = vmDom.window.document;

      const ogImage = vmDoc.querySelector('meta[property="og:image"]');
      const thumbnail = ogImage ? ogImage.content : "";

      await db.collection("tiktok_videos").doc(id).set(
        {
          thumbnail,
          videoUrl: "https://www.tiktok.com/@repsscentral_/video/" + id,
          createdAt: Date.now(),
          assigned: false,
        },
        { merge: true }
      );

      console.log("Synced video:", id);
    } catch (err) {
      console.log("Error syncing", id, err);
    }
  }

  console.log("DONE ✓");
}

run();
