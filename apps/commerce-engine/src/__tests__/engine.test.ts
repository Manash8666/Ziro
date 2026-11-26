import crypto from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  InMemoryFitmentBomStore,
  InMemoryTenantStore,
  OndcSellerAdapter,
  TenantContextResolver,
} from '@ziro/rails';
import {
  createEngineContainer,
  type EngineRequest,
  type EngineResponse,
} from '../services/engine-container.js';
import { POST as posSyncPost } from '../api/store/pos/sync/route.js';
import { GET as posCatalogGet } from '../api/store/pos/catalog/route.js';
import { POST as acpPricePost } from '../api/internal/acp/price-and-reserve/route.js';
import { POST as acpCompletePost } from '../api/internal/acp/complete-order/route.js';
import { POST as razorpayWebhookPost } from '../api/webhooks/razorpay/route.js';
import { POST as tenantWebhookPost } from '../api/webhooks/[provider]/[tenantId]/route.js';
import { POST as ondcSearchPost } from '../api/ondc/search/route.js';
import { productMutatedSubscriber } from '../subscribers/product-mutated.js';

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

describe('@ziro/core commerce-engine', () => {
  it('handles POS_SALE, deduplication, FORCE_SALE_WITH_ALERT, STRICT_REJECT, ABSOLUTE audit, BOM deduction, and delta catalog', async () => {
    const bomStore = new InMemoryFitmentBomStore({
      inventory: new Map([
        ['t_pos:sku_brake', 10],
        ['t_pos:sku_rotor', 8],
        ['t_pos:sku_pad', 6],
      ]),
      boms: [
        {
          tenant_id: 't_pos',
          parent_sku: 'kit_brake_combo',
          stock_mode: 'VIRTUAL',
          base_price_minor: 50000,
          components: [
            { component_sku: 'sku_rotor', quantity: 2, is_optional: false, price_delta_minor: 0 },
            { component_sku: 'sku_pad', quantity: 1, is_optional: false, price_delta_minor: 0 },
          ],
        },
      ],
    });

    const tenantStore = new InMemoryTenantStore({
      tenants: [
        {
          tenant_id: 't_pos',
          slug: 'pos-alert',
          primary_domain: 'pos.ziro.test',
          mode: 'multi',
          medusa_store_id: 'store_pos',
          medusa_sales_channel_id: 'sc_pos',
          pos_conflict_policy: 'FORCE_SALE_WITH_ALERT',
          origin_state_code: '27',
          min_margin_bps: 1500,
          currency_code: 'INR',
        },
        {
          tenant_id: 't_strict',
          slug: 'pos-strict',
          primary_domain: 'strict.ziro.test',
          mode: 'multi',
          medusa_store_id: 'store_strict',
          medusa_sales_channel_id: 'sc_strict',
          pos_conflict_policy: 'STRICT_REJECT',
          origin_state_code: '27',
          min_margin_bps: 1500,
          currency_code: 'INR',
        },
      ],
    });

    const container = createEngineContainer({
      tenantResolver: new TenantContextResolver({ store: tenantStore, defaultMode: 'multi' }),
      bomStore,
      initialCatalog: [
        {
          tenant_id: 't_pos',
          location_id: 'loc_1',
          sku: 'sku_brake',
          product_id: 'p_brake',
          title: 'Brake Shoe',
          price_minor: 15000,
          on_hand: 10,
          version: 1,
        },
        {
          tenant_id: 't_pos',
          location_id: 'loc_1',
          sku: 'kit_brake_combo',
          product_id: 'p_kit',
          title: 'Brake Combo Kit',
          price_minor: 50000,
          on_hand: 4,
          version: 1,
        },
        {
          tenant_id: 't_strict',
          location_id: 'loc_2',
          sku: 'sku_oil',
          product_id: 'p_oil',
          title: 'Engine Oil',
          price_minor: 9000,
          on_hand: 15,
          version: 3,
        },
      ],
    });

    // 1. Normal POS_SALE + duplicate
    const mutId1 = '550e8400-e29b-41d4-a716-446655440001';
    const syncReq1: EngineRequest = {
      headers: { host: 'pos.ziro.test' },
      body: {
        device_id: 'pos-1',
        location_id: 'loc_1',
        mutations: [
          {
            client_mutation_id: mutId1,
            mutation_type: 'POS_SALE',
            line_items: [{ sku: 'sku_brake', qty: 2, unit_price_minor: 15000 }],
            payment_method: 'CASH',
            expected_version: 1,
            timestamp: new Date().toISOString(),
          },
          {
            client_mutation_id: mutId1,
            mutation_type: 'POS_SALE',
            line_items: [{ sku: 'sku_brake', qty: 2, unit_price_minor: 15000 }],
            payment_method: 'CASH',
            expected_version: 1,
            timestamp: new Date().toISOString(),
          },
        ],
      },
      scope: { resolve: () => container },
    };
    const res1 = makeRes();
    await posSyncPost(syncReq1, res1);
    expect(res1.statusCode).toBe(200);
    expect(res1.body.results[0].status).toBe('APPLIED');
    expect(res1.body.results[0].server_version).toBe(2);
    expect(res1.body.results[1].status).toBe('DUPLICATE');

    // 2. Version mismatch under FORCE_SALE_WITH_ALERT -> APPLIED_WITH_ALERT + alert record
    const resAlert = makeRes();
    await posSyncPost(
      {
        headers: { host: 'pos.ziro.test' },
        body: {
          device_id: 'pos-1',
          location_id: 'loc_1',
          mutations: [
            {
              client_mutation_id: '550e8400-e29b-41d4-a716-446655440002',
              mutation_type: 'POS_SALE',
              line_items: [{ sku: 'sku_brake', qty: 1, unit_price_minor: 15000 }],
              payment_method: 'UPI',
              expected_version: 1, // stale, server is 2
              timestamp: new Date().toISOString(),
            },
          ],
        },
        scope: { resolve: () => container },
      },
      resAlert,
    );
    expect(resAlert.body.results[0].status).toBe('APPLIED_WITH_ALERT');
    expect(container.posSyncService.getReconciliationAlerts('t_pos').length).toBe(1);

    // 3. ABSOLUTE stock audit: current on_hand is 10 - 2 - 1 = 7. Audit absolute=12 -> delta=+5
    const resAudit = makeRes();
    await posSyncPost(
      {
        headers: { host: 'pos.ziro.test' },
        body: {
          device_id: 'pos-1',
          location_id: 'loc_1',
          mutations: [
            {
              client_mutation_id: '550e8400-e29b-41d4-a716-446655440003',
              mutation_type: 'STOCK_AUDIT',
              audit_mode: 'ABSOLUTE',
              line_items: [{ sku: 'sku_brake', qty: 12, unit_price_minor: 15000 }],
              payment_method: 'NONE',
              expected_version: 3,
              timestamp: new Date().toISOString(),
            },
          ],
        },
        scope: { resolve: () => container },
      },
      resAudit,
    );
    expect(resAudit.body.results[0].status).toBe('APPLIED');
    expect(resAudit.body.results[0].server_balance).toBe(12);

    // 4. BOM parent SKU sale deducts child SKUs atomically (2 rotors, 1 pad)
    const resBom = makeRes();
    await posSyncPost(
      {
        headers: { host: 'pos.ziro.test' },
        body: {
          device_id: 'pos-1',
          location_id: 'loc_1',
          mutations: [
            {
              client_mutation_id: '550e8400-e29b-41d4-a716-446655440004',
              mutation_type: 'POS_SALE',
              line_items: [{ sku: 'kit_brake_combo', qty: 1, unit_price_minor: 50000 }],
              payment_method: 'CARD',
              expected_version: 1,
              timestamp: new Date().toISOString(),
            },
          ],
        },
        scope: { resolve: () => container },
      },
      resBom,
    );
    expect(resBom.body.results[0].status).toBe('APPLIED');
    expect(bomStore.getStock('t_pos', 'sku_rotor')).toBe(6);
    expect(bomStore.getStock('t_pos', 'sku_pad')).toBe(5);

    // 5. STRICT_REJECT rejects stale POS_SALE & STOCK_AUDIT
    const resStrict = makeRes();
    await posSyncPost(
      {
        headers: { host: 'strict.ziro.test' },
        body: {
          device_id: 'pos-2',
          location_id: 'loc_2',
          mutations: [
            {
              client_mutation_id: '550e8400-e29b-41d4-a716-446655440005',
              mutation_type: 'POS_SALE',
              line_items: [{ sku: 'sku_oil', qty: 1, unit_price_minor: 9000 }],
              payment_method: 'CASH',
              expected_version: 1, // stale, server is 3
              timestamp: new Date().toISOString(),
            },
          ],
        },
        scope: { resolve: () => container },
      },
      resStrict,
    );
    expect(resStrict.body.results[0].status).toBe('CONFLICT');
    expect(resStrict.body.results[0].server_version).toBe(3);
    expect(resStrict.body.results[0].server_balance).toBe(15);

    // 6. GET /store/pos/catalog?since_version=2 returns updated items
    const resCat = makeRes();
    await posCatalogGet(
      {
        headers: { host: 'pos.ziro.test' },
        query: { location_id: 'loc_1', since_version: '2' },
        scope: { resolve: () => container },
      },
      resCat,
    );
    expect(resCat.statusCode).toBe(200);
    expect(resCat.body.items.some((i: any) => i.sku === 'sku_brake')).toBe(true);
  });

  it('enforces X-Ziro-Internal-Secret on ACP internal routes and reserves/completes orders', async () => {
    const container = createEngineContainer({
      internalSecret: 'internal_secret_test',
      initialCatalog: [
        {
          tenant_id: 'default',
          location_id: 'loc_1',
          sku: 'sku_1',
          product_id: 'prod_1',
          title: 'Part 1',
          price_minor: 100000,
          cogs_minor: 70000,
          on_hand: 10,
          version: 1,
        },
      ],
    });

    const unauthRes = makeRes();
    await acpPricePost(
      {
        headers: {},
        body: { tenant_id: 'default', line_items: [{ product_id: 'prod_1', quantity: 1 }] },
        scope: { resolve: () => container },
      },
      unauthRes,
    );
    expect(unauthRes.statusCode).toBe(401);

    const priceRes = makeRes();
    await acpPricePost(
      {
        headers: { 'x-ziro-internal-secret': 'internal_secret_test' },
        body: {
          tenant_id: 'default',
          line_items: [{ product_id: 'prod_1', quantity: 2 }],
          currency: 'INR',
          requested_discount_bps: 500,
          shipping_address: { country: 'IN', state_code: '29' },
        },
        scope: { resolve: () => container },
      },
      priceRes,
    );
    expect(priceRes.statusCode).toBe(200);
    expect(priceRes.body.subtotal_minor).toBe(200000);
    expect(priceRes.body.tax_minor).toBeGreaterThan(0);
    expect(priceRes.body.reservation_id).toBeTruthy();

    const completeRes = makeRes();
    await acpCompletePost(
      {
        headers: { 'x-ziro-internal-secret': 'internal_secret_test' },
        body: {
          tenant_id: 'default',
          reservation_id: priceRes.body.reservation_id,
          payment_token: { provider: 'razorpay', token: 'tok_1' },
          idempotency_key: 'idem_core_001',
        },
        scope: { resolve: () => container },
      },
      completeRes,
    );
    expect(completeRes.statusCode).toBe(200);
    expect(completeRes.body.status).toBe('COMPLETED');
    expect(completeRes.body.external_order_id).toBeTruthy();
  });

  it('validates webhook raw-body HMAC in single and multi-tenant modes, ONDC search, and productMutatedSubscriber', async () => {
    const tenantStore = new InMemoryTenantStore({
      tenants: [
        {
          tenant_id: 't_multi',
          slug: 'multi',
          primary_domain: 'multi.ziro.test',
          mode: 'multi',
          medusa_store_id: 's1',
          medusa_sales_channel_id: 'sc1',
          pos_conflict_policy: 'FORCE_SALE_WITH_ALERT',
          origin_state_code: '27',
          min_margin_bps: 1500,
          currency_code: 'INR',
        },
      ],
      gatewayConfigs: [
        {
          tenant_id: 't_multi',
          provider: 'razorpay',
          key_id: 'rzp_test_m',
          secret_ciphertext: 'rzp_sec_m',
          webhook_secret_ciphertext: 'whsec_multi_123',
          is_active: true,
        },
      ],
    });

    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const ondcAdapter = new OndcSellerAdapter({
      subscriberId: 'seller.ziro.test',
      uniqueKeyId: 'k1',
      privateKeyPem: privateKey,
      publicKeyPem: publicKey,
    });

    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ indexed_count: 1 }) }));
    const meiliIndexMock = { addDocuments: vi.fn(async () => ({ taskUid: 1 })) };

    const container = createEngineContainer({
      tenantResolver: new TenantContextResolver({
        store: tenantStore,
        defaultMode: 'single',
        env: { RAZORPAY_WEBHOOK_SECRET: 'whsec_single_123' },
      }),
      ondcAdapter,
      meilisearchIndex: meiliIndexMock,
      fetchImpl: fetchMock as any,
      initialCatalog: [
        {
          tenant_id: 'default',
          location_id: 'loc_1',
          sku: 'sku_1',
          product_id: 'prod_1',
          title: 'Brake Pad',
          price_minor: 100000,
          on_hand: 5,
          version: 1,
        },
      ],
    });

    // Single-tenant webhook
    const rawBodySingle = JSON.stringify({ id: 'evt_s1', event: 'payment.captured' });
    const sigSingle = crypto.createHmac('sha256', 'whsec_single_123').update(rawBodySingle).digest('hex');
    const whSingleRes = makeRes();
    await razorpayWebhookPost(
      {
        headers: { 'x-razorpay-signature': sigSingle },
        rawBody: rawBodySingle,
        body: JSON.parse(rawBodySingle),
        scope: { resolve: () => container },
      },
      whSingleRes,
    );
    expect(whSingleRes.statusCode).toBe(200);

    // Multi-tenant webhook invalid sig -> 401
    const rawBodyMulti = JSON.stringify({ id: 'evt_m1', event: 'payment.captured' });
    const whMultiBad = makeRes();
    await tenantWebhookPost(
      {
        params: { provider: 'razorpay', tenantId: 't_multi' },
        headers: { 'x-razorpay-signature': 'bad_sig' },
        rawBody: rawBodyMulti,
        body: JSON.parse(rawBodyMulti),
        scope: { resolve: () => container },
      },
      whMultiBad,
    );
    expect(whMultiBad.statusCode).toBe(401);

    // Multi-tenant webhook valid sig -> 200
    const sigMulti = crypto.createHmac('sha256', 'whsec_multi_123').update(rawBodyMulti).digest('hex');
    const whMultiGood = makeRes();
    await tenantWebhookPost(
      {
        params: { provider: 'razorpay', tenantId: 't_multi' },
        headers: { 'x-razorpay-signature': sigMulti },
        rawBody: rawBodyMulti,
        body: JSON.parse(rawBodyMulti),
        scope: { resolve: () => container },
      },
      whMultiGood,
    );
    expect(whMultiGood.statusCode).toBe(200);

    // ONDC search
    const ondcBodyObj = {
      context: {
        domain: 'ONDC:RET10',
        country: 'IND',
        city: 'std:080',
        action: 'search',
        core_version: '1.2.0',
        bap_id: 'bap.test',
        bap_uri: 'https://bap.test',
        transaction_id: 'tx_1',
        message_id: 'msg_1',
        timestamp: '2026-11-25T10:00:00.000Z',
      },
      message: { intent: {} },
    };
    const ondcRaw = JSON.stringify(ondcBodyObj);
    const ondcAuth = ondcAdapter.signRequest(ondcRaw);
    const ondcRes = makeRes();
    await ondcSearchPost(
      {
        headers: { authorization: ondcAuth },
        rawBody: ondcRaw,
        body: ondcBodyObj,
        scope: { resolve: () => container },
      },
      ondcRes,
    );
    expect(ondcRes.statusCode).toBe(200);
    expect(ondcRes.body.context.action).toBe('on_search');

    // Subscriber pushes to Meilisearch & Pulse AI
    await productMutatedSubscriber(
      {
        event: {
          data: {
            tenant_id: 'default',
            product_id: 'prod_1',
            title: 'Brake Pad',
            description: 'Ceramic pad',
            sku: 'sku_1',
            price_minor: 100000,
            currency: 'INR',
            stock_qty: 5,
          },
        },
        container: { resolve: () => container },
      } as any,
    );
    expect(meiliIndexMock.addDocuments).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
