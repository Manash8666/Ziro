import crypto from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { ZIRO_PLATFORM_FEE_BPS } from '@ziro/shared-types';
import {
  InMemoryTenantStore,
  TenantContextError,
  TenantContextResolver,
} from '../tenancy/index.js';
import {
  InMemoryNet30CreditStore,
  InMemoryWebhookEventStore,
  WebhookEventDeduplicator,
  ZiroNet30Provider,
  ZiroRazorpayProvider,
  ZiroStripeProvider,
  verifyRazorpayWebhook,
  verifyStripeWebhook,
} from '../providers/index.js';

function signRazorpay(rawBody: string | Buffer, secret: string): string {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

function signStripe(
  rawBody: string | Buffer,
  secret: string,
  timestampSec: number,
): string {
  const payload = Buffer.concat([
    Buffer.from(`${timestampSec}.`, 'utf8'),
    Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8'),
  ]);
  const v1 = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `t=${timestampSec},v1=${v1}`;
}

describe('TenantContextResolver', () => {
  it('resolves single-tenant fallback and env gateway secrets while rejecting mismatched bodyTenantId', async () => {
    const store = new InMemoryTenantStore();
    const resolver = new TenantContextResolver({
      store,
      defaultMode: 'single',
      defaultTenantId: 'default',
      env: {
        TENANCY_MODE: 'single',
        DEFAULT_TENANT_ID: 'default',
        RAZORPAY_KEY_ID: 'rzp_test_single_123',
        RAZORPAY_KEY_SECRET: 'rzp_secret_single_123',
        RAZORPAY_WEBHOOK_SECRET: 'whsec_rzp_single_123',
        STRIPE_API_KEY: 'sk_test_single_123',
        STRIPE_WEBHOOK_SECRET: 'whsec_stripe_single_123',
      },
    });

    const ctx = await resolver.resolveFromRequest({
      host: 'localhost:9000',
      bodyTenantId: 'default',
    });

    expect(ctx.tenant_id).toBe('default');
    expect(ctx.mode).toBe('single');
    expect(ctx.medusa_store_id).toBeTruthy();
    expect(ctx.medusa_sales_channel_id).toBeTruthy();

    const rzpSecrets = await resolver.resolveGatewaySecrets(
      ctx.tenant_id,
      'razorpay',
      'single',
    );
    expect(rzpSecrets).toMatchObject({
      tenant_id: 'default',
      provider: 'razorpay',
      key_id: 'rzp_test_single_123',
      api_secret: 'rzp_secret_single_123',
      webhook_secret: 'whsec_rzp_single_123',
      source: 'env',
    });

    await expect(
      resolver.resolveFromRequest({
        mode: 'single',
        bodyTenantId: 'other-tenant',
      }),
    ).rejects.toBeInstanceOf(TenantContextError);
  });

  it('derives authoritative tenant in multi-tenant mode and rejects bodyTenantId spoofing', async () => {
    const store = new InMemoryTenantStore({
      tenants: [
        {
          tenant_id: 'tenant_alpha',
          slug: 'alpha',
          primary_domain: 'alpha.ziro.test',
          mode: 'multi',
          medusa_store_id: 'store_alpha',
          medusa_sales_channel_id: 'sc_alpha',
          pos_conflict_policy: 'FORCE_SALE_WITH_ALERT',
          origin_state_code: '27',
          min_margin_bps: 1500,
          currency_code: 'INR',
        },
        {
          tenant_id: 'tenant_beta',
          slug: 'beta',
          primary_domain: 'beta.ziro.test',
          mode: 'multi',
          medusa_store_id: 'store_beta',
          medusa_sales_channel_id: 'sc_beta',
          pos_conflict_policy: 'STRICT_REJECT',
          origin_state_code: '29',
          min_margin_bps: 2000,
          currency_code: 'INR',
        },
      ],
      gatewayConfigs: [
        {
          tenant_id: 'tenant_alpha',
          provider: 'razorpay',
          key_id: 'rzp_test_alpha',
          secret_ciphertext: 'rzp_sec_alpha',
          webhook_secret_ciphertext: 'whsec_alpha',
          is_active: true,
        },
      ],
    });

    const resolver = new TenantContextResolver({
      store,
      defaultMode: 'multi',
      env: {
        RAZORPAY_KEY_ID: 'rzp_global_should_not_leak',
        RAZORPAY_WEBHOOK_SECRET: 'whsec_global_should_not_leak',
      },
    });

    const byHost = await resolver.resolveFromRequest({
      mode: 'multi',
      host: 'ALPHA.ziro.test:443',
    });
    expect(byHost.tenant_id).toBe('tenant_alpha');
    expect(byHost.medusa_store_id).toBe('store_alpha');

    const byJwt = await resolver.resolveFromRequest({
      mode: 'multi',
      authTenantId: 'tenant_beta',
      bodyTenantId: 'tenant_beta',
    });
    expect(byJwt.tenant_id).toBe('tenant_beta');

    // Spoofed bodyTenantId rejected when host or JWT says another tenant
    await expect(
      resolver.resolveFromRequest({
        mode: 'multi',
        host: 'alpha.ziro.test',
        bodyTenantId: 'tenant_beta',
      }),
    ).rejects.toBeInstanceOf(TenantContextError);

    await expect(
      resolver.resolveFromRequest({
        mode: 'multi',
        authTenantId: 'tenant_alpha',
        bodyTenantId: 'tenant_beta',
      }),
    ).rejects.toBeInstanceOf(TenantContextError);

    // Body-only tenant selection must be rejected in multi mode
    await expect(
      resolver.resolveFromRequest({
        mode: 'multi',
        bodyTenantId: 'tenant_beta',
      }),
    ).rejects.toBeInstanceOf(TenantContextError);

    // Gateway secrets isolated per tenant in multi mode (no .env leakage)
    const alphaSecrets = await resolver.resolveGatewaySecrets(
      'tenant_alpha',
      'razorpay',
      'multi',
    );
    expect(alphaSecrets?.webhook_secret).toBe('whsec_alpha');
    expect(alphaSecrets?.source).toBe('tenant_config');

    const betaSecrets = await resolver.resolveGatewaySecrets(
      'tenant_beta',
      'razorpay',
      'multi',
    );
    expect(betaSecrets).toBeNull();
  });
});

describe('Webhook verification and idempotent deduplication', () => {
  it('verifies Razorpay raw-body HMAC and fails closed on 1-byte tampering', () => {
    const secret = 'rzp_webhook_secret_test';
    const rawBody = JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_123', amount: 150000 } } },
    });
    const validSig = signRazorpay(rawBody, secret);

    expect(verifyRazorpayWebhook(rawBody, validSig, secret)).toBe(true);
    expect(verifyRazorpayWebhook(Buffer.from(rawBody, 'utf8'), validSig, secret)).toBe(
      true,
    );

    // 1-byte tamper in amount (150000 -> 150001)
    const tamperedBody = rawBody.replace('150000', '150001');
    expect(verifyRazorpayWebhook(tamperedBody, validSig, secret)).toBe(false);
    expect(verifyRazorpayWebhook(rawBody, `${validSig.slice(0, -1)}0`, secret)).toBe(
      false,
    );
    expect(verifyRazorpayWebhook(rawBody, '', secret)).toBe(false);
    expect(verifyRazorpayWebhook(rawBody, validSig, '')).toBe(false);
  });

  it('verifies Stripe raw-body HMAC + tolerance window and rejects tampered or expired payloads', () => {
    const secret = 'whsec_test_stripe_secret';
    const rawBody = JSON.stringify({
      id: 'evt_stripe_001',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_001', amount: 4200 } },
    });
    const nowSec = 1_764_000_000;
    const header = signStripe(rawBody, secret, nowSec);

    expect(verifyStripeWebhook(rawBody, header, secret, 300, nowSec + 120)).toBe(
      true,
    );

    // 1-byte tamper
    const tamperedBody = rawBody.replace('4200', '4201');
    expect(
      verifyStripeWebhook(tamperedBody, header, secret, 300, nowSec + 10),
    ).toBe(false);

    // Replay window expired (301s > 300s)
    expect(verifyStripeWebhook(rawBody, header, secret, 300, nowSec + 301)).toBe(
      false,
    );
    expect(verifyStripeWebhook(rawBody, 'v1=deadbeef', secret, 300, nowSec)).toBe(
      false,
    );
  });

  it('deduplicates repeated external_event_id per (tenant, provider) without re-running handler', async () => {
    const store = new InMemoryWebhookEventStore();
    const deduplicator = new WebhookEventDeduplicator(store);
    const handler = vi.fn(async () => ({ processed: true }));
    const payloadHash = crypto
      .createHash('sha256')
      .update('{"id":"evt_1"}')
      .digest('hex');

    const first = await deduplicator.processIdempotently(
      'tenant_alpha',
      'razorpay',
      'evt_1',
      payloadHash,
      handler,
    );
    expect(first).toEqual({ duplicate: false, result: { processed: true } });
    expect(handler).toHaveBeenCalledTimes(1);

    const second = await deduplicator.processIdempotently(
      'tenant_alpha',
      'razorpay',
      'evt_1',
      payloadHash,
      handler,
    );
    expect(second.duplicate).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);

    // Different tenant with same event ID should still process cleanly
    const otherTenant = await store.processIdempotently(
      'tenant_beta',
      'razorpay',
      'evt_1',
      payloadHash,
      handler,
    );
    expect(otherTenant.duplicate).toBe(false);
    expect(handler).toHaveBeenCalledTimes(2);
  });
});

