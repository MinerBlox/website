export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);
    const goodsId = url.searchParams.get("goodsId");

    if (!goodsId) {
      return new Response(JSON.stringify({ error: "missing goodsId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Correct AcBuy goodsId mapping
    const acGoodsId = "WD" + goodsId;

    // NEW correct QC endpoint you found
    const api = `https://www.acbuy.com/prefix-api/store-product/product/api/item/Photos?goodsId=${acGoodsId}`;

    const r = await fetch(api, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json,text/plain,*/*",
        "Referer": "https://www.acbuy.com/"
      }
    });

    const text = await r.text();   // read raw body first

    let data;
    try {
      data = JSON.parse(text);     // parse JSON safely
    } catch {
      return new Response(JSON.stringify({
        error: "Invalid JSON from AcBuy",
        raw: text
      }), {
        status: 502,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify(data), {
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
