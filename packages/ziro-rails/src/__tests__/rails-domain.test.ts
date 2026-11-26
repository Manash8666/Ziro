import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  B2bWholesaleService,
  CyclicBomError,
  DelhiveryAdapter,
  FitmentBomService,
  InMemoryB2bStore,
  InMemoryFitmentBomStore,
  InMemoryNet30CreditStore,
  OndcSellerAdapter,
  ShippoAdapter,
  ShiprocketAdapter,
  ZiroTaxProvider,
  approveB2bQuoteWorkflow,
} from '../index.js';

describe('ZiroTaxProvider', () => {
  it('computes CGST + SGST for intra-state India, IGST for inter-state, and VAT + CUSTOMS_DUTY for DDP', async () => {
    const provider = new ZiroTaxProvider({ defaultOriginStateCode: '27' });

    const intraLines = await provider.getTaxLines(
      [
        {
          id: 'line_1',
          product_id: 'prod_1',
          unit_price_minor: 10000,
          quantity: 1,
          hsn_code: '8708',
          rate_bps_override: 1800,
        },
      ],
      [],
      {
        shipping_address: {
          country_code: 'IN',
          province_code: '27',
        },
      },
    );

    expect(intraLines.map((l) => l.code)).toEqual(['CGST', 'SGST']);
    expect(intraLines[0].rate).toBe(9);
    expect(intraLines[1].rate).toBe(9);
    expect(intraLines[0].amount_minor + intraLines[1].amount_minor).toBe(1800);

    const interLines = await provider.getTaxLines(
      [
        {
          id: 'line_2',
          product_id: 'prod_1',
          unit_price_minor: 10000,
          quantity: 1,
          hsn_code: '8708',
          rate_bps_override: 1800,
        },
      ],
      [],
      {
        shipping_address: {
          country_code: 'IN',
          province_code: '29',
        },
      },
    );

    expect(interLines.map((l) => l.code)).toEqual(['IGST']);
    expect(interLines[0].rate).toBe(18);
    expect(interLines[0].amount_minor).toBe(1800);

    const ddpLines = await provider.getTaxLines(
      [
        {
          id: 'line_3',
          product_id: 'prod_export',
          unit_price_minor: 20000, // £200.00 in GB (> £135 VAT & > £135 duty de minimis)
          quantity: 1,
          hsn_code: '8708',
        },
      ],
      [],
      {
        shipping_address: {
          country_code: 'GB',
        },
      },
    );

    const codes = ddpLines.map((l) => l.code);
    expect(codes).toContain('CUSTOMS_DUTY');
    expect(codes).toContain('VAT');
    expect(ddpLines.every((l) => l.amount_minor > 0)).toBe(true);
  });
});

