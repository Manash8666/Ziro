import crypto from 'node:crypto';
import { verifyRazorpayWebhook, verifyStripeWebhook } from '@ziro/rails';
import {
  getHeader,
  resolveEngineContainer,
  type EngineRequest,
  type EngineResponse,
} from '../../../../services/engine-container.js';

export async function POST(req: EngineRequest, res: EngineResponse) {
  const container = resolveEngineContainer(req);
  const provider = req.params?.provider;
  const tenantId = req.params?.tenantId ?? '';

  if (provider !== 'razorpay' && provider !== 'stripe') {
    return res.status(400).json({ error: `Unsupported webhook provider: ${provider}` });
  }

  const secrets = await container.tenantResolver.resolveGatewaySecrets(tenantId, provider, 'multi');
  if (!secrets?.webhook_secret) {
    return res.status(401).json({ error: 'Tenant gateway webhook secret not configured' });
  }

  const rawBody = req.rawBody ?? JSON.stringify(req.body ?? {});
  const valid =
    provider === 'razorpay'
      ? verifyRazorpayWebhook(
          rawBody,
          getHeader(req.headers, 'x-razorpay-signature') ?? '',
          secrets.webhook_secret,
        )
      : verifyStripeWebhook(
          rawBody,
          getHeader(req.headers, 'stripe-signature') ?? '',
          secrets.webhook_secret,
        );

  if (!valid) {
    return res.status(401).json({ error: `Invalid ${provider} webhook signature` });
  }

  const eventId = String(req.body?.id ?? crypto.randomUUID());
  const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');

  const outcome = await container.webhookEventStore.processIdempotently(
    tenantId,
    provider,
    eventId,
    payloadHash,
    async () => ({ received: true, tenant_id: tenantId, provider }),
  );

  return res.status(200).json(outcome);
}