describe('ZiroRazorpayProvider & ZiroStripeProvider', () => {
  it('ZiroRazorpayProvider enforces platform_fee_bps=0, supports upi_intent, and runs deterministic sandbox mode', async () => {
    const provider = new ZiroRazorpayProvider({
      key_id: 'rzp_test_sandbox_001',
      key_secret: 'rzp_test_secret_001',
      webhook_secret: 'whsec_test_001',
    });

    expect(ZiroRazorpayProvider.identifier).toBe('ziro-razorpay');

    const initiated = await provider.initiatePayment({
      amount: 149900,
      currency_code: 'INR',
      data: {
        payment_method: 'upi_intent',
        vpa: 'buyer@okaxis',
        receipt: 'rcpt_001',
      },
      context: {
        idempotency_key: 'idem_rzp_001',
      },
    });

    expect(initiated.id).toMatch(/^order_rzp_/);
    expect(initiated.data?.platform_fee_bps).toBe(ZIRO_PLATFORM_FEE_BPS);
    expect(initiated.data?.platform_fee_bps).toBe(0);
    expect(initiated.data?.mode).toBe('sandbox');
    expect(initiated.data?.amount_minor).toBe(149900);
    expect(initiated.data?.upi_intent).toMatchObject({
      enabled: true,
      intent_uri: expect.stringContaining('upi://pay'),
    });

    const authorized = await provider.authorizePayment({
      data: initiated.data,
    });
    expect(authorized.status).toBe('authorized');
    expect(authorized.data?.platform_fee_bps).toBe(0);

    const captured = await provider.capturePayment({
      data: authorized.data,
    });
    expect(captured.data?.status).toBe('captured');
    expect(captured.data?.platform_fee_bps).toBe(0);

    await expect(
      provider.initiatePayment({
        amount: 149.99,
        currency_code: 'INR',
        data: {},
      }),
    ).rejects.toThrow();
  });

  it('ZiroStripeProvider enforces platform_fee_bps=0 and multi-currency PaymentIntent handling in sandbox mode', async () => {
    const provider = new ZiroStripeProvider({
      api_key: 'sk_test_sandbox_001',
      webhook_secret: 'whsec_stripe_sandbox_001',
    });

    expect(ZiroStripeProvider.identifier).toBe('ziro-stripe');

    const initiated = await provider.initiatePayment({
      amount: 4599,
      currency_code: 'USD',
      data: {
        capture_method: 'automatic',
      },
      context: {
        idempotency_key: 'idem_stripe_001',
      },
    });

    expect(initiated.id).toMatch(/^pi_ziro_/);
    expect(initiated.data?.platform_fee_bps).toBe(0);
    expect(initiated.data?.currency_code).toBe('USD');
    expect(initiated.data?.amount_minor).toBe(4599);
    expect(initiated.data?.mode).toBe('sandbox');

    const captured = await provider.capturePayment({
      data: initiated.data,
    });
    expect(captured.data?.status).toBe('succeeded');
    expect(captured.data?.platform_fee_bps).toBe(0);
  });
});

