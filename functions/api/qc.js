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

    const acGoodsId = "WD" + goodsId;
    const api = `https://www.acbuy.com/prefix-api/store-product/product/api/productQc/list?goodsId=${acGoodsId}`;

    const r = await fetch(api, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json,text/plain,*/*",
        "Referer": "https://www.acbuy.com/"
      }
    });

    // ⚠ DEBUG: read response as text, not JSON
    const raw = await r.text();

    return new Response(JSON.stringify({ raw }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
