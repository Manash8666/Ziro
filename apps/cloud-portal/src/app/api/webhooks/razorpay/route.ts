import crypto from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { Pool } from 'pg';
import { z } from 'zod';
import {
  ZIRO_PLATFORM_FEE_BPS,
  normalizePlanTier,
  resolvePlanTierFromProviderPlanId,
  type TenantBillingStatus,
} from '@/lib/billing-plans';
import {
  applyBillingLifecycleEvent,
  type DbPoolLike,
} from '@/lib/billing-lifecycle-service';
import { verifyRazorpayWebhookSignature } from '@/lib/webhook-signatures';

export const runtime = 'nodejs';

const RazorpayWebhookEnvelopeSchema = z.object({
  event: z.string().min(1),
  created_at: z.number().int().optional(),
  payload: z
    .object({
      subscription: z
        .object({
          entity: z
            .object({
              id: z.string(),
              plan_id: z.string().optional(),
              customer_id: z.string().nullable().optional(),
              status: z.string().optional(),
              current_end: z.number().int().nullable().optional(),
              notes: z.record(z.string(), z.string()).optional(),
            })
            .passthrough(),
        })
        .optional(),
      payment: z
        .object({
          entity: z
            .object({
              id: z.string(),
              subscription_id: z.string().nullable().optional(),
              notes: z.record(z.string(), z.string()).optional(),
            })
            .passthrough(),
        })
        .optional(),
    })
    .passthrough(),
});

function mapRazorpayEventToStatus(eventType: string): TenantBillingStatus | null {
  switch (eventType) {
    case 'subscription.authenticated':
    case 'subscription.activated':
    case 'subscription.charged':
    case 'subscription.resumed':
      return 'active';
    case 'subscription.pending':
    case 'subscription.halted':
    case 'payment.failed':
      return 'past_due';
    case 'subscription.paused':
      return 'suspended';
    case 'subscription.cancelled':
    case 'subscription.completed':
      return 'canceled';
    default:
      return null;
  }
}

let sharedPool: Pool | null = null;
function getDefaultDbPool(): DbPoolLike {
  if (!sharedPool) {
    sharedPool = new Pool({
      connectionString:
        process.env.DATABASE_URL ?? 'postgres://ziro:ziro_dev_secret@localhost:5432/ziro_core',
    });
  }
  return sharedPool;
}

export async function handleRazorpayWebhook(
  req: NextRequest | Request,
  dbOverride?: DbPoolLike
): Promise<NextResponse> {
  const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET ?? '').trim();
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'RAZORPAY_WEBHOOK_SECRET is not configured' },
      { status: 503 }
    );
  }

  const rawBody = await req.text();
  const signatureHeader = req.headers.get('x-razorpay-signature');

  if (
    !verifyRazorpayWebhookSignature({
      rawBody,
      signatureHeader,
      secret: webhookSecret,
    })
  ) {
    return NextResponse.json({ error: 'Invalid Razorpay webhook signature' }, { status: 401 });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Malformed JSON webhook body' }, { status: 400 });
  }

  const parsed = RazorpayWebhookEnvelopeSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid Razorpay webhook payload', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { event, payload } = parsed.data;
  const targetStatus = mapRazorpayEventToStatus(event);

  if (!targetStatus) {
    return NextResponse.json(
      {
        status: 'ignored_untracked_event',
        event,
        platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
      },
      { status: 200 }
    );
  }

  const subEntity = payload.subscription?.entity;
  const payEntity = payload.payment?.entity;

  const externalSubscriptionId = subEntity?.id ?? payEntity?.subscription_id ?? null;
  const externalCustomerId = subEntity?.customer_id ?? null;
  const notes = subEntity?.notes ?? payEntity?.notes ?? {};

  const tenantIdHint = notes.ziro_tenant_id ?? notes.tenant_id ?? null;
  const targetPlanTier =
    normalizePlanTier(notes.ziro_plan_tier) ??
    resolvePlanTierFromProviderPlanId('razorpay', subEntity?.plan_id);

  const currentPeriodEndIso =
    typeof subEntity?.current_end === 'number' && subEntity.current_end > 0
      ? new Date(subEntity.current_end * 1000).toISOString()
      : null;

  const eventId =
    req.headers.get('x-razorpay-event-id')?.trim() ||
    `rzp_evt_${crypto.createHash('sha256').update(rawBody).digest('hex').slice(0, 32)}`;

  const result = await applyBillingLifecycleEvent(dbOverride ?? getDefaultDbPool(), {
    provider: 'razorpay',
    eventId,
    eventType: event,
    rawBody,
    tenantIdHint,
    externalCustomerId,
    externalSubscriptionId,
    targetStatus,
    targetPlanTier,
    currentPeriodEndIso,
  });

  if (result.outcome === 'tenant_not_found') {
    return NextResponse.json(
      {
        error: 'No matching tenant found in ziro_tenant_registry',
        eventId,
        platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
      },
      { status: 404 }
    );
  }

  return NextResponse.json(result, { status: 200 });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handleRazorpayWebhook(req);
}
