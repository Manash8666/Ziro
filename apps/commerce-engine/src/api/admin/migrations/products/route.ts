import type { EngineRequest, EngineResponse } from '../../../../services/engine-container.js';
import { resolveEngineContainer } from '../../../../services/engine-container.js';
import { authenticateInternalService } from '../../../middlewares.js';
import type { ZiroMigratedProduct } from '@ziro/migrator';

export async function POST(req: EngineRequest, res: EngineResponse): Promise<void> {
  const auth = authenticateInternalService(req);
  if (!auth.authorized) {
    res.status(401).json({ error: auth.error });
    return;
  }

  const tenantId = (req.headers['x-ziro-tenant-id'] as string) || 'default';
  const body = req.body;

  if (!body || !Array.isArray(body.products)) {
    res.status(400).json({ error: 'Missing required field: products array' });
    return;
  }

  const products = body.products as ZiroMigratedProduct[];
  const container = resolveEngineContainer(req);

  const report = await container.migrationUpsertService.upsertBatch(tenantId, products);
  res.status(200).json(report);
}
