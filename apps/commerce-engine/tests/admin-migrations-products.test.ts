import { describe, expect, it, vi } from 'vitest';
import { POST as migrationPost } from '../src/api/admin/migrations/products/route.js';
import {
  createEngineContainer,
  type EngineRequest,
  type EngineResponse,
} from '../src/services/engine-container.js';
import { executeInTenantRls, type DbClientWithQuery } from '../src/lib/rls-transaction.js';
import type { ZiroMigratedProduct } from '@ziro/migrator';

function makeRes(): EngineResponse & { statusCode: number; body: any } {
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe('Commerce Engine Admin Migrations & RLS', () => {
  const validToken = 'ziro_internal_secret_token_123';

  it('enforces internal service bearer token authentication', async () => {
    const container = createEngineContainer();

    // 1. Missing header
    const req1: EngineRequest = {
      headers: {},
      scope: { resolve: () => container },
      body: { products: [] },
    };
    const res1 = makeRes();
    await migrationPost(req1, res1);
    expect(res1.statusCode).toBe(401);

    // 2. Invalid token
    const req2: EngineRequest = {
      headers: { authorization: 'Bearer invalid_secret' },
      scope: { resolve: () => container },
      body: { products: [] },
    };
    const res2 = makeRes();
    await migrationPost(req2, res2);
    expect(res2.statusCode).toBe(401);
  });

  it('validates request payload and idempotently imports products with 0% fee', async () => {
    const container = createEngineContainer();

    const sampleProduct: ZiroMigratedProduct = {
      idempotencyKey: 'ziro_mig_abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      handle: 'brembo-racing-pad-x',
      title: 'Brembo Racing Pad X',
      bodyHtml: '<p>Top tier friction compound</p>',
      category: 'Brakes',
      tags: ['fitment:Yamaha:R15:2020-2024'],
      hsnCode: '8714',
      gstSlab: 28,
      fitments: [{ make: 'Yamaha', model: 'R15', yearStart: 2020, yearEnd: 2024 }],
      variants: [
        {
          idempotencyKey: 'ziro_mig_var_001',
          sku: 'BRM-PAD-X',
          title: 'Standard',
          pricePaise: 450000,
          inventoryQuantity: 25,
          options: {},
        },
      ],
      images: ['https://cdn.example.com/pad.png'],
      platformFeeBps: 0,
    };

    // 1. Initial import
    const req1: EngineRequest = {
      headers: {
        authorization: `Bearer ${validToken}`,
        'x-ziro-tenant-id': 'tenant_m1',
      },
      scope: { resolve: () => container },
      body: { products: [sampleProduct] },
    };
    const res1 = makeRes();
    await migrationPost(req1, res1);

    expect(res1.statusCode).toBe(200);
    expect(res1.body.totalProcessed).toBe(1);
    expect(res1.body.insertedCount).toBe(1);
    expect(res1.body.skippedCount).toBe(0);

    // Verify stored data
    const stored = container.migrationUpsertService.getProduct('tenant_m1', 'brembo-racing-pad-x');
    expect(stored).toBeDefined();
    expect(stored?.platformFeeBps).toBe(0);

    const taxProfile = container.migrationUpsertService.getTaxProfile('tenant_m1', 'brembo-racing-pad-x');
    expect(taxProfile).toEqual({
      tenantId: 'tenant_m1',
      handle: 'brembo-racing-pad-x',
      hsnCode: '8714',
      gstSlab: 28,
    });

    const fitments = container.migrationUpsertService.getFitments('tenant_m1', 'brembo-racing-pad-x');
    expect(fitments).toHaveLength(1);
    expect(fitments[0].make).toBe('Yamaha');

    // 2. Re-import with same idempotency key -> skipped (idempotent)
    const req2: EngineRequest = {
      headers: {
        authorization: `Bearer ${validToken}`,
        'x-ziro-tenant-id': 'tenant_m1',
      },
      scope: { resolve: () => container },
      body: { products: [sampleProduct] },
    };
    const res2 = makeRes();
    await migrationPost(req2, res2);

    expect(res2.statusCode).toBe(200);
    expect(res2.body.insertedCount).toBe(0);
    expect(res2.body.skippedCount).toBe(1);
  });

  it('rejects product with non-zero platform fee violating the 0% GMV invariant', async () => {
    const container = createEngineContainer();

    const badProduct: any = {
      idempotencyKey: 'ziro_mig_bad_fee_001',
      handle: 'taxed-item',
      title: 'Taxed Item',
      hsnCode: '8708',
      gstSlab: 18,
      fitments: [],
      variants: [],
      images: [],
      platformFeeBps: 200, // 2% violation!
    };

    const req: EngineRequest = {
      headers: {
        authorization: `Bearer ${validToken}`,
        'x-ziro-tenant-id': 'tenant_m1',
      },
      scope: { resolve: () => container },
      body: { products: [badProduct] },
    };
    const res = makeRes();
    await migrationPost(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].message).toContain('platformFeeBps must be 0');
  });

  it('executeInTenantRls sets app.current_tenant_id inside transaction and cleans up', async () => {
    const queryCalls: Array<{ sql: string; params?: any[] }> = [];
    const mockDb: DbClientWithQuery = {
      query: vi.fn().mockImplementation(async (sql: string, params?: any[]) => {
        queryCalls.push({ sql, params });
        return { rows: [] };
      }),
    };

    const result = await executeInTenantRls(mockDb, 'tenant_enterprise_7', async () => {
      return { success: true, count: 42 };
    });

    expect(result).toEqual({ success: true, count: 42 });
    expect(queryCalls).toHaveLength(2);
    expect(queryCalls[0].sql).toBe("SELECT set_config('app.current_tenant_id', $1, true);");
    expect(queryCalls[0].params).toEqual(['tenant_enterprise_7']);
    expect(queryCalls[1].sql).toBe("SELECT set_config('app.current_tenant_id', '', true);");
  });
});
