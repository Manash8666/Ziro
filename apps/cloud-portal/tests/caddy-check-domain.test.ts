import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DbPoolLike, SqlClientLike } from '../src/lib/billing-lifecycle-service';
import type { TenantBillingStatus, ZiroPlanTier } from '../src/lib/billing-plans';
import { handleCaddyCheckDomain } from '../src/app/api/caddy/check-domain/route';

interface MockRegistryRow {
  tenant_id: string;
  slug: string;
  custom_domain: string | null;
  plan_tier: ZiroPlanTier;
  billing_status: TenantBillingStatus;
  grace_period_ends_at: string | null;
  is_demo_sandbox: boolean;
  platform_fee_bps: number;
}

function createMockRegistryDb(rows: MockRegistryRow[]): DbPoolLike {
  const client: SqlClientLike & { release(): void } = {
    release: vi.fn(),
    query: vi.fn(async <T = Record<string, unknown>>(_sql: string, params?: readonly unknown[]) => {
      const domain = String(params?.[0] ?? '');
      const slug = params?.[1] ? String(params[1]) : null;

      const match = rows.find(
        (r) =>
          (r.custom_domain && r.custom_domain.toLowerCase() === domain) ||
          (slug !== null && r.slug.toLowerCase() === slug)
      );

      return {
        rows: match ? ([match] as T[]) : ([] as T[]),
        rowCount: match ? 1 : 0,
      };
    }) as unknown as SqlClientLike['query'],
  };

  return {
    connect: async () => client,
  };
}

