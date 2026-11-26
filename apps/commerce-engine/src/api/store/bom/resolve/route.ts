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

    const result = await container.fitmentBomService.resolveBom(tenant.tenant_id, {
      items: req.body?.items ?? [],
    });

    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err?.message ?? 'BOM resolution failed' });
  }
}
