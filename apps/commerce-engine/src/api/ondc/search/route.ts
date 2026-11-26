import {
  getHeader,
  resolveEngineContainer,
  type EngineRequest,
  type EngineResponse,
} from '../../../services/engine-container.js';

export async function POST(req: EngineRequest, res: EngineResponse) {
  const container = resolveEngineContainer(req);
  const rawBody = req.rawBody ?? JSON.stringify(req.body ?? {});
  const authHeader = getHeader(req.headers, 'authorization') ?? '';

  if (container.ondcAdapter && !container.ondcAdapter.verifyRequest(rawBody, authHeader)) {
    return res.status(401).json({ error: 'Invalid ONDC Beckn signature' });
  }

  const context = req.body?.context;
  if (!context) {
    return res.status(400).json({ error: 'Missing Beckn context' });
  }

  const items = container.posSyncService.getCatalogDelta('default', undefined, 0);
  if (container.ondcAdapter) {
    const onSearch = container.ondcAdapter.translateCatalogToOnSearch({
      context,
      providerName: 'Ziro Storefront',
      items: items.map((i) => ({
        id: i.product_id,
        title: i.title,
        price_minor: i.price_minor,
        currency: 'INR',
        stock_qty: i.on_hand,
      })),
    });
    return res.status(200).json(onSearch);
  }

  return res.status(200).json({
    context: { ...context, action: 'on_search' },
    message: { ack: { status: 'ACK' } },
  });
}
