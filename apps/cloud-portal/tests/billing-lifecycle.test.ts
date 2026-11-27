import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DbPoolLike, SqlClientLike } from '../src/lib/billing-lifecycle-service';
import { isTenantActiveForEdgeRouting } from '../src/lib/billing-plans';
import { handleSubscribePost } from '../src/app/api/v1/billing/subscribe/route';
import { handleRazorpayWebhook } from '../src/app/api/webhooks/razorpay/route';
import { handleStripeWebhook } from '../src/app/api/webhooks/stripe/route';

interface MockTenantRecord {
  tenant_id: string;
  plan_tier: 'starter' | 'growth' | 'scale' | 'enterprise';
  billing_status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'suspended';
  billing_provider: 'razorpay' | 'stripe' | null;
  external_customer_id: string | null;
  external_subscription_id: string | null;
  is_demo_sandbox: boolean;
  grace_period_ends_at: string | null;
  platform_fee_bps: 0;
}

function createInMemoryBillingDb(initialTenants: MockTenantRecord[]): {
  db: DbPoolLike;
  tenants: Map<string, MockTenantRecord>;
  processedEvents: Set<string>;
} {
  const tenants = new Map(initialTenants.map((t) => [t.tenant_id, { ...t }]));
  const processedEvents = new Set<string>();

  const client: SqlClientLike & { release(): void } = {
    release: vi.fn(),
    query: vi.fn(async <T = Record<string, unknown>>(sql: string, params?: readonly unknown[]) => {
      const trimmed = sql.trim();

      if (trimmed === 'BEGIN' || trimmed === 'COMMIT' || trimmed === 'ROLLBACK') {
        return { rows: [] as T[], rowCount: 0 };
      }

      if (trimmed.includes('FROM ziro_billing_webhook_events')) {
        const key = `${params?.[0]}:${params?.[1]}`;
        if (processedEvents.has(key)) {
          return {
            rows: [
              {
                tenant_id: 'tenant_motofit2',
                resulting_status: 'active',
                plan_tier: 'growth',
              },
            ] as T[],
            rowCount: 1,
          };
        }
        return { rows: [] as T[], rowCount: 0 };
      }

      if (trimmed.includes('FROM ziro_tenant_registry') && trimmed.includes('WHERE tenant_id = $1')) {
        const found = tenants.get(String(params?.[0] ?? ''));
        return { rows: found ? ([found] as T[]) : ([] as T[]), rowCount: found ? 1 : 0 };
      }

      if (
        trimmed.includes('FROM ziro_tenant_registry') &&
        trimmed.includes('WHERE billing_provider = $1')
      ) {
        const provider = String(params?.[0] ?? '');
        const subId = String(params?.[1] ?? '');
        const found = Array.from(tenants.values()).find(
          (t) => t.billing_provider === provider && t.external_subscription_id === subId
        );
        return { rows: found ? ([found] as T[]) : ([] as T[]), rowCount: found ? 1 : 0 };
      }

      if (trimmed.startsWith('UPDATE ziro_tenant_registry')) {
        const tenantId = String(params?.[0] ?? '');
        const existing = tenants.get(tenantId);
        if (existing) {
          existing.plan_tier = params?.[1] as MockTenantRecord['plan_tier'];
          existing.billing_status = params?.[2] as MockTenantRecord['billing_status'];
          existing.billing_provider = params?.[3] as MockTenantRecord['billing_provider'];
          if (params?.[4]) existing.external_customer_id = String(params[4]);
          if (params?.[5]) existing.external_subscription_id = String(params[5]);
          existing.grace_period_ends_at = (params?.[7] as string | null) ?? null;
          existing.platform_fee_bps = 0;
        }
        return { rows: [] as T[], rowCount: existing ? 1 : 0 };
      }

      if (trimmed.startsWith('INSERT INTO ziro_billing_webhook_events')) {
        processedEvents.add(`${params?.[0]}:${params?.[1]}`);
        return { rows: [] as T[], rowCount: 1 };
      }

      return { rows: [] as T[], rowCount: 0 };
    }) as unknown as SqlClientLike['query'],
  };

  return {
    db: { connect: async () => client },
    tenants,
    processedEvents,
  };
}

