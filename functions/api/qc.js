export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);
    const goodsId = url.searchParams.get("goodsId");

    if (!goodsId) {
      return new Response(JSON.stringify({ error: "Missing goodsId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ACBuy uses "WD" prefix for all Weidian items
    const acGoodsId = "WD" + goodsId;

    const apiUrl =
      `https://www.acbuy.com/prefix-api/store-product/product/api/productQc/list?goodsId=${acGoodsId}`;

    // VERY IMPORTANT: Add spoofed headers (ACBuy blocks default CF UA)
    const acbuyResponse = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://www.acbuy.com/",
      },
    });

    if (!acbuyResponse.ok) {
      return new Response(
        JSON.stringify({ error: "ACBuy API error", status: acbuyResponse.status }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await acbuyResponse.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