describe('FitmentBomService', () => {
  it('filters by Year/Make/Model, computes virtual & hybrid kit stock with add-on delta, and throws CyclicBomError on cycles', async () => {
    const store = new InMemoryFitmentBomStore({
      fitments: [
        {
          tenant_id: 't1',
          product_id: 'prod_brake_kit',
          make: 'Hyundai',
          model: 'Creta',
          year_start: 2020,
          year_end: 2024,
          is_universal: false,
        },
        {
          tenant_id: 't1',
          product_id: 'prod_wiper_universal',
          make: '*',
          model: '*',
          year_start: 1990,
          year_end: 2030,
          is_universal: true,
        },
        {
          tenant_id: 't1',
          product_id: 'prod_swift_pad',
          make: 'Maruti',
          model: 'Swift',
          year_start: 2018,
          year_end: 2023,
          is_universal: false,
        },
      ],
      inventory: new Map([
        ['t1:sku_rotor', 11],
        ['t1:sku_pad', 7],
        ['t1:sku_bolt', 50],
        ['t1:kit_hybrid', 3],
      ]),
      boms: [
        {
          tenant_id: 't1',
          parent_sku: 'kit_virtual',
          stock_mode: 'VIRTUAL',
          base_price_minor: 50000,
          components: [
            { component_sku: 'sku_rotor', quantity: 2, is_optional: false, price_delta_minor: 0 },
            { component_sku: 'sku_pad', quantity: 1, is_optional: false, price_delta_minor: 0 },
            { component_sku: 'sku_bolt', quantity: 4, is_optional: true, price_delta_minor: 2500 },
          ],
        },
        {
          tenant_id: 't1',
          parent_sku: 'kit_hybrid',
          stock_mode: 'HYBRID',
          base_price_minor: 50000,
          components: [
            { component_sku: 'sku_rotor', quantity: 2, is_optional: false, price_delta_minor: 0 },
            { component_sku: 'sku_pad', quantity: 1, is_optional: false, price_delta_minor: 0 },
          ],
        },
        {
          tenant_id: 't1',
          parent_sku: 'cycle_a',
          stock_mode: 'VIRTUAL',
          base_price_minor: 1000,
          components: [
            { component_sku: 'cycle_b', quantity: 1, is_optional: false, price_delta_minor: 0 },
          ],
        },
        {
          tenant_id: 't1',
          parent_sku: 'cycle_b',
          stock_mode: 'VIRTUAL',
          base_price_minor: 1000,
          components: [
            { component_sku: 'cycle_a', quantity: 1, is_optional: false, price_delta_minor: 0 },
          ],
        },
      ],
    });

    const service = new FitmentBomService(store);

    const matches = await service.searchByVehicle('t1', {
      year: 2021,
      make: 'Hyundai',
      model: 'Creta',
    });
    expect(matches.map((m) => m.product_id).sort()).toEqual([
      'prod_brake_kit',
      'prod_wiper_universal',
    ]);

    const resolved = await service.resolveBom('t1', {
      items: [
        {
          parent_sku: 'kit_virtual',
          quantity: 1,
          selected_optional_skus: ['sku_bolt'],
        },
        {
          parent_sku: 'kit_hybrid',
          quantity: 1,
          selected_optional_skus: [],
        },
      ],
    });

    // sku_rotor = 11 -> floor(11/2) = 5; sku_pad = 7 -> 7; min(5, 7) = 5 virtual kits
    const virtualItem = resolved.items.find((i) => i.parent_sku === 'kit_virtual');
    expect(virtualItem?.available_quantity).toBe(5);
    expect(virtualItem?.effective_price_minor).toBe(52500); // 50000 + 2500 optional add-on

    // hybrid = 3 pre-assembled + 5 virtual = 8
    const hybridItem = resolved.items.find((i) => i.parent_sku === 'kit_hybrid');
    expect(hybridItem?.available_quantity).toBe(8);

    await expect(
      service.resolveBom('t1', {
        items: [{ parent_sku: 'cycle_a', quantity: 1, selected_optional_skus: [] }],
      }),
    ).rejects.toBeInstanceOf(CyclicBomError);
  });
});

