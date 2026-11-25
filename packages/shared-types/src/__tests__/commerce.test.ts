import { describe, expect, it } from 'vitest';
import {
  MoneyMinorSchema,
  SignedMoneyMinorSchema,
  TenancyModeSchema,
  PosConflictPolicySchema,
  TenantContextSchema,
  FitmentVehicleSchema,
  ProductFitmentSchema,
  BomStockModeSchema,
  BomComponentSchema,
  BomResolveRequestSchema,
  BomResolveResponseSchema,
  B2bAccountSchema,
  B2bQuoteCreateSchema,
  B2bQuoteApproveSchema,
  PosSyncBatchRequestSchema,
  PosSyncBatchResponseSchema,
} from '../schemas/commerce.js';

describe('commerce shared Zod schemas', () => {
  it('rejects non-integer fractional float currency values', () => {
    expect(MoneyMinorSchema.safeParse(1999).success).toBe(true);
    expect(MoneyMinorSchema.safeParse(0).success).toBe(true);
    expect(MoneyMinorSchema.safeParse(19.99).success).toBe(false);
    expect(MoneyMinorSchema.safeParse(-1).success).toBe(false);
    expect(SignedMoneyMinorSchema.safeParse(-500).success).toBe(true);
    expect(SignedMoneyMinorSchema.safeParse(1.5).success).toBe(false);
  });

  it('validates tenancy mode, conflict policy, and tenant context', () => {
    expect(TenancyModeSchema.parse('single')).toBe('single');
    expect(TenancyModeSchema.parse('multi')).toBe('multi');
    expect(PosConflictPolicySchema.parse('FORCE_SALE_WITH_ALERT')).toBe('FORCE_SALE_WITH_ALERT');
    expect(PosConflictPolicySchema.parse('STRICT_REJECT')).toBe('STRICT_REJECT');

    const ctx = TenantContextSchema.parse({
      tenant_id: 'ten_01',
      slug: 'apex-motors',
      mode: 'multi',
      medusa_store_id: 'store_01',
      medusa_sales_channel_id: 'sc_01',
      origin_state_code: '27',
    });
    expect(ctx.pos_conflict_policy).toBe('FORCE_SALE_WITH_ALERT');
    expect(ctx.min_margin_bps).toBe(1500);
  });

  it('validates fitment vehicle and product fitment with year range check', () => {
    const vehicle = FitmentVehicleSchema.parse({
      tenant_id: 'ten_01',
      make: 'Maruti Suzuki',
      model: 'Swift',
      year_from: 2018,
      year_to: 2024,
      variant: 'ZXi',
      fuel_type: 'Petrol',
    });
    expect(vehicle.year_from).toBe(2018);

    expect(
      FitmentVehicleSchema.safeParse({
        tenant_id: 'ten_01',
        make: 'Maruti Suzuki',
        model: 'Swift',
        year_from: 2024,
        year_to: 2018,
      }).success,
    ).toBe(false);

    const fitment = ProductFitmentSchema.parse({
      tenant_id: 'ten_01',
      product_id: 'prod_1',
      sku: 'PAD-SWIFT-01',
      vehicle_id: 1,
      position: 'front',
    });
    expect(fitment.position).toBe('front');
  });

  it('validates BOM resolve request with optional 3D selections and response', () => {
    expect(BomStockModeSchema.parse('HYBRID')).toBe('HYBRID');
    const comp = BomComponentSchema.parse({
      child_sku: 'PAD-CERAMIC',
      qty_per_unit: 2,
      is_optional: true,
      price_delta_minor: 50000,
      option_group: 'pads',
    });
    expect(comp.is_optional).toBe(true);

    const parsed = BomResolveRequestSchema.parse({
      items: [
        {
          sku: 'KIT-BRAKE-01',
          qty: 2,
          selected_optional_skus: ['PAD-CERAMIC'],
          material_variant: 'anodized-black',
        },
      ],
    });
    expect(parsed.items[0]?.selected_optional_skus).toEqual(['PAD-CERAMIC']);

    const resp = BomResolveResponseSchema.parse({
      items: [
        {
          sku: 'KIT-BRAKE-01',
          qty: 2,
          stock_mode: 'VIRTUAL',
          available_units: 5,
          unit_price_delta_minor: 50000,
          material_variant: 'anodized-black',
          components: [{ child_sku: 'PAD-CERAMIC', required_qty: 4, price_delta_minor: 50000, is_optional: true }],
        },
      ],
    });
    expect(resp.items[0]?.components[0]?.required_qty).toBe(4);
  });

  it('validates POS delta-sync batch with location_id and STOCK_AUDIT audit_mode and response', () => {
    const parsed = PosSyncBatchRequestSchema.parse({
      location_id: 'loc_blr_01',
      device_id: 'pos_tab_01',
      mutations: [
        {
          client_mutation_id: '550e8400-e29b-41d4-a716-446655440000',
          mutation_type: 'STOCK_AUDIT',
          audit_mode: 'ABSOLUTE',
          timestamp: '2026-11-25T10:00:00Z',
          expected_version: 3,
          line_items: [{ sku: 'OIL-5W30', qty: 12, unit_price_minor: 85000 }],
          payment_method: 'CASH',
        },
      ],
    });
    expect(parsed.mutations[0]?.audit_mode).toBe('ABSOLUTE');

    const batchRes = PosSyncBatchResponseSchema.parse({
      location_id: 'loc_blr_01',
      results: [
        {
          client_mutation_id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'APPLIED',
          reconciled_deltas: [
            {
              sku: 'OIL-5W30',
              delta: -3,
              balance_after: 12,
              version_after: 4,
            },
          ],
        },
      ],
      current_inventory: [
        {
          sku: 'OIL-5W30',
          on_hand: 12,
          reserved: 0,
          version: 4,
        },
      ],
    });
    expect(batchRes.results[0]?.status).toBe('APPLIED');
  });

  it('validates B2B account, quote create, and quote approver role', () => {
    const acct = B2bAccountSchema.parse({
      account_id: '550e8400-e29b-41d4-a716-446655440001',
      tenant_id: 'ten_01',
      company_name: 'Bharat Auto Spares Pvt Ltd',
      tax_id: '29ABCDE1234F1ZW',
      tax_id_type: 'GSTIN',
      credit_limit_minor: 50_000_000,
      credit_used_minor: 0,
      net_terms_days: 30,
      status: 'ACTIVE',
    });
    expect(acct.tax_id_type).toBe('GSTIN');

    const quoteCreate = B2bQuoteCreateSchema.parse({
      account_id: '550e8400-e29b-41d4-a716-446655440001',
      items: [{ sku: 'OIL-5W30', qty: 10 }],
    });
    expect(quoteCreate.items).toHaveLength(1);

    expect(
      B2bQuoteApproveSchema.safeParse({ approver_id: 'usr_1', approver_role: 'MERCHANT_ADMIN' }).success,
    ).toBe(true);
    expect(
      B2bQuoteApproveSchema.safeParse({ approver_id: 'usr_1', approver_role: 'B2B_COMPANY_APPROVER' }).success,
    ).toBe(true);
    expect(
      B2bQuoteApproveSchema.safeParse({ approver_id: 'usr_1', approver_role: 'GUEST' }).success,
    ).toBe(false);
  });
});
