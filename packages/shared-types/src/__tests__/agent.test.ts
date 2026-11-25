import { describe, expect, it } from 'vitest';
import {
  ZIRO_PLATFORM_FEE_BPS,
  UcpDiscoveryManifestSchema,
  WebMcpManifestSchema,
  AcpCheckoutCreateSchema,
  AcpCheckoutSessionSchema,
  AcpCheckoutCompleteSchema,
  KyaHeadersSchema,
  RtoScoreRequestSchema,
  RtoScoreResponseSchema,
  OndcBecknContextSchema,
  OndcBecknRequestSchema,
} from '../agent/contracts.js';
import {
  MoneyMinorSchema,
  validateGstin,
  ZIRO_PLATFORM_FEE_BPS as ROOT_FEE_BPS,
  UcpDiscoveryManifestSchema as RootUcpSchema,
} from '../index.js';

describe('agentic commerce, KYA, RTO Shield & ONDC shared contracts', () => {
  it('enforces ZIRO_PLATFORM_FEE_BPS === 0 in constant and UCP discovery manifest', () => {
    expect(ZIRO_PLATFORM_FEE_BPS).toBe(0);

    const validManifest = UcpDiscoveryManifestSchema.parse({
      ucp_version: '1.0',
      merchant_name: 'Apex Auto Spares',
      platform_fee_bps: 0,
      capabilities: ['catalog_search', 'fitment_lookup', 'acp_checkout'],
      kya_required: true,
      acp_base_url: 'https://pulse.ziro.local/api/agent/acp/v1',
      webmcp_manifest_url: 'https://pulse.ziro.local/.well-known/webmcp.json',
    });
    expect(validManifest.platform_fee_bps).toBe(0);
    expect(validManifest.kya_required).toBe(true);

    expect(
      UcpDiscoveryManifestSchema.safeParse({
        ucp_version: '1.0',
        merchant_name: 'Apex Auto Spares',
        platform_fee_bps: 200,
        capabilities: ['acp_checkout'],
        kya_required: true,
        acp_base_url: 'https://pulse.ziro.local/api/agent/acp/v1',
        webmcp_manifest_url: 'https://pulse.ziro.local/.well-known/webmcp.json',
      }).success,
    ).toBe(false);
  });

  it('validates WebMCP manifest tool descriptors', () => {
    const manifest = WebMcpManifestSchema.parse({
      schema_version: '1.0',
      tools: [
        {
          name: 'search_catalog',
          description: 'Semantic product search across tenant catalog',
          input_schema: {
            type: 'object',
            properties: { query: { type: 'string' } },
            required: ['query'],
          },
          endpoint: '/v1/search/semantic',
          method: 'POST',
        },
        {
          name: 'create_acp_checkout',
          description: 'Create an ACP checkout session',
          input_schema: { type: 'object' },
          endpoint: '/api/agent/acp/v1/checkout-sessions',
          method: 'POST',
        },
      ],
    });
    expect(manifest.tools).toHaveLength(2);
    expect(manifest.tools[0]?.method).toBe('POST');

    expect(
      WebMcpManifestSchema.safeParse({
        schema_version: '1.0',
        tools: [
          {
            name: 'bad_tool',
            description: 'Unsupported HTTP method',
            input_schema: {},
            endpoint: '/bad',
            method: 'TRACE',
          },
        ],
      }).success,
    ).toBe(false);
  });

  it('validates ACP checkout create, session (integer minor units), and complete payloads', () => {
    const createPayload = AcpCheckoutCreateSchema.parse({
      tenant_id: 'ten_01',
      line_items: [{ sku: 'KIT-BRAKE-01', qty: 2, selected_optional_skus: ['PAD-CERAMIC'] }],
      currency: 'INR',
      requested_discount_bps: 300,
      shipping_address: {
        country_code: 'IN',
        state_code: '29',
        postal_code: '560001',
        city: 'Bengaluru',
      },
    });
    expect(createPayload.requested_discount_bps).toBe(300);

    expect(
      AcpCheckoutCreateSchema.safeParse({
        tenant_id: 'ten_01',
        line_items: [{ sku: 'KIT-BRAKE-01', qty: 1 }],
        currency: 'INR',
        requested_discount_bps: 15000,
        shipping_address: { country_code: 'IN', postal_code: '560001' },
      }).success,
    ).toBe(false);

    const session = AcpCheckoutSessionSchema.parse({
      session_id: '550e8400-e29b-41d4-a716-446655440010',
      tenant_id: 'ten_01',
      agent_id: 'agent_shopping_01',
      currency: 'INR',
      line_items: [{ sku: 'KIT-BRAKE-01', qty: 2, unit_price_minor: 250_000 }],
      subtotal_minor: 500_000,
      discount_minor: 15_000,
      tax_minor: 87_300,
      total_minor: 572_300,
      status: 'OPEN',
      external_order_id: null,
      idempotency_key: null,
      created_at: '2026-11-25T11:40:00Z',
    });
    expect(session.status).toBe('OPEN');
    expect(session.total_minor).toBe(572_300);

    expect(
      AcpCheckoutSessionSchema.safeParse({
        ...session,
        total_minor: 5723.5,
      }).success,
    ).toBe(false);

    const complete = AcpCheckoutCompleteSchema.parse({
      payment_token: {
        provider: 'razorpay',
        token: 'pay_tok_xyz123',
        amount_minor: 572_300,
        currency: 'INR',
      },
      idempotency_key: 'idem-acp-001',
    });
    expect(complete.payment_token.provider).toBe('razorpay');

    expect(
      AcpCheckoutCompleteSchema.safeParse({
        payment_token: {
          provider: 'paypal',
          token: 'tok_1',
          amount_minor: 1000,
          currency: 'USD',
        },
        idempotency_key: 'idem-2',
      }).success,
    ).toBe(false);
  });

  it('validates KYA authentication headers for HMAC and Bearer JWT modes', () => {
    const hmacHeaders = KyaHeadersSchema.parse({
      'x-ziro-agent-id': 'agent_01',
      'x-ziro-timestamp': '1764070800',
      'x-ziro-agent-signature': 'deadbeefcafebabe',
    });
    expect(hmacHeaders['x-ziro-agent-id']).toBe('agent_01');

    const bearerHeaders = KyaHeadersSchema.parse({
      authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZ2VudF8wMSJ9.sig',
    });
    expect(bearerHeaders.authorization).toMatch(/^Bearer /);

    expect(
      KyaHeadersSchema.safeParse({
        'x-ziro-agent-id': 'agent_01',
        'x-ziro-timestamp': '1764070800',
      }).success,
    ).toBe(false);

    expect(KyaHeadersSchema.safeParse({ authorization: 'Basic 1234' }).success).toBe(false);
  });

  it('validates RTO Shield request and response contracts', () => {
    const req = RtoScoreRequestSchema.parse({
      tenant_id: 'ten_01',
      pincode: '560001',
      cart_value_inr: 4500,
      cod_orders_count: 3,
      rto_history_count: 1,
      address_score: 0.85,
      velocity_1h: 1,
    });
    expect(req.pincode).toBe('560001');

    expect(
      RtoScoreRequestSchema.safeParse({
        ...req,
        pincode: '56001',
      }).success,
    ).toBe(false);

    expect(
      RtoScoreRequestSchema.safeParse({
        ...req,
        address_score: 1.5,
      }).success,
    ).toBe(false);

    const res = RtoScoreResponseSchema.parse({
      risk_score: 0.78,
      risk_tier: 'HIGH',
      upi_nudge_discount_inr: 100,
      recommended_payment_modes: ['UPI', 'CARD', 'NETBANKING'],
      factors: ['rto_history_ratio', 'high_cod_ticket_size'],
    });
    expect(res.risk_tier).toBe('HIGH');
    expect(res.recommended_payment_modes).toContain('UPI');
  });

  it('validates ONDC Beckn context and request envelope', () => {
    const context = OndcBecknContextSchema.parse({
      domain: 'ONDC:RET10',
      country: 'IND',
      city: 'std:080',
      action: 'search',
      core_version: '1.2.0',
      bap_id: 'buyer-app.ondc.org',
      bap_uri: 'https://buyer-app.ondc.org/beckn',
      transaction_id: '550e8400-e29b-41d4-a716-446655440020',
      message_id: '550e8400-e29b-41d4-a716-446655440021',
      timestamp: '2026-11-25T11:40:00.000Z',
      ttl: 'PT30S',
    });
    expect(context.action).toBe('search');

    const req = OndcBecknRequestSchema.parse({
      context,
      message: {
        intent: {
          item: { descriptor: { name: 'Ceramic Brake Pads' } },
        },
      },
    });
    expect(req.context.domain).toBe('ONDC:RET10');

    expect(
      OndcBecknRequestSchema.safeParse({
        context: { ...context, action: 'invalid_action' },
        message: {},
      }).success,
    ).toBe(false);
  });

  it('re-exports schemas, gst, and agent contracts from the root barrel', () => {
    expect(ROOT_FEE_BPS).toBe(0);
    expect(RootUcpSchema).toBe(UcpDiscoveryManifestSchema);
    expect(MoneyMinorSchema.safeParse(100).success).toBe(true);
    expect(validateGstin('29ABCDE1234F1ZW').valid).toBe(true);
    expect(
      KyaHeadersSchema.safeParse({
        'x-ziro-agent-id': '   ',
        'x-ziro-timestamp': '1764070800',
        'x-ziro-agent-signature': 'sig',
      }).success,
    ).toBe(false);
  });
});
