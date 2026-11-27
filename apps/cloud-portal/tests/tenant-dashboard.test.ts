import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { DbPoolLike, SqlClientLike } from '../src/lib/billing-lifecycle-service';
import {
  computeGmvTaxSavings,
  loadTenantDashboardSnapshot,
} from '../src/lib/tenant-dashboard-loader';
import { TenantDashboardClient } from '../src/app/dashboard/TenantDashboardClient';

describe('Tenant Command Dashboard Loader & UI', () => {
  it('computes net 0% GMV savings cleanly against competitor 2% platform tax', () => {
    const res = computeGmvTaxSavings({ gmvAmount: 1_000_000, competitorFeePercent: 2.0 });
    expect(res.ziroFeeAmount).toBe(0);
    expect(res.competitorFeeAmount).toBe(20_000);
    expect(res.netSavingsAmount).toBe(20_000);
    expect(res.platformFeeBps).toBe(0);
  });

  it('loads RLS-scoped metrics and live Pulse telemetry with 0% platformFeeBps invariant', async () => {
    const executedSql: string[] = [];

    const mockClient: SqlClientLike & { release(): void } = {
      release: vi.fn(),
      query: vi.fn(async <T = Record<string, unknown>>(sql: string) => {
        executedSql.push(sql);

        if (sql.includes('FROM ziro_tenant_registry')) {
          return {
            rows: [
              {
                tenant_id: 'tenant_motofit2',
                slug: 'motofit2',
                display_name: 'MotoFit 2 Performance',
                custom_domain: 'shop.motofit2.in',
                plan_tier: 'growth',
                billing_status: 'active',
                billing_provider: 'razorpay',
                current_period_end: '2026-12-30T00:00:00.000Z',
                grace_period_ends_at: null,
                is_demo_sandbox: false,
                read_only_catalog: false,
                platform_fee_bps: 0,
              },
            ] as unknown as T[],
            rowCount: 1,
          };
        }

        if (sql.includes('FROM ziro_product_tax_profile')) {
          return {
            rows: [
              {
                total_products: 120,
                total_bom_kits: 14,
                total_fitment_rules: 640,
                indexed_vectors_count: 114,
                cumulative_gmv_paise: 150_000_000,
                total_orders_count: 340,
              },
            ] as unknown as T[],
            rowCount: 1,
          };
        }

        return { rows: [] as T[], rowCount: 0 };
      }) as unknown as SqlClientLike['query'],
    };

    const db: DbPoolLike = { connect: async () => mockClient };
    const mockFetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          total_count: 1850,
          events: [
            {
              event_id: 'evt_live_01',
              protocol: 'ACP',
              agent_id: 'agent_perplexity_01',
              action: 'Completed brake kit ACP session',
              allowed: true,
              value_paise: 349900,
              created_at: '2026-11-27T12:00:00.000Z',
            },
          ],
        }),
        { status: 200 }
      )
    );

    const snapshot = await loadTenantDashboardSnapshot('tenant_motofit2', {
      db,
      fetchFn: mockFetch as unknown as typeof fetch,
      rootDomain: 'ziro.build',
    });

    expect(snapshot.tenantId).toBe('tenant_motofit2');
    expect(snapshot.platformFeeBps).toBe(0);
    expect(snapshot.edgeRoutingActive).toBe(true);
    expect(snapshot.catalog.totalProducts).toBe(120);
    expect(snapshot.catalog.vectorCoveragePercent).toBe(95);
    expect(snapshot.pulse.source).toBe('live_pulse_ai');
    expect(snapshot.pulse.monthlyAgentQueries).toBe(1850);
    expect(snapshot.pulse.recentEvents[0].protocol).toBe('ACP');

    // Verify RLS transaction session variable was set
    expect(executedSql.some((q) => q.includes("set_config('app.current_tenant_id'"))).toBe(true);
  });

  it('renders TenantDashboardClient with savings, metrics, endpoints, and telemetry feed', async () => {
    const snapshot = await loadTenantDashboardSnapshot('tenant_demo_motors', {
      fetchFn: vi.fn().mockRejectedValue(new Error('Offline')) as unknown as typeof fetch,
      rootDomain: 'ziro.build',
    });

    const html = renderToStaticMarkup(
      React.createElement(TenantDashboardClient, { snapshot })
    );

    expect(html).toContain('Apex MotoWorks Demo');
    expect(html).toContain('PUBLIC SANDBOX (READ-ONLY)');
    expect(html).toContain('0% GMV TAX LOCKED (BPS: 0)');
    expect(html).toContain('TENANT COMMAND CENTER');
    expect(html).toContain('https://demo.ziro.build/.well-known/ucp');
    expect(html).toContain('CACHED TELEMETRY');
  });
});
