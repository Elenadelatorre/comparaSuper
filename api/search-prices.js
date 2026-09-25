export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const query = req.query.q;
  if (!query) {
    return res
      .status(400)
      .json({ error: 'Falta el término de búsqueda (?q=...)' });
  }

  const results = [];
  const term = query.toLowerCase().trim();

  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: 'application/json, text/plain, */*'
  };

  // 1. Mercadona online
  try {
    const mUrl = `https://tienda.mercadona.es/api/products-search/?term=${encodeURIComponent(term)}&postal_code=29001`;
    const mRes = await fetch(mUrl, { headers });
    if (mRes.ok) {
      const mData = await mRes.json();
      const hits = (mData.results || []).slice(0, 2);
      for (const prod of hits) {
        const instr = prod.price_instructions || {};
        const pkgPrice = parseFloat(instr.unit_price || 0);
        const refPrice = parseFloat(instr.reference_price || pkgPrice);
        const unitFormat = instr.reference_format || 'ud';

        if (pkgPrice > 0) {
          results.push({
            product: prod.display_name,
            supermarket: 'Mercadona',
            brand: prod.brand || 'Hacendado',
            package_price: pkgPrice,
            quantity: 1,
            unit_price: refPrice,
            unit: unitFormat === 'kg' ? 'kg' : unitFormat === 'l' ? 'L' : 'ud',
            source: 'online'
          });
        }
      }
    }
  } catch (err) {
    console.error('Error Mercadona:', err);
  }

  // 2. Open Prices (Carrefour / Lidl)
  try {
    const opUrl = `https://prices.openfoodfacts.org/api/v1/prices?product_name__like=%25${encodeURIComponent(term)}%25&location_osm_address__country_code=es&size=15&order_by=-date`;
    const opRes = await fetch(opUrl, { headers });
    if (opRes.ok) {
      const opData = await opRes.json();
      const addedStores = new Set();

      for (const item of opData.items || []) {
        const storeName = (
          (item.location && item.location.osm_name) ||
          (item.receipt && item.receipt.store) ||
          ''
        ).toLowerCase();
        let targetSuper = null;
        if (storeName.includes('carrefour')) targetSuper = 'Carrefour';
        else if (storeName.includes('lidl')) targetSuper = 'Lidl';

        if (targetSuper && !addedStores.has(targetSuper)) {
          const price = parseFloat(item.price || 0);
          if (price > 0) {
            addedStores.add(targetSuper);
            results.push({
              product: item.product_name || query,
              supermarket: targetSuper,
              brand: item.product_brand || targetSuper,
              package_price: price,
              quantity: 1,
              unit_price: price,
              unit: 'ud',
              source: 'online'
            });
          }
        }
        if (addedStores.has('Carrefour') && addedStores.has('Lidl')) break;
      }
    }
  } catch (err) {
    console.error('Error Open Prices:', err);
  }

  return res.status(200).json({ results });
}
