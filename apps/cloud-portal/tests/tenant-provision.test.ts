import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DbPoolLike, SqlClientLike } from '../src/lib/billing-lifecycle-service';
import type { TenantBillingStatus, ZiroPlanTier } from '../src/lib/billing-plans';
import {
  TRIAL_WINDOW_DAYS,
  deriveTenantIdFromSlug,
  handleTenantProvision,
} from '../src/app/api/v1/tenants/provision/route';

interface StoredTenantRow {
  tenant_id: string;
  slug: string;
  display_name: string;
  custom_domain: string | null;
  plan_tier: ZiroPlanTier;
  billing_status: TenantBillingStatus;
  current_period_end: string;
  is_demo_sandbox: boolean;
  read_only_catalog: boolean;
  platform_fee_bps: number;
}

function createInMemoryProvisionDb(seed: StoredTenantRow[] = []): {
  db: DbPoolLike;
  tenants: Map<string, StoredTenantRow>;
} {
  const tenants = new Map(seed.map((row) => [row.tenant_id, { ...row }]));

  const client: SqlClientLike & { release(): void } = {
    release: vi.fn(),
    query: vi.fn(async <T = Record<string, unknown>>(sql: string, params?: readonly unknown[]) => {
      const trimmed = sql.trim();

      if (trimmed === 'BEGIN' || trimmed === 'COMMIT' || trimmed === 'ROLLBACK') {
        return { rows: [] as T[], rowCount: 0 };
      }

      if (trimmed.startsWith('SELECT tenant_id, slug, custom_domain')) {
        const tenantId = String(params?.[0] ?? '');
        const slug = String(params?.[1] ?? '');
        const domain = params?.[2] ? String(params[2]) : null;

        const match = Array.from(tenants.values()).find(
          (row) =>
            row.tenant_id === tenantId ||
            row.slug.toLowerCase() === slug ||
            (domain !== null && row.custom_domain?.toLowerCase() === domain)
        );

        return {
          rows: match ? ([match] as unknown as T[]) : ([] as T[]),
          rowCount: match ? 1 : 0,
        };
      }

      if (trimmed.startsWith('INSERT INTO ziro_tenant_registry')) {
        const created: StoredTenantRow = {
          tenant_id: String(params?.[0] ?? ''),
          slug: String(params?.[1] ?? ''),
          display_name: String(params?.[2] ?? ''),
          custom_domain: params?.[3] ? String(params[3]) : null,
          plan_tier: (params?.[4] as ZiroPlanTier) ?? 'starter',
          billing_status: 'trialing',
          current_period_end: String(params?.[5] ?? ''),
          is_demo_sandbox: false,
          read_only_catalog: false,
          platform_fee_bps: 0,
        };
        tenants.set(created.tenant_id, created);
        return { rows: [created] as unknown as T[], rowCount: 1 };
      }

      return { rows: [] as T[], rowCount: 0 };
    }) as unknown as SqlClientLike['query'],
  };

  return {
    db: { connect: async () => client },
    tenants,
  };
}

