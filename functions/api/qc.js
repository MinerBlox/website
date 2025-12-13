export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);

    const goodsId = url.searchParams.get("goodsId");
    const platform = (url.searchParams.get("platform") || "WD").toUpperCase();

    if (!goodsId) {
      return new Response(JSON.stringify({ error: "missing goodsId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Map platform → AcBuy prefix
    let prefix;
    switch (platform) {
      case "WD":
      case "WEIDIAN":
        prefix = "WD";
        break;

      case "TB":
      case "TAOBAO":
        prefix = "TB";
        break;

      default:
        return new Response(JSON.stringify({
          error: "unsupported platform",
          platform
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
    }

    const acGoodsId = prefix + goodsId;

    const api = `https://www.acbuy.com/prefix-api/store-product/product/api/item/Photos?goodsId=${acGoodsId}`;

    const r = await fetch(api, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json,text/plain,*/*",
        "Referer": "https://www.acbuy.com/"
      }
    });

    const text = await r.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return new Response(JSON.stringify({
        error: "Invalid JSON from AcBuy",
        raw: text
      }), {
        status: 502,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      platform: prefix,
      goodsId: acGoodsId,
      data
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
