import { PosSyncBatchRequestSchema } from '@ziro/shared-types';
import {
  getHeader,
  resolveEngineContainer,
  type EngineRequest,
  type EngineResponse,
} from '../../../../services/engine-container.js';

export async function POST(req: EngineRequest, res: EngineResponse) {
  const container = resolveEngineContainer(req);
  try {
    const tenant = await container.tenantResolver.resolveFromRequest({
      host: getHeader(req.headers, 'host'),
      headerTenantId: getHeader(req.headers, 'x-ziro-tenant-id'),
      bodyTenantId: req.body?.tenant_id,
    });

    const parsed = PosSyncBatchRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid POS sync batch payload', issues: parsed.error.issues });
    }

    const result = await container.posSyncService.syncBatch(
      tenant.tenant_id,
      tenant.pos_conflict_policy,
      parsed.data,
    );
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err?.message ?? 'Failed to sync POS batch' });
  }
}