describe('POST /api/v1/tenants/provision', () => {
  const NOW = new Date('2026-11-27T10:00:00.000Z');

  beforeEach(() => {
    process.env.ZIRO_ROOT_DOMAIN = 'ziro.build';
  });

  it('provisions a new merchant with a 14-day trialing window, custom slug/domain, and locked 0% GMV tax', async () => {
    const { db, tenants } = createInMemoryProvisionDb();

    const req = new NextRequest('http://localhost:3002/api/v1/tenants/provision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: 'MotoFit 2 Performance Parts',
        slug: 'motofit-2',
        planTier: 'growth',
        ownerEmail: 'manash@motofit2.in',
        customDomain: 'SHOP.MOTOFIT2.IN.',
      }),
    });

    const res = await handleTenantProvision(req, { db, now: NOW });
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.status).toBe('provisioned');
    expect(body.platformFeeBps).toBe(0);

    const expectedTrialEnd = new Date(
      NOW.getTime() + TRIAL_WINDOW_DAYS * 86_400_000
    ).toISOString();

    expect(body.tenant).toMatchObject({
      tenantId: 'tenant_motofit_2',
      slug: 'motofit-2',
      displayName: 'MotoFit 2 Performance Parts',
      ownerEmail: 'manash@motofit2.in',
      customDomain: 'shop.motofit2.in',
      planTier: 'growth',
      billingStatus: 'trialing',
      trialDays: 14,
      trialEndsAt: expectedTrialEnd,
      isDemoSandbox: false,
      readOnlyCatalog: false,
      platformFeeBps: 0,
    });

    expect(body.endpoints).toEqual({
      storefrontUrl: 'https://shop.motofit2.in',
      defaultSubdomainUrl: 'https://motofit-2.ziro.build',
      posUrl: 'https://pos.ziro.build',
      cloudBillingUrl: 'https://cloud.ziro.build/billing?tenantId=tenant_motofit_2',
      ucpManifestUrl: 'https://shop.motofit2.in/.well-known/ucp',
    });

    expect(body.entitlements.maxCustomDomains).toBe(3);
    expect(body.entitlements.platformFeeBps).toBe(0);

    // Verify persisted registry row
    const stored = tenants.get('tenant_motofit_2')!;
    expect(stored.billing_status).toBe('trialing');
    expect(stored.platform_fee_bps).toBe(0);
    expect(stored.is_demo_sandbox).toBe(false);
  });

  it('blocks reserved platform slugs and demo-* sandbox namespace spoofing with HTTP 400', async () => {
    const { db } = createInMemoryProvisionDb();

    for (const badSlug of ['cloud', 'pos', 'admin', 'demo', 'demo-motors', 'demo-custom-shop']) {
      const req = new NextRequest('http://localhost:3002/api/v1/tenants/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: 'Test Store',
          slug: badSlug,
          ownerEmail: 'founder@example.com',
        }),
      });

      const res = await handleTenantProvision(req, { db, now: NOW });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.field).toBe('slug');
      expect(json.platformFeeBps).toBe(0);
    }
  });

  it('rejects first-party ziro.build domains, localhost, and IP literals in customDomain with HTTP 400', async () => {
    const { db } = createInMemoryProvisionDb();

    for (const invalidDomain of ['mybrand.ziro.build', 'ziro.build', '127.0.0.1', 'localhost']) {
      const req = new NextRequest('http://localhost:3002/api/v1/tenants/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: 'Valid Brand',
          slug: 'valid-brand',
          ownerEmail: 'founder@validbrand.com',
          customDomain: invalidDomain,
        }),
      });

      const res = await handleTenantProvision(req, { db, now: NOW });
      expect(res.status).toBe(400);
      expect((await res.json()).field).toBe('customDomain');
    }
  });

  it('returns HTTP 409 Conflict when slug or customDomain is already claimed', async () => {
    const { db } = createInMemoryProvisionDb([
      {
        tenant_id: 'tenant_existing_brand',
        slug: 'existing-brand',
        display_name: 'Existing Brand',
        custom_domain: 'store.existingbrand.com',
        plan_tier: 'starter',
        billing_status: 'active',
        current_period_end: '2026-12-27T00:00:00.000Z',
        is_demo_sandbox: false,
        read_only_catalog: false,
        platform_fee_bps: 0,
      },
    ]);

    // 1. Duplicate slug -> 409
    const dupSlugReq = new NextRequest('http://localhost:3002/api/v1/tenants/provision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Another Store',
        slug: 'existing-brand',
        ownerEmail: 'owner@another.com',
      }),
    });
    const dupSlugRes = await handleTenantProvision(dupSlugReq, { db, now: NOW });
    expect(dupSlugRes.status).toBe(409);
    expect((await dupSlugRes.json()).conflictField).toBe('slug');

    // 2. Duplicate customDomain -> 409
    const dupDomainReq = new NextRequest('http://localhost:3002/api/v1/tenants/provision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Fresh Slug Store',
        slug: 'fresh-slug-store',
        ownerEmail: 'owner@fresh.com',
        customDomain: 'store.existingbrand.com',
      }),
    });
    const dupDomainRes = await handleTenantProvision(dupDomainReq, { db, now: NOW });
    expect(dupDomainRes.status).toBe(409);
    expect((await dupDomainRes.json()).conflictField).toBe('customDomain');
  });

  it('rejects non-zero platformFeeBps with HTTP 422', async () => {
    const { db } = createInMemoryProvisionDb();

    const req = new NextRequest('http://localhost:3002/api/v1/tenants/provision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Clean Brand',
        slug: 'clean-brand',
        ownerEmail: 'founder@cleanbrand.com',
        platformFeeBps: 50,
      }),
    });

    const res = await handleTenantProvision(req, { db, now: NOW });
    expect(res.status).toBe(422);
    expect(deriveTenantIdFromSlug('clean-brand')).toBe('tenant_clean_brand');
  });
});