describe('B2bWholesaleService & approveB2bQuoteWorkflow', () => {
  it('approves quote on happy path and rolls back credit + inventory on order emission failure', async () => {
    const accountId = '550e8400-e29b-41d4-a716-446655440010';
    const creditStore = new InMemoryNet30CreditStore([
      {
        account_id: accountId,
        tenant_id: 't1',
        company_name: 'Apex Spares',
        tax_id: '29ABCDE1234F1ZW',
        tax_id_type: 'GSTIN',
        credit_limit_minor: 500_000,
        credit_used_minor: 100_000,
        net_terms_days: 30,
        status: 'ACTIVE',
      },
    ]);

    const bomStore = new InMemoryFitmentBomStore({
      inventory: new Map([
        ['t1:sku_rotor', 20],
        ['t1:sku_pad', 20],
      ]),
      boms: [
        {
          tenant_id: 't1',
          parent_sku: 'kit_virtual',
          stock_mode: 'VIRTUAL',
          base_price_minor: 50_000,
          components: [
            { component_sku: 'sku_rotor', quantity: 2, is_optional: false, price_delta_minor: 0 },
            { component_sku: 'sku_pad', quantity: 1, is_optional: false, price_delta_minor: 0 },
          ],
        },
      ],
    });
    const fitmentBomService = new FitmentBomService(bomStore);
    const b2bStore = new InMemoryB2bStore();
    const b2bService = new B2bWholesaleService({
      b2bStore,
      creditStore,
      fitmentBomService,
    });

    const quote1 = await b2bService.createQuote({
      tenant_id: 't1',
      account_id: accountId,
      currency_code: 'INR',
      items: [{ sku: 'kit_virtual', quantity: 2, unit_price_minor: 50_000 }],
    });

    // Happy path: 100_000 debit, 4 rotors & 2 pads deducted
    const { result: happyResult } = await approveB2bQuoteWorkflow.run({
      input: {
        tenant_id: 't1',
        quote_id: quote1.quote_id,
        b2bService,
      },
    });

    expect(happyResult.status).toBe('APPROVED');
    expect(happyResult.order_id).toMatch(/^ord_b2b_/);
    expect(creditStore.getAccount(accountId)?.credit_used_minor).toBe(200_000);
    expect(bomStore.getStock('t1', 'sku_rotor')).toBe(16);
    expect(bomStore.getStock('t1', 'sku_pad')).toBe(18);

    // Failure path: order emission fails -> compensation must restore credit_used_minor=200_000 & stock=(16, 18)
    const quote2 = await b2bService.createQuote({
      tenant_id: 't1',
      account_id: accountId,
      currency_code: 'INR',
      items: [{ sku: 'kit_virtual', quantity: 1, unit_price_minor: 50_000 }],
    });

    await expect(
      approveB2bQuoteWorkflow.run({
        input: {
          tenant_id: 't1',
          quote_id: quote2.quote_id,
          b2bService,
          simulateOrderEmissionFailure: true,
        },
        throwOnError: true,
      }),
    ).rejects.toThrow();

    expect(creditStore.getAccount(accountId)?.credit_used_minor).toBe(200_000);
    expect(bomStore.getStock('t1', 'sku_rotor')).toBe(16);
    expect(bomStore.getStock('t1', 'sku_pad')).toBe(18);
    expect(b2bStore.getQuote(quote2.quote_id)?.status).toBe('SUBMITTED');
  });
});

describe('Logistics & ONDC Seller Adapter', () => {
  it('signs and verifies Ed25519 BLAKE-512 Beckn payloads, rejects tampered bodies, and translates catalog to on_search', async () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const adapter = new OndcSellerAdapter({
      subscriberId: 'seller.ziro.test',
      uniqueKeyId: 'key_01',
      privateKeyPem: privateKey,
      publicKeyPem: publicKey,
    });

    const body = JSON.stringify({
      context: { domain: 'ONDC:RET10', action: 'search', bap_id: 'bap.test' },
      message: { intent: { item: { descriptor: { name: 'Brake Pad' } } } },
    });

    const authHeader = adapter.signRequest(body, 1_764_000_000, 1_764_000_300);
    expect(authHeader).toContain('Signature keyId="seller.ziro.test|key_01|ed25519"');
    expect(authHeader).toContain('algorithm="ed25519"');

    expect(adapter.verifyRequest(body, authHeader, publicKey, 1_764_000_050)).toBe(true);
    expect(
      adapter.verifyRequest(body.replace('Brake Pad', 'Fake Pad'), authHeader, publicKey, 1_764_000_050),
    ).toBe(false);

    const onSearch = adapter.translateCatalogToOnSearch({
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
      providerName: 'Ziro Auto Store',
      items: [
        {
          id: 'item_1',
          title: 'Ceramic Brake Pad',
          price_minor: 150000,
          currency: 'INR',
          stock_qty: 12,
        },
      ],
    });

    expect(onSearch.context.action).toBe('on_search');
    expect(onSearch.message.catalog['bpp/providers'][0].items[0].price.value).toBe('1500.00');

    const sr = new ShiprocketAdapter();
    const dl = new DelhiveryAdapter();
    const sp = new ShippoAdapter();
    expect(sr.providerId).toBe('shiprocket');
    expect(dl.providerId).toBe('delhivery');
    expect(sp.providerId).toBe('shippo');
  });
});