describe('GET /api/caddy/check-domain (Caddy On-Demand TLS Ask Endpoint)', () => {
  const SECRET = 'caddy_internal_secret_stage5_2026';

  const sampleTenants: MockRegistryRow[] = [
    {
      tenant_id: 'tenant_motofit2',
      slug: 'motofit2',
      custom_domain: 'shop.motofit2.in',
      plan_tier: 'growth',
      billing_status: 'active',
      grace_period_ends_at: null,
      is_demo_sandbox: false,
      platform_fee_bps: 0,
    },
    {
      tenant_id: 'tenant_trial_brand',
      slug: 'trialbrand',
      custom_domain: null,
      plan_tier: 'starter',
      billing_status: 'trialing',
      grace_period_ends_at: null,
      is_demo_sandbox: false,
      platform_fee_bps: 0,
    },
    {
      tenant_id: 'tenant_dunning_brand',
      slug: 'dunningbrand',
      custom_domain: 'store.dunningbrand.com',
      plan_tier: 'scale',
      billing_status: 'past_due',
      grace_period_ends_at: '2026-12-04T00:00:00.000Z',
      is_demo_sandbox: false,
      platform_fee_bps: 0,
    },
    {
      tenant_id: 'tenant_canceled_brand',
      slug: 'canceledbrand',
      custom_domain: 'shop.canceledbrand.com',
      plan_tier: 'growth',
      billing_status: 'canceled',
      grace_period_ends_at: null,
      is_demo_sandbox: false,
      platform_fee_bps: 0,
    },
    {
      tenant_id: 'tenant_suspended_brand',
      slug: 'suspendedbrand',
      custom_domain: 'shop.suspendedbrand.com',
      plan_tier: 'starter',
      billing_status: 'suspended',
      grace_period_ends_at: null,
      is_demo_sandbox: false,
      platform_fee_bps: 0,
    },
    {
      tenant_id: 'tenant_demo_motors',
      slug: 'demo-motors',
      custom_domain: 'demo.ziro.build',
      plan_tier: 'scale',
      billing_status: 'active',
      grace_period_ends_at: null,
      is_demo_sandbox: true,
      platform_fee_bps: 0,
    },
  ];

  beforeEach(() => {
    process.env.CADDY_INTERNAL_SECRET = SECRET;
    process.env.ZIRO_ROOT_DOMAIN = 'ziro.build';
  });

  it('rejects missing or invalid CADDY_INTERNAL_SECRET with HTTP 401', async () => {
    const db = createMockRegistryDb(sampleTenants);

    const missingSecretReq = new NextRequest(
      'http://cloud-portal:3002/api/caddy/check-domain?domain=shop.motofit2.in'
    );
    const res1 = await handleCaddyCheckDomain(missingSecretReq, { db });
    expect(res1.status).toBe(401);

    const wrongSecretReq = new NextRequest(
      'http://cloud-portal:3002/api/caddy/check-domain?secret=wrong_secret&domain=shop.motofit2.in'
    );
    const res2 = await handleCaddyCheckDomain(wrongSecretReq, { db });
    expect(res2.status).toBe(401);
  });

  it('rejects missing, IP-literal, or localhost domains with HTTP 400', async () => {
    const db = createMockRegistryDb(sampleTenants);

    const invalidDomains = [
      `http://cloud-portal:3002/api/caddy/check-domain?secret=${SECRET}`,
      `http://cloud-portal:3002/api/caddy/check-domain?secret=${SECRET}&domain=127.0.0.1`,
      `http://cloud-portal:3002/api/caddy/check-domain?secret=${SECRET}&domain=localhost`,
      `http://cloud-portal:3002/api/caddy/check-domain?secret=${SECRET}&domain=internal.local`,
    ];

    for (const url of invalidDomains) {
      const res = await handleCaddyCheckDomain(new NextRequest(url), { db });
      expect(res.status).toBe(400);
    }
  });

  it('approves active custom domains, trialing <slug>.ziro.build subdomains, and demo sandboxes with HTTP 200', async () => {
    const db = createMockRegistryDb(sampleTenants);

    // 1. Active custom domain via ?secret= query param
    const activeReq = new NextRequest(
      `http://cloud-portal:3002/api/caddy/check-domain?secret=${SECRET}&domain=SHOP.MOTOFIT2.IN.`
    );
    const activeRes = await handleCaddyCheckDomain(activeReq, { db });
    expect(activeRes.status).toBe(200);
    const activeBody = await activeRes.json();
    expect(activeBody).toMatchObject({
      allowed: true,
      reason: 'subscription_active',
      tenantId: 'tenant_motofit2',
      domain: 'shop.motofit2.in',
      billingStatus: 'active',
      platformFeeBps: 0,
    });

    // 2. Trialing tenant via <slug>.ziro.build subdomain and X-Ziro-Caddy-Secret header
    const trialReq = new NextRequest(
      'http://cloud-portal:3002/api/caddy/check-domain?domain=trialbrand.ziro.build',
      { headers: { 'X-Ziro-Caddy-Secret': SECRET } }
    );
    const trialRes = await handleCaddyCheckDomain(trialReq, { db });
    expect(trialRes.status).toBe(200);
    const trialBody = await trialRes.json();
    expect(trialBody.tenantId).toBe('tenant_trial_brand');
    expect(trialBody.billingStatus).toBe('trialing');
    expect(trialBody.platformFeeBps).toBe(0);

    // 3. Public demo sandbox domain
    const demoReq = new NextRequest(
      `http://cloud-portal:3002/api/caddy/check-domain?secret=${SECRET}&domain=demo.ziro.build`
    );
    const demoRes = await handleCaddyCheckDomain(demoReq, { db });
    expect(demoRes.status).toBe(200);
    expect((await demoRes.json()).reason).toBe('demo_sandbox_active');
  });

  it('approves past_due tenants inside the 7-day grace window (200) and denies once grace expires (403)', async () => {
    const db = createMockRegistryDb(sampleTenants);
    const graceExpiryMs = Date.parse('2026-12-04T00:00:00.000Z');

    // 1. Within grace window (2 days before expiry) -> HTTP 200
    const insideGraceReq = new NextRequest(
      `http://cloud-portal:3002/api/caddy/check-domain?secret=${SECRET}&domain=store.dunningbrand.com`
    );
    const insideRes = await handleCaddyCheckDomain(insideGraceReq, {
      db,
      nowMs: graceExpiryMs - 2 * 86_400_000,
    });
    expect(insideRes.status).toBe(200);
    const insideJson = await insideRes.json();
    expect(insideJson.allowed).toBe(true);
    expect(insideJson.reason).toBe('past_due_within_grace_period');
    expect(insideJson.platformFeeBps).toBe(0);

    // 2. After grace window expires (1 minute past expiry) -> HTTP 403
    const expiredGraceReq = new NextRequest(
      `http://cloud-portal:3002/api/caddy/check-domain?secret=${SECRET}&domain=store.dunningbrand.com`
    );
    const expiredRes = await handleCaddyCheckDomain(expiredGraceReq, {
      db,
      nowMs: graceExpiryMs + 60_000,
    });
    expect(expiredRes.status).toBe(403);
    const expiredJson = await expiredRes.json();
    expect(expiredJson.allowed).toBe(false);
    expect(expiredJson.reason).toBe('dunning_grace_period_expired');
    expect(expiredJson.platformFeeBps).toBe(0);
  });

  it('denies canceled and suspended tenants with HTTP 403 and returns 404 for unknown domains', async () => {
    const db = createMockRegistryDb(sampleTenants);

    const canceledReq = new NextRequest(
      `http://cloud-portal:3002/api/caddy/check-domain?secret=${SECRET}&domain=shop.canceledbrand.com`
    );
    const canceledRes = await handleCaddyCheckDomain(canceledReq, { db });
    expect(canceledRes.status).toBe(403);
    expect((await canceledRes.json()).reason).toBe('billing_canceled');

    const suspendedReq = new NextRequest(
      `http://cloud-portal:3002/api/caddy/check-domain?secret=${SECRET}&domain=shop.suspendedbrand.com`
    );
    const suspendedRes = await handleCaddyCheckDomain(suspendedReq, { db });
    expect(suspendedRes.status).toBe(403);
    expect((await suspendedRes.json()).reason).toBe('billing_suspended');

    const unknownReq = new NextRequest(
      `http://cloud-portal:3002/api/caddy/check-domain?secret=${SECRET}&domain=unregistered-store.com`
    );
    const unknownRes = await handleCaddyCheckDomain(unknownReq, { db });
    expect(unknownRes.status).toBe(404);
    expect((await unknownRes.json()).reason).toBe('domain_not_registered');
  });
});
