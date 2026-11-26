import crypto from 'node:crypto';
import { verifyRazorpayWebhook } from '@ziro/rails';
import {
  getHeader,
  resolveEngineContainer,
  type EngineRequest,
  type EngineResponse,
} from '../../../services/engine-container.js';

export async function POST(req: EngineRequest, res: EngineResponse) {
  const container = resolveEngineContainer(req);
  const rawBody = req.rawBody ?? JSON.stringify(req.body ?? {});
  const sig = getHeader(req.headers, 'x-razorpay-signature') ?? '';

  const secrets = await container.tenantResolver.resolveGatewaySecrets('default', 'razorpay', 'single');
  const webhookSecret = secrets?.webhook_secret ?? '';

  if (!verifyRazorpayWebhook(rawBody, sig, webhookSecret)) {
    return res.status(401).json({ error: 'Invalid Razorpay webhook signature' });
  }

  const eventId = String(req.body?.id ?? crypto.randomUUID());
  const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');

  const outcome = await container.webhookEventStore.processIdempotently(
    'default',
    'razorpay',
    eventId,
    payloadHash,
    async () => ({ received: true, event: req.body?.event ?? 'unknown' }),
  );

  return res.status(200).json(outcome);
}
