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
import { verifyStripeWebhookSignature } from '@/lib/webhook-signatures';

export const runtime = 'nodejs';

const StripeEventEnvelopeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  data: z.object({
    object: z.record(z.string(), z.unknown()),
  }),
});

function mapStripeSubscriptionStatus(rawStatus: string): TenantBillingStatus {
  switch (rawStatus.toLowerCase()) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'unpaid':
    case 'paused':
      return 'suspended';
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled';
    default:
      return 'past_due';
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

export async function handleStripeWebhook(
  req: NextRequest | Request,
  dbOverride?: DbPoolLike,
  nowUnixSeconds?: number
): Promise<NextResponse> {
  const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET ?? '').trim();
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'STRIPE_WEBHOOK_SECRET is not configured' },
      { status: 503 }
    );
  }

  const rawBody = await req.text();
  const signatureHeader = req.headers.get('stripe-signature');

  if (
    !verifyStripeWebhookSignature({
      rawBody,
      signatureHeader,
      secret: webhookSecret,
      nowUnixSeconds,
    })
  ) {
    return NextResponse.json({ error: 'Invalid Stripe webhook signature' }, { status: 401 });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Malformed JSON webhook body' }, { status: 400 });
  }

  const parsed = StripeEventEnvelopeSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid Stripe webhook payload', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id: eventId, type: eventType, data } = parsed.data;
  const obj = data.object;
  const metadata =
    typeof obj.metadata === 'object' && obj.metadata !== null
      ? (obj.metadata as Record<string, string>)
      : {};

  let targetStatus: TenantBillingStatus | null = null;
  let externalSubscriptionId: string | null = null;
  const externalCustomerId = typeof obj.customer === 'string' ? obj.customer : null;
  let tenantIdHint: string | null = metadata.ziro_tenant_id ?? metadata.tenant_id ?? null;
  let targetPlanTier = normalizePlanTier(metadata.ziro_plan_tier);
  let currentPeriodEndIso: string | null = null;

  if (
    eventType === 'customer.subscription.created' ||
    eventType === 'customer.subscription.updated' ||
    eventType === 'customer.subscription.deleted'
  ) {
    externalSubscriptionId = typeof obj.id === 'string' ? obj.id : null;
    const rawSubStatus =
      eventType === 'customer.subscription.deleted'
        ? 'canceled'
        : typeof obj.status === 'string'
          ? obj.status
          : 'active';
    targetStatus = mapStripeSubscriptionStatus(rawSubStatus);

    if (typeof obj.current_period_end === 'number' && obj.current_period_end > 0) {
      currentPeriodEndIso = new Date(obj.current_period_end * 1000).toISOString();
    }

    const items = obj.items as { data?: Array<{ price?: { id?: string } }> } | undefined;
    const priceId = items?.data?.[0]?.price?.id;
    targetPlanTier = targetPlanTier ?? resolvePlanTierFromProviderPlanId('stripe', priceId);
  } else if (eventType === 'invoice.paid' || eventType === 'invoice.payment_failed') {
    externalSubscriptionId = typeof obj.subscription === 'string' ? obj.subscription : null;
    targetStatus = eventType === 'invoice.paid' ? 'active' : 'past_due';

    const subDetails = obj.subscription_details as
      | { metadata?: Record<string, string> }
      | undefined;
    if (!tenantIdHint && subDetails?.metadata?.ziro_tenant_id) {
      tenantIdHint = subDetails.metadata.ziro_tenant_id;
    }
    if (!targetPlanTier && subDetails?.metadata?.ziro_plan_tier) {
      targetPlanTier = normalizePlanTier(subDetails.metadata.ziro_plan_tier);
    }
  } else if (eventType === 'checkout.session.completed') {
    if (obj.mode === 'subscription') {
      externalSubscriptionId = typeof obj.subscription === 'string' ? obj.subscription : null;
      tenantIdHint =
        tenantIdHint ??
        (typeof obj.client_reference_id === 'string' ? obj.client_reference_id : null);
      targetStatus = 'active';
    }
  }

  if (!targetStatus) {
    return NextResponse.json(
      {
        status: 'ignored_untracked_event',
        eventType,
        platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
      },
      { status: 200 }
    );
  }

  const result = await applyBillingLifecycleEvent(dbOverride ?? getDefaultDbPool(), {
    provider: 'stripe',
    eventId,
    eventType,
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
  return handleStripeWebhook(req);
}
