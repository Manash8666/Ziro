import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DbPoolLike, SqlClientLike } from '../src/lib/billing-lifecycle-service';
import type { TenantBillingStatus, ZiroPlanTier } from '../src/lib/billing-plans';
import { handleDunningSweep } from '../src/app/api/v1/cron/dunning-sweep/route';

interface MockTenantRow {
  tenant_id: string;
  slug: string;
  custom_domain: string | null;
  plan_tier: ZiroPlanTier;
  billing_status: TenantBillingStatus;
  billing_provider: string | null;
  external_subscription_id: string | null;
  grace_period_ends_at: string | null;
  is_demo_sandbox: boolean;
  platform_fee_bps: number;
}

function createInMemoryRegistryDb(initialRows: MockTenantRow[]): {
  db: DbPoolLike;
  rows: Map<string, MockTenantRow>;
} {
  const rows = new Map(initialRows.map((r) => [r.tenant_id, { ...r }]));

  const client: SqlClientLike & { release(): void } = {
    release: vi.fn(),
    query: vi.fn(async <T = Record<string, unknown>>(sql: string, params?: readonly unknown[]) => {
      const trimmed = sql.trim();

      if (trimmed === 'BEGIN' || trimmed === 'COMMIT' || trimmed === 'ROLLBACK') {
        return { rows: [] as T[], rowCount: 0 };
      }

      if (trimmed.includes('AS sandbox_cnt')) {
        const sandboxCount = Array.from(rows.values()).filter(
          (r) => r.billing_status === 'past_due' && r.is_demo_sandbox
        ).length;
        return { rows: [{ sandbox_cnt: sandboxCount }] as T[], rowCount: 1 };
      }

      if (trimmed.includes('FOR UPDATE SKIP LOCKED')) {
        const cutoffMs = Date.parse(String(params?.[0] ?? ''));
        const limit = Number(params?.[1] ?? 250);

        const matches = Array.from(rows.values())
          .filter(
            (r) =>
              r.billing_status === 'past_due' &&
              r.grace_period_ends_at !== null &&
              Date.parse(r.grace_period_ends_at) <= cutoffMs &&
              !r.is_demo_sandbox
          )
          .sort(
            (a, b) =>
              Date.parse(a.grace_period_ends_at!) - Date.parse(b.grace_period_ends_at!)
          )
          .slice(0, limit);

        return { rows: matches as unknown as T[], rowCount: matches.length };
      }

      if (trimmed.startsWith('UPDATE ziro_tenant_registry')) {
        const targetIds = (params?.[0] as string[]) ?? [];
        const updatedRows: MockTenantRow[] = [];

        for (const id of targetIds) {
          const row = rows.get(id);
          if (row && row.billing_status === 'past_due' && !row.is_demo_sandbox) {
            row.billing_status = 'suspended';
            row.platform_fee_bps = 0;
            updatedRows.push({ ...row });
          }
        }

        return { rows: updatedRows as unknown as T[], rowCount: updatedRows.length };
      }

      return { rows: [] as T[], rowCount: 0 };
    }) as unknown as SqlClientLike['query'],
  };

  return {
    db: { connect: async () => client },
    rows,
  };
}

