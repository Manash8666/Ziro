import { describe, expect, it } from 'vitest';
import {
  InMemoryFitmentBomStore,
  InMemoryNet30CreditStore,
} from '@ziro/rails';
import {
  createEngineContainer,
  type EngineRequest,
  type EngineResponse,
} from '../services/engine-container.js';
import { POST as bomPost, GET as bomGet } from '../api/admin/bom/route.js';
import { POST as fitmentBulkPost, GET as fitmentGet } from '../api/admin/fitment/route.js';
import { PATCH as b2bCreditPatch } from '../api/admin/b2b/route.js';

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

describe('Commerce Engine Admin Routes', () => {
  it('manages BOM kits, bulk vehicle fitments, and B2B wholesale credit limits', async () => {
    const bomStore = new InMemoryFitmentBomStore({
      inventory: new Map([
        ['t_admin:rtr_01', 50],
        ['t_admin:pad_01', 80],
      ]),
    });

    const creditStore = new InMemoryNet30CreditStore([
      {
        account_id: 'b2b_acc_001',
        tenant_id: 't_admin',
        company_name: 'Metro Spares Ltd',
        tax_id: '27AAAAA0000A1Z5',
        tax_id_type: 'GSTIN',
        credit_limit_minor: 500000,
        credit_used_minor: 100000,
        net_terms_days: 30,
        status: 'ACTIVE',
      },
    ]);

    const container = createEngineContainer({
      bomStore,
      creditStore,
    });

    // 1. Create BOM kit via Admin API
    const bomReq: EngineRequest = {
      headers: { 'x-ziro-tenant-id': 't_admin' },
      body: {
        parent_sku: 'KIT-CERAMIC-COMBO',
        stock_mode: 'VIRTUAL',
        base_price_minor: 750000,
        components: [
          { component_sku: 'rtr_01', quantity: 2, is_optional: false, price_delta_minor: 0 },
          { component_sku: 'pad_01', quantity: 1, is_optional: false, price_delta_minor: 0 },
        ],
      },
      scope: { resolve: () => container },
    };
    const bomCreateRes = makeRes();
    await bomPost(bomReq, bomCreateRes);
    expect(bomCreateRes.statusCode).toBe(201);
    expect(bomCreateRes.body.success).toBe(true);

    // Fetch BOM
    const bomGetReq: EngineRequest = {
      headers: { 'x-ziro-tenant-id': 't_admin' },
      params: { parent_sku: 'KIT-CERAMIC-COMBO' },
      scope: { resolve: () => container },
    };
    const bomGetRes = makeRes();
    await bomGet(bomGetReq, bomGetRes);
    expect(bomGetRes.statusCode).toBe(200);
    expect(bomGetRes.body.bom.parent_sku).toBe('KIT-CERAMIC-COMBO');
    expect(bomGetRes.body.bom.components.length).toBe(2);

    // 2. Bulk Fitment Import
    const fitmentReq: EngineRequest = {
      headers: { 'x-ziro-tenant-id': 't_admin' },
      body: {
        items: [
          {
            product_id: 'prod_brake_combo',
            make: 'Hyundai',
            model: 'Creta',
            year_start: 2020,
            year_end: 2026,
            is_universal: false,
          },
          {
            product_id: 'prod_brake_combo',
            make: 'Kia',
            model: 'Seltos',
            year_start: 2020,
            year_end: 2026,
            is_universal: false,
          },
        ],
      },
      scope: { resolve: () => container },
    };
    const fitmentRes = makeRes();
    await fitmentBulkPost(fitmentReq, fitmentRes);
    expect(fitmentRes.statusCode).toBe(200);
    expect(fitmentRes.body.imported_count).toBe(2);

    // Search fitments
    const fitmentSearchReq: EngineRequest = {
      headers: { 'x-ziro-tenant-id': 't_admin' },
      query: { make: 'Hyundai', model: 'Creta', year: '2023' },
      scope: { resolve: () => container },
    };
    const fitmentSearchRes = makeRes();
    await fitmentGet(fitmentSearchReq, fitmentSearchRes);
    expect(fitmentSearchRes.statusCode).toBe(200);
    expect(fitmentSearchRes.body.results.length).toBe(1);
    expect(fitmentSearchRes.body.results[0].product_id).toBe('prod_brake_combo');

    // 3. Update B2B Credit Account
    const creditReq: EngineRequest = {
      headers: { 'x-ziro-tenant-id': 't_admin' },
      params: { id: 'b2b_acc_001' },
      body: {
        credit_limit_minor: 1000000,
        net_terms_days: 45,
        status: 'ACTIVE',
      },
      scope: { resolve: () => container },
    };
    const creditRes = makeRes();
    await b2bCreditPatch(creditReq, creditRes);
    expect(creditRes.statusCode).toBe(200);
    expect(creditRes.body.account.credit_limit_minor).toBe(1000000);
    expect(creditRes.body.account.net_terms_days).toBe(45);
  });
});
