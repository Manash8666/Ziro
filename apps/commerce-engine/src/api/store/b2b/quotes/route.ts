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

    const quote = await container.b2bService.createQuote({
      tenant_id: tenant.tenant_id,
      account_id: req.body?.account_id,
      currency_code: req.body?.currency_code ?? tenant.currency_code,
      items: req.body?.items ?? [],
    });

    return res.status(201).json(quote);
  } catch (err: any) {
    return res.status(400).json({ error: err?.message ?? 'Failed to create B2B quote' });
  }
}
