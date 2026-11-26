import {
  getHeader,
  resolveEngineContainer,
  type EngineRequest,
  type EngineResponse,
} from '../../../../services/engine-container.js';

export async function GET(req: EngineRequest, res: EngineResponse) {
  const container = resolveEngineContainer(req);
  try {
    const tenant = await container.tenantResolver.resolveFromRequest({
      host: getHeader(req.headers, 'host'),
      headerTenantId: getHeader(req.headers, 'x-ziro-tenant-id'),
    });

    const locationId = req.query?.location_id;
    const sinceVersion = Number(req.query?.since_version ?? '0');
    const items = container.posSyncService.getCatalogDelta(
      tenant.tenant_id,
      locationId,
      Number.isFinite(sinceVersion) ? sinceVersion : 0,
    );

    return res.status(200).json({
      tenant_id: tenant.tenant_id,
      since_version: sinceVersion,
      items,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err?.message ?? 'Failed to fetch POS catalog delta' });
  }
}
