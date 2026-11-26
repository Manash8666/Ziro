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

    const year = Number(req.query?.year ?? '0');
    const make = req.query?.make ?? '';
    const model = req.query?.model ?? '';
    const engine = req.query?.engine;

    const matches = await container.fitmentBomService.searchByVehicle(tenant.tenant_id, {
      year,
      make,
      model,
      engine,
    });

    return res.status(200).json({
      tenant_id: tenant.tenant_id,
      items: matches,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err?.message ?? 'Fitment search failed' });
  }
}