describe('Automated SaaS Subscription Billing & Tenant Lifecycle', () => {
  beforeEach(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = 'rzp_webhook_secret_2026';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_stripe_secret_2026';
    process.env.RAZORPAY_KEY_ID = 'rzp_test_key_id';
    process.env.RAZORPAY_KEY_SECRET = 'rzp_test_key_secret';
    process.env.RAZORPAY_PLAN_GROWTH = 'plan_rzp_growth_inr';
    process.env.STRIPE_API_KEY = 'sk_test_stripe_key';
    process.env.STRIPE_PRICE_SCALE = 'price_stripe_scale_usd';
  });

  it('activates Razorpay subscription on subscription.charged, upgrades plan tier, and enforces idempotency', async () => {
    const { db, tenants } = createInMemoryBillingDb([
      {
        tenant_id: 'tenant_motofit2',
        plan_tier: 'starter',
        billing_status: 'trialing',
        billing_provider: null,
        external_customer_id: null,
        external_subscription_id: null,
        is_demo_sandbox: false,
        grace_period_ends_at: null,
        platform_fee_bps: 0,
      },
    ]);

    const rawBody = JSON.stringify({
      event: 'subscription.charged',
      payload: {
        subscription: {
          entity: {
            id: 'sub_rzp_motofit_01',
            plan_id: 'plan_rzp_growth_inr',
            customer_id: 'cust_rzp_01',
            status: 'active',
            current_end: 1798355200,
            notes: {
              ziro_tenant_id: 'tenant_motofit2',
              ziro_plan_tier: 'growth',
              ziro_platform_fee_bps: '0',
            },
          },
        },
      },
    });

    const sig = crypto
      .createHmac('sha256', 'rzp_webhook_secret_2026')
      .update(rawBody)
      .digest('hex');

    const req1 = new NextRequest('http://localhost:3002/api/webhooks/razorpay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Razorpay-Signature': sig,
        'X-Razorpay-Event-Id': 'evt_rzp_unique_001',
      },
      body: rawBody,
    });

    const res1 = await handleRazorpayWebhook(req1, db);
    expect(res1.status).toBe(200);
    const json1 = await res1.json();
    expect(json1.outcome).toBe('applied');
    expect(json1.billingStatus).toBe('active');
    expect(json1.planTier).toBe('growth');
    expect(json1.platformFeeBps).toBe(0);

    const updatedTenant = tenants.get('tenant_motofit2')!;
    expect(updatedTenant.billing_status).toBe('active');
    expect(updatedTenant.plan_tier).toBe('growth');
    expect(updatedTenant.external_subscription_id).toBe('sub_rzp_motofit_01');
    expect(updatedTenant.platform_fee_bps).toBe(0);

    // Replay exact same event ID -> ignored idempotently
    const req2 = new NextRequest('http://localhost:3002/api/webhooks/razorpay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Razorpay-Signature': sig,
        'X-Razorpay-Event-Id': 'evt_rzp_unique_001',
      },
      body: rawBody,
    });
    const res2 = await handleRazorpayWebhook(req2, db);
    const json2 = await res2.json();
    expect(json2.outcome).toBe('duplicate_ignored');
  });

  it('transitions Stripe tenant to past_due with 7-day dunning grace period on invoice.payment_failed and then canceled on deletion', async () => {
    const { db, tenants } = createInMemoryBillingDb([
      {
        tenant_id: 'tenant_global_gear',
        plan_tier: 'scale',
        billing_status: 'active',
        billing_provider: 'stripe',
        external_customer_id: 'cus_stripe_99',
        external_subscription_id: 'sub_stripe_scale_99',
        is_demo_sandbox: false,
        grace_period_ends_at: null,
        platform_fee_bps: 0,
      },
    ]);

    const nowSec = 1795763580;

    // 1. Invoice payment failed -> past_due with 7-day grace window
    const failBody = JSON.stringify({
      id: 'evt_stripe_fail_01',
      type: 'invoice.payment_failed',
      data: {
        object: {
          subscription: 'sub_stripe_scale_99',
          customer: 'cus_stripe_99',
        },
      },
    });
    const failSig = crypto
      .createHmac('sha256', 'whsec_stripe_secret_2026')
      .update(`${nowSec}.${failBody}`)
      .digest('hex');

    const failReq = new NextRequest('http://localhost:3002/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': `t=${nowSec},v1=${failSig}`,
      },
      body: failBody,
    });

    const failRes = await handleStripeWebhook(failReq, db, nowSec);
    expect(failRes.status).toBe(200);
    const failJson = await failRes.json();
    expect(failJson.billingStatus).toBe('past_due');
    expect(failJson.gracePeriodEndsAt).toBeTruthy();

    // Edge routing remains active during 7-day dunning grace window
    expect(
      isTenantActiveForEdgeRouting({
        billingStatus: 'past_due',
        gracePeriodEndsAt: failJson.gracePeriodEndsAt,
        nowMs: nowSec * 1000 + 86_400_000, // +1 day
      })
    ).toBe(true);

    // 2. Subscription deleted -> canceled (edge routing disabled)
    const cancelBody = JSON.stringify({
      id: 'evt_stripe_del_02',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_stripe_scale_99',
          customer: 'cus_stripe_99',
          status: 'canceled',
        },
      },
    });
    const cancelSig = crypto
      .createHmac('sha256', 'whsec_stripe_secret_2026')
      .update(`${nowSec}.${cancelBody}`)
      .digest('hex');

    const cancelReq = new NextRequest('http://localhost:3002/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': `t=${nowSec},v1=${cancelSig}`,
      },
      body: cancelBody,
    });

    const cancelRes = await handleStripeWebhook(cancelReq, db, nowSec);
    expect(cancelRes.status).toBe(200);
    expect(tenants.get('tenant_global_gear')?.billing_status).toBe('canceled');
    expect(
      isTenantActiveForEdgeRouting({
        billingStatus: 'canceled',
        gracePeriodEndsAt: null,
      })
    ).toBe(false);
  });

  it('rejects forged webhook signatures with HTTP 401 and protects demo sandboxes from billing mutations', async () => {
    const { db } = createInMemoryBillingDb([
      {
        tenant_id: 'tenant_demo_motors',
        plan_tier: 'scale',
        billing_status: 'active',
        billing_provider: null,
        external_customer_id: null,
        external_subscription_id: null,
        is_demo_sandbox: true,
        grace_period_ends_at: null,
        platform_fee_bps: 0,
      },
    ]);

    // Forged signature -> 401
    const badReq = new NextRequest('http://localhost:3002/api/webhooks/razorpay', {
      method: 'POST',
      headers: { 'X-Razorpay-Signature': 'deadbeef' },
      body: '{"event":"subscription.cancelled"}',
    });
    const badRes = await handleRazorpayWebhook(badReq, db);
    expect(badRes.status).toBe(401);

    // Valid signature targeting demo sandbox -> sandbox_protected
    const sandboxBody = JSON.stringify({
      event: 'subscription.cancelled',
      payload: {
        subscription: {
          entity: {
            id: 'sub_fake_sandbox',
            notes: { ziro_tenant_id: 'tenant_demo_motors' },
          },
        },
      },
    });
    const validSig = crypto
      .createHmac('sha256', 'rzp_webhook_secret_2026')
      .update(sandboxBody)
      .digest('hex');

    const sandboxReq = new NextRequest('http://localhost:3002/api/webhooks/razorpay', {
      method: 'POST',
      headers: { 'X-Razorpay-Signature': validSig },
      body: sandboxBody,
    });
    const sandboxRes = await handleRazorpayWebhook(sandboxReq, db);
    const sandboxJson = await sandboxRes.json();
    expect(sandboxJson.outcome).toBe('sandbox_protected');
  });

  it('creates Razorpay & Stripe checkout subscriptions with platformFeeBps = 0 locked', async () => {
    const mockFetch = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('api.razorpay.com')) {
        return new Response(
          JSON.stringify({ id: 'sub_rzp_new_01', short_url: 'https://rzp.io/i/sub_01' }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({ id: 'cs_test_stripe_01', url: 'https://checkout.stripe.com/c/pay/cs_01' }),
        { status: 200 }
      );
    });

    const rzpReq = new NextRequest('http://localhost:3002/api/v1/billing/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: 'tenant_motofit2',
        planTier: 'growth',
        provider: 'razorpay',
        customerEmail: 'ops@motofit2.in',
      }),
    });

    const rzpRes = await handleSubscribePost(rzpReq, mockFetch as unknown as typeof fetch);
    expect(rzpRes.status).toBe(201);
    const rzpJson = await rzpRes.json();
    expect(rzpJson.platformFeeBps).toBe(0);
    expect(rzpJson.amountInrPaise).toBe(1199900);
  });
});
