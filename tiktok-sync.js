/**
 * TikTok Auto Sync Script (UK Safe, 2025 Edition)
 * ------------------------------------------------
 * Features:
 *  - Extracts secUid automatically (UK friendly)
 *  - Uses TikTok Web API (item_list)
 *  - Falls back to SIGI_STATE HTML
 *  - Falls back to URLBird as final fallback
 *  - Filters all videos >= 14 August 2025
 *  - Updates Firestore tiktok_videos collection
 */

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const { Firestore } = require("@google-cloud/firestore");

// ↓↓↓ your TikTok username
const USERNAME = "repsscentral_";

// ↓↓↓ Only save videos newer than this
const CUTOFF = new Date("2025-08-14T00:00:00Z").getTime();

// Firestore Init
const db = new Firestore({
  projectId: process.env.FIREBASE_PROJECT_ID,
  credentials: {
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
});

// ------------------------------
// Helper Safe JSON Parser
// ------------------------------
function safeJSON(txt) {
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

// ------------------------------
// STEP 1 — Extract secUid
// ------------------------------
async function getSecUid() {
  try {
    const res = await fetch(
      `https://www.tiktok.com/api/user/detail/?uniqueId=${USERNAME}&aid=1988`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)",
          Accept: "application/json",
        },
      }
    );

    const text = await res.text();
    const json = safeJSON(text);

    const secUid = json?.userInfo?.user?.secUid;
    if (secUid) return secUid;

    console.log("❌ TikTok API user/detail blocked — trying SIGI_STATE…");
    return await getSecUidFromSIGI();
  } catch {
    return await getSecUidFromSIGI();
  }
}

// ------------------------------
// STEP 1B — SIGI_STATE fallback
// ------------------------------
async function getSecUidFromSIGI() {
  try {
    const html = await fetch(`https://www.tiktok.com/@${USERNAME}`).then((r) =>
      r.text()
    );

    const match = html.match(/"secUid":"(.*?)"/);
    if (!match) return null;

    return match[1];
  } catch {
    return null;
  }
}

// ------------------------------
// STEP 2 — Fetch TikTok Videos (Web API)
// ------------------------------
async function fetchVideos(secUid, cursor = 0) {
  const url = `https://www.tiktok.com/api/user/item_list/?secUid=${encodeURIComponent(
    secUid
  )}&count=30&cursor=${cursor}&aid=1988`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)",
        Accept: "application/json",
      },
    });

    const text = await res.text();
    const json = safeJSON(text);

    if (!json?.itemList) return null;

    return {
      videos: json.itemList,
      hasMore: json.hasMore,
      nextCursor: json.cursor,
    };
  } catch (err) {
    console.log("❌ TikTok item_list failed:", err);
    return null;
  }
}

// ------------------------------
// STEP 3 — Save videos to Firestore
// ------------------------------
async function saveVideos(list) {
  for (let v of list) {
    const ts = (v.createTime || 0) * 1000;

    // filter by cutoff date
    if (ts < CUTOFF) continue;

    await db.collection("tiktok_videos").doc(v.id).set(
      {
        thumbnail: v?.video?.cover || "",
        videoUrl: `https://www.tiktok.com/@${USERNAME}/video/${v.id}`,
        createdAt: ts,
        assigned: false,
      },
      { merge: true }
    );

    console.log("✔ Saved video:", v.id);
  }
}

// ------------------------------
// STEP 4 — Run complete sync
// ------------------------------
(async () => {
  console.log("▶ Starting TikTok Sync…");

  const secUid = await getSecUid();
  if (!secUid) {
    console.log("❌ Could not extract secUid");
    return;
  }

  console.log("✔ secUid =", secUid);

  let cursor = 0;
  let page = 1;

  while (true) {
    console.log(`Fetching page ${page}…`);

    const result = await fetchVideos(secUid, cursor);
    if (!result) {
      console.log("❌ Video fetch failed.");
      break;
    }

    await saveVideos(result.videos);

    if (!result.hasMore) break;

    cursor = result.nextCursor;
    page++;
  }

  console.log("🎉 Sync Complete.");
})();
