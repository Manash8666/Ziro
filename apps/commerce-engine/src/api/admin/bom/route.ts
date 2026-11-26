import type { EngineRequest, EngineResponse } from '../../../services/engine-container.js';

export async function POST(req: EngineRequest, res: EngineResponse): Promise<void> {
  const container = req.scope?.resolve('engineContainer');
  const tenantId = (req.headers['x-ziro-tenant-id'] as string) || 'default';
  const body = req.body;

  if (!body?.parent_sku || !body?.stock_mode || body?.base_price_minor === undefined || !Array.isArray(body?.components)) {
    res.status(400).json({ error: 'Missing required BOM fields: parent_sku, stock_mode, base_price_minor, components' });
    return;
  }

  const bomStore: any = container.bomStore;
  bomStore.boms.set(`${tenantId}:${body.parent_sku}`, {
    tenant_id: tenantId,
    parent_sku: body.parent_sku,
    stock_mode: body.stock_mode,
    base_price_minor: body.base_price_minor,
    components: body.components,
  });

  res.status(201).json({ success: true, parent_sku: body.parent_sku });
}

export async function GET(req: EngineRequest, res: EngineResponse): Promise<void> {
  const container = req.scope?.resolve('engineContainer');
  const tenantId = (req.headers['x-ziro-tenant-id'] as string) || 'default';
  const parentSku = req.params?.parent_sku || req.query?.parent_sku;

  if (!parentSku) {
    res.status(400).json({ error: 'Missing parent_sku' });
    return;
  }

  const bom = container.bomStore.getBom(tenantId, parentSku);
  if (!bom) {
    res.status(404).json({ error: `BOM for SKU '${parentSku}' not found` });
    return;
  }

  res.status(200).json({ bom });
}
