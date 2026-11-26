import { approveB2bQuoteWorkflow } from '@ziro/rails';
import {
  getHeader,
  resolveEngineContainer,
  type EngineRequest,
  type EngineResponse,
} from '../../../../../../services/engine-container.js';

export async function POST(req: EngineRequest, res: EngineResponse) {
  const container = resolveEngineContainer(req);
  try {
    const tenant = await container.tenantResolver.resolveFromRequest({
      host: getHeader(req.headers, 'host'),
      headerTenantId: getHeader(req.headers, 'x-ziro-tenant-id'),
      bodyTenantId: req.body?.tenant_id,
    });

    const quoteId = req.params?.id ?? '';
    const { result } = await approveB2bQuoteWorkflow.run({
      input: {
        tenant_id: tenant.tenant_id,
        quote_id: quoteId,
        b2bService: container.b2bService,
      },
      throwOnError: true,
    });

    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err?.message ?? 'Failed to approve B2B quote' });
  }
}