describe('POST|GET /api/v1/cron/dunning-sweep', () => {
  const SERVICE_TOKEN = 'ziro_internal_cron_token_stage5_2026';
  const NOW = new Date('2026-12-05T12:00:00.000Z');

  beforeEach(() => {
    process.env.ZIRO_INTERNAL_SERVICE_TOKEN = SERVICE_TOKEN;
    delete process.env.CRON_SECRET;
  });

  it('rejects unauthenticated or forged Bearer tokens with HTTP 401', async () => {
    const { db } = createInMemoryRegistryDb([]);

    const noAuthReq = new NextRequest('http://localhost:3002/api/v1/cron/dunning-sweep', {
      method: 'POST',
    });
    expect((await handleDunningSweep(noAuthReq, { db, now: NOW })).status).toBe(401);

    const badAuthReq = new NextRequest('http://localhost:3002/api/v1/cron/dunning-sweep', {
      method: 'POST',
      headers: { Authorization: 'Bearer invalid_token_value' },
    });
    expect((await handleDunningSweep(badAuthReq, { db, now: NOW })).status).toBe(401);
  });

  it('suspends only non-sandbox past_due tenants with expired grace windows and preserves 0% GMV tax', async () => {
    const { db, rows } = createInMemoryRegistryDb([
      {
        tenant_id: 'tenant_expired_01',
        slug: 'expired01',
        custom_domain: 'shop.expired01.com',
        plan_tier: 'growth',
        billing_status: 'past_due',
        billing_provider: 'stripe',
        external_subscription_id: 'sub_stripe_exp_01',
        grace_period_ends_at: '2026-12-04T23:59:59.000Z', // Expired 12h ago
        is_demo_sandbox: false,
        platform_fee_bps: 0,
      },
      {
        tenant_id: 'tenant_still_in_grace_02',
        slug: 'ingrace02',
        custom_domain: 'shop.ingrace02.in',
        plan_tier: 'scale',
        billing_status: 'past_due',
        billing_provider: 'razorpay',
        external_subscription_id: 'sub_rzp_grace_02',
        grace_period_ends_at: '2026-12-07T12:00:00.000Z', // 2 days remaining
        is_demo_sandbox: false,
        platform_fee_bps: 0,
      },
      {
        tenant_id: 'tenant_active_03',
        slug: 'active03',
        custom_domain: 'shop.active03.in',
        plan_tier: 'starter',
        billing_status: 'active',
        billing_provider: 'razorpay',
        external_subscription_id: 'sub_rzp_act_03',
        grace_period_ends_at: null,
        is_demo_sandbox: false,
        platform_fee_bps: 0,
      },
      {
        tenant_id: 'tenant_demo_motors',
        slug: 'demo-motors',
        custom_domain: 'demo.ziro.build',
        plan_tier: 'scale',
        billing_status: 'past_due',
        billing_provider: null,
        external_subscription_id: null,
        grace_period_ends_at: '2026-11-01T00:00:00.000Z', // Even if past_due, sandbox must stay protected
        is_demo_sandbox: true,
        platform_fee_bps: 0,
      },
    ]);

    const req = new NextRequest('http://localhost:3002/api/v1/cron/dunning-sweep', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dryRun: false, limit: 100 }),
    });

    const res = await handleDunningSweep(req, { db, now: NOW });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({
      status: 'ok',
      mode: 'committed',
      evaluatedAt: NOW.toISOString(),
      sweptCount: 1,
      sandboxProtectedCount: 1,
      platformFeeBps: 0,
    });

    expect(body.transitionedTenants).toHaveLength(1);
    expect(body.transitionedTenants[0]).toMatchObject({
      tenantId: 'tenant_expired_01',
      previousStatus: 'past_due',
      newStatus: 'suspended',
      platformFeeBps: 0,
    });

    // Verify database state across all 4 tenants
    expect(rows.get('tenant_expired_01')?.billing_status).toBe('suspended');
    expect(rows.get('tenant_expired_01')?.platform_fee_bps).toBe(0);
    expect(rows.get('tenant_still_in_grace_02')?.billing_status).toBe('past_due');
    expect(rows.get('tenant_active_03')?.billing_status).toBe('active');
    expect(rows.get('tenant_demo_motors')?.billing_status).toBe('past_due');
  });

  it('supports dryRun=true previews without mutating ziro_tenant_registry', async () => {
    const { db, rows } = createInMemoryRegistryDb([
      {
        tenant_id: 'tenant_expired_preview',
        slug: 'preview01',
        custom_domain: 'shop.preview01.com',
        plan_tier: 'starter',
        billing_status: 'past_due',
        billing_provider: 'stripe',
        external_subscription_id: 'sub_stripe_prev_01',
        grace_period_ends_at: '2026-12-01T00:00:00.000Z',
        is_demo_sandbox: false,
        platform_fee_bps: 0,
      },
    ]);

    const req = new NextRequest(
      'http://localhost:3002/api/v1/cron/dunning-sweep?dryRun=true',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${SERVICE_TOKEN}` },
      }
    );

    const res = await handleDunningSweep(req, { db, now: NOW });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.mode).toBe('dry_run');
    expect(body.sweptCount).toBe(1);
    expect(body.transitionedTenants[0]?.newStatus).toBe('past_due');
    expect(body.platformFeeBps).toBe(0);

    // Row remains past_due until committed sweep runs
    expect(rows.get('tenant_expired_preview')?.billing_status).toBe('past_due');
  });
});
