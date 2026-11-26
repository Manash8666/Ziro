import { describe, expect, it } from 'vitest';
import {
  AgentTelemetryMetricSchema,
  BarcodeScannerScanEventSchema,
  CaddyDomainCheckResponseSchema,
  EscPosPaperWidthSchema,
  EscPosReceiptRequestSchema,
  SaaSPlanTierSchema,
  TenantProvisionRequestSchema,
  TenantProvisionResponseSchema,
  ZIRO_PLATFORM_FEE_BPS,
} from '../index.js';

describe('Stage 2 Shared Schemas & Contracts', () => {
  it('validates SaaSPlanTierSchema and TenantProvisioning schemas enforcing 0% GMV fee', () => {
    expect(SaaSPlanTierSchema.parse('STARTER')).toBe('STARTER');
    expect(SaaSPlanTierSchema.parse('GROWTH')).toBe('GROWTH');
    expect(SaaSPlanTierSchema.parse('ENTERPRISE')).toBe('ENTERPRISE');
    expect(() => SaaSPlanTierSchema.parse('PERCENTAGE_GMV')).toThrow();

    const validReq = TenantProvisionRequestSchema.parse({
      slug: 'auto-spares-delhi',
      name: 'Delhi Auto Spares Pvt Ltd',
      admin_email: 'admin@autospares.in',
      plan_tier: 'GROWTH',
      origin_state_code: '07',
      currency_code: 'INR',
      custom_domain: 'store.autospares.in',
    });
    expect(validReq.slug).toBe('auto-spares-delhi');

    // Invalid slug (uppercase or special characters) must fail
    expect(() =>
      TenantProvisionRequestSchema.parse({
        slug: 'Auto_Spares!',
        name: 'Bad Slug Co',
        admin_email: 'bad@test.com',
        plan_tier: 'STARTER',
      }),
    ).toThrow();

    const validResp = TenantProvisionResponseSchema.parse({
      tenant_id: 'tenant_delhi_01',
      slug: 'auto-spares-delhi',
      primary_domain: 'auto-spares-delhi.ziro.dev',
      api_key: 'zk_live_1234567890abcdef',
      status: 'ACTIVE',
      platform_fee_bps: ZIRO_PLATFORM_FEE_BPS,
    });
    expect(validResp.platform_fee_bps).toBe(0);

    // Non-zero platform fee must be rejected
    expect(() =>
      TenantProvisionResponseSchema.parse({
        ...validResp,
        platform_fee_bps: 200,
      }),
    ).toThrow();
  });

  it('validates CaddyDomainCheckResponseSchema', () => {
    const allowed = CaddyDomainCheckResponseSchema.parse({
      allowed: true,
      domain: 'store.autospares.in',
      tenant_id: 'tenant_delhi_01',
    });
    expect(allowed.allowed).toBe(true);

    const rejected = CaddyDomainCheckResponseSchema.parse({
      allowed: false,
      domain: 'unknown-domain.com',
    });
    expect(rejected.allowed).toBe(false);
  });

  it('validates EscPosReceiptRequestSchema and paper widths', () => {
    expect(EscPosPaperWidthSchema.parse(58)).toBe(58);
    expect(EscPosPaperWidthSchema.parse(80)).toBe(80);
    expect(() => EscPosPaperWidthSchema.parse(70)).toThrow();

    const receipt = EscPosReceiptRequestSchema.parse({
      paper_width: 80,
      store_name: 'Ziro Auto Spares Flagship',
      gstin: '07AAAAA0000A1Z5',
      invoice_no: 'INV-2026-0091',
      date: '2026-11-26 14:00:00',
      cashier_name: 'Rajesh K.',
      items: [
        {
          name: 'Front Ceramic Brake Pad Kit',
          qty: 1,
          unit_price_minor: 149900,
          total_minor: 149900,
          hsn: '8708',
        },
      ],
      subtotal_minor: 149900,
      tax_lines: [
        { code: 'CGST', rate_pct: 9, amount_minor: 13491 },
        { code: 'SGST', rate_pct: 9, amount_minor: 13491 },
      ],
      total_minor: 176882,
      tender_type: 'UPI',
      qr_payload: 'upi://pay?pa=ziro@okaxis&am=1768.82',
      barcode_payload: 'INV20260091',
      cut_paper: true,
      open_cash_drawer: false,
    });

    expect(receipt.paper_width).toBe(80);
    expect(receipt.total_minor).toBe(176882);
  });

  it('validates BarcodeScannerScanEventSchema and AgentTelemetryMetricSchema', () => {
    const scan = BarcodeScannerScanEventSchema.parse({
      barcode: '8901234567890',
      symbology: 'EAN13',
      duration_ms: 18,
      timestamp: Date.now(),
    });
    expect(scan.barcode).toBe('8901234567890');
    expect(scan.duration_ms).toBeLessThanOrEqual(50);

    const telemetry = AgentTelemetryMetricSchema.parse({
      agent_id: 'agent_gemini_shopping_01',
      protocol: 'UCP',
      action: 'checkout_session_create',
      margin_protected: true,
      discount_requested_bps: 2500,
      discount_granted_bps: 1500,
      cart_value_minor: 250000,
      converted: true,
    });
    expect(telemetry.protocol).toBe('UCP');
    expect(telemetry.margin_protected).toBe(true);
  });
});
