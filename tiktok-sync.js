const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { Firestore } = require('@google-cloud/firestore');

// Firestore NAM5-Compatible initialization
const db = new Firestore({
  projectId: process.env.FIREBASE_PROJECT_ID,
  credentials: {
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  databaseId: '(default)',
});

// URLBird profile URL
const PROFILE_URL = "https://urlebird.com/user/repsscentral_/";

async function run() {
  console.log("Fetching profile...");
  const response = await fetch(PROFILE_URL);
  const html = await response.text();

  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const links = [...doc.querySelectorAll("a")];
  const videoIDs = links
    .map(a => {
      const match = a.href.match(/\/video\/(\d+)\//);
      return match ? match[1] : null;
    })
    .filter(Boolean);

  const uniqueIDs = [...new Set(videoIDs)];
  console.log(`Found ${uniqueIDs.length} videos`);

  for (let id of uniqueIDs) {
    try {
      const videoPage = await fetch(`https://urlebird.com/video/${id}/`);
      const videoHTML = await videoPage.text();

      const vmDom = new JSDOM(videoHTML);
      const vmDoc = vmDom.window.document;

      const ogImage = vmDoc.querySelector('meta[property="og:image"]');
      const thumbnail = ogImage ? ogImage.content : "";

      await db.collection("tiktok_videos").doc(id).set(
        {
          thumbnail,
          videoUrl: `https://www.tiktok.com/@repsscentral_/video/${id}`,
          createdAt: Date.now(),
          assigned: false,
        },
        { merge: true }
      );

      console.log("Synced:", id);
    } catch (err) {
      console.log("Failed:", id, err);
    }
  }

  console.log("DONE ✓");
}

run();
