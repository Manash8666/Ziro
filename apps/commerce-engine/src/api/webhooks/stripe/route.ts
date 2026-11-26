import crypto from 'node:crypto';
import { verifyStripeWebhook } from '@ziro/rails';
import {
  getHeader,
  resolveEngineContainer,
  type EngineRequest,
  type EngineResponse,
} from '../../../services/engine-container.js';

export async function POST(req: EngineRequest, res: EngineResponse) {
  const container = resolveEngineContainer(req);
  const rawBody = req.rawBody ?? JSON.stringify(req.body ?? {});
  const sig = getHeader(req.headers, 'stripe-signature') ?? '';

  const secrets = await container.tenantResolver.resolveGatewaySecrets('default', 'stripe', 'single');
  const webhookSecret = secrets?.webhook_secret ?? '';

  if (!verifyStripeWebhook(rawBody, sig, webhookSecret)) {
    return res.status(401).json({ error: 'Invalid Stripe webhook signature' });
  }

  const eventId = String(req.body?.id ?? crypto.randomUUID());
  const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');

  const outcome = await container.webhookEventStore.processIdempotently(
    'default',
    'stripe',
    eventId,
    payloadHash,
    async () => ({ received: true, type: req.body?.type ?? 'unknown' }),
  );

  return res.status(200).json(outcome);
}
