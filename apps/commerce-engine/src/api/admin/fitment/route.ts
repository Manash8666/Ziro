import type { EngineRequest, EngineResponse } from '../../../services/engine-container.js';

export async function POST(req: EngineRequest, res: EngineResponse): Promise<void> {
  const container = req.scope?.resolve('engineContainer');
  const tenantId = (req.headers['x-ziro-tenant-id'] as string) || 'default';
  const items = req.body?.items;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Expected non-empty items array for fitment bulk import' });
    return;
  }

  const bomStore: any = container.bomStore;
  for (const item of items) {
    bomStore.fitments.push({
      tenant_id: tenantId,
      product_id: item.product_id,
      make: item.make,
      model: item.model,
      year_start: item.year_start,
      year_end: item.year_end,
      engine: item.engine,
      is_universal: Boolean(item.is_universal),
    });
  }

  res.status(200).json({ success: true, imported_count: items.length });
}

export async function GET(req: EngineRequest, res: EngineResponse): Promise<void> {
  const container = req.scope?.resolve('engineContainer');
  const tenantId = (req.headers['x-ziro-tenant-id'] as string) || 'default';
  const make = req.query?.make || '';
  const model = req.query?.model || '';
  const year = req.query?.year ? Number(req.query.year) : 2026;
  const engine = req.query?.engine;

  const results = await container.fitmentBomService.searchByVehicle(tenantId, {
    make,
    model,
    year,
    engine,
  });

  res.status(200).json({ results });
}