describe('ZiroNet30Provider', () => {
  it('authorizes within B2bAccount available credit and rejects when credit limit is exceeded or account inactive', async () => {
    const creditStore = new InMemoryNet30CreditStore([
      {
        account_id: '550e8400-e29b-41d4-a716-446655440010',
        tenant_id: 'tenant_alpha',
        company_name: 'Apex Auto Spares Pvt Ltd',
        tax_id: '29ABCDE1234F1ZW',
        tax_id_type: 'GSTIN',
        credit_limit_minor: 500_000,
        credit_used_minor: 200_000,
        net_terms_days: 30,
        status: 'ACTIVE',
      },
      {
        account_id: '550e8400-e29b-41d4-a716-446655440099',
        tenant_id: 'tenant_alpha',
        company_name: 'Hold Co',
        tax_id: '27ABCDE1234F1Z0',
        tax_id_type: 'GSTIN',
        credit_limit_minor: 500_000,
        credit_used_minor: 0,
        net_terms_days: 30,
        status: 'ON_HOLD',
      },
    ]);

    const provider = new ZiroNet30Provider({ creditStore });
    expect(ZiroNet30Provider.identifier).toBe('ziro-net30');

    // Available credit is 300_000 -> 250_000 succeeds
    const initiated = await provider.initiatePayment({
      amount: 250_000,
      currency_code: 'INR',
      data: {
        account_id: '550e8400-e29b-41d4-a716-446655440010',
        reference_id: 'quote_001',
      },
    });
    expect(initiated.data?.platform_fee_bps).toBe(0);

    const authorized = await provider.authorizePayment({
      data: initiated.data,
    });
    expect(authorized.status).toBe('authorized');
    expect(authorized.data?.platform_fee_bps).toBe(0);

    // Remaining available credit is now 50_000 -> 100_000 must fail
    const overLimitInit = await provider.initiatePayment({
      amount: 100_000,
      currency_code: 'INR',
      data: {
        account_id: '550e8400-e29b-41d4-a716-446655440010',
        reference_id: 'quote_002',
      },
    });
    await expect(
      provider.authorizePayment({ data: overLimitInit.data }),
    ).rejects.toThrow(/credit/i);

    // ON_HOLD account must fail
    const holdInit = await provider.initiatePayment({
      amount: 10_000,
      currency_code: 'INR',
      data: {
        account_id: '550e8400-e29b-41d4-a716-446655440099',
        reference_id: 'quote_003',
      },
    });
    await expect(
      provider.authorizePayment({ data: holdInit.data }),
    ).rejects.toThrow(/status|hold|active/i);
  });
});
