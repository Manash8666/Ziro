import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import {
  ZIRO_PLATFORM_FEE_BPS,
  ZIRO_SAAS_PLANS,
  type ZiroPlanTier,
} from '@/lib/billing-plans';

export const runtime = 'nodejs';

const SubscribeRequestSchema = z.object({
  tenantId: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/),
  planTier: z.enum(['starter', 'growth', 'scale']),
  provider: z.enum(['razorpay', 'stripe']),
  customerEmail: z.string().email(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

function getProviderPlanOrPriceId(provider: 'razorpay' | 'stripe', tier: ZiroPlanTier): string {
  const envKey =
    provider === 'razorpay'
      ? `RAZORPAY_PLAN_${tier.toUpperCase()}`
      : `STRIPE_PRICE_${tier.toUpperCase()}`;
  const value = (process.env[envKey] ?? '').trim();
  if (!value) {
    throw new Error(`Missing ${envKey} environment configuration for ${provider} ${tier} plan`);
  }
  return value;
}

export async function handleSubscribePost(
  req: NextRequest | Request,
  fetchFn: typeof fetch = fetch
): Promise<NextResponse> {
  let rawJson: unknown;
  try {
    rawJson = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const parsed = SubscribeRequestSchema.safeParse(rawJson);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid subscription request', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { tenantId, planTier, provider, customerEmail } = parsed.data;
  const planDef = ZIRO_SAAS_PLANS[planTier];
  const cloudBaseUrl = (
    process.env.NEXT_PUBLIC_CLOUD_URL ?? 'https://cloud.ziro.build'
  ).replace(/\/+$/, '');
  const successUrl =
    parsed.data.successUrl ?? `${cloudBaseUrl}/billing?status=success&tenantId=${tenantId}`;
  const cancelUrl =
    parsed.data.cancelUrl ?? `${cloudBaseUrl}/billing?status=canceled&tenantId=${tenantId}`;

  try {
    const providerPlanId = getProviderPlanOrPriceId(provider, planTier);

    if (provider === 'razorpay') {
      const keyId = (process.env.RAZORPAY_KEY_ID ?? '').trim();
      const keySecret = (process.env.RAZORPAY_KEY_SECRET ?? '').trim();
      if (!keyId || !keySecret) {
        return NextResponse.json(
          { error: 'Razorpay credentials are not configured' },
          { status: 503 }
        );
      }

      const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
      const rzpRes = await fetchFn('https://api.razorpay.com/v1/subscriptions', {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_id: providerPlanId,
          total_count: 120,
          quantity: 1,
          customer_notify: 1,
          notes: {
            ziro_tenant_id: tenantId,
            ziro_plan_tier: planTier,
            ziro_platform_fee_bps: '0',
          },
        }),
      });

      const rzpData = (await rzpRes.json()) as {
        id?: string;
        short_url?: string;
        error?: { description?: string };
      };

      if (!rzpRes.ok || !rzpData.id) {
        return NextResponse.json(
          {
            error: rzpData.error?.description ?? `Razorpay subscription failed (${rzpRes.status})`,
          },
          { status: 502 }
        );
      }

      return NextResponse.json(
        {
          provider: 'razorpay',
          tenantId,
          planTier,
          subscriptionId: rzpData.id,
          checkoutUrl: rzpData.short_url ?? null,
          amountInrPaise: planDef.monthlyInrPaise,
          platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
        },
        { status: 201 }
      );
    }

    // Stripe Billing Checkout Session
    const stripeKey = (process.env.STRIPE_API_KEY ?? '').trim();
    if (!stripeKey) {
      return NextResponse.json(
        { error: 'Stripe credentials are not configured' },
        { status: 503 }
      );
    }

    const formParams = new URLSearchParams({
      mode: 'subscription',
      customer_email: customerEmail,
      client_reference_id: tenantId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      'line_items[0][price]': providerPlanId,
      'line_items[0][quantity]': '1',
      'metadata[ziro_tenant_id]': tenantId,
      'metadata[ziro_plan_tier]': planTier,
      'metadata[ziro_platform_fee_bps]': '0',
      'subscription_data[metadata][ziro_tenant_id]': tenantId,
      'subscription_data[metadata][ziro_plan_tier]': planTier,
      'subscription_data[metadata][ziro_platform_fee_bps]': '0',
    });

    const stripeRes = await fetchFn('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formParams.toString(),
    });

    const stripeData = (await stripeRes.json()) as {
      id?: string;
      url?: string;
      error?: { message?: string };
    };

    if (!stripeRes.ok || !stripeData.id) {
      return NextResponse.json(
        {
          error: stripeData.error?.message ?? `Stripe session failed (${stripeRes.status})`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        provider: 'stripe',
        tenantId,
        planTier,
        checkoutSessionId: stripeData.id,
        checkoutUrl: stripeData.url ?? null,
        amountUsdCents: planDef.monthlyUsdCents,
        platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Subscription creation error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handleSubscribePost(req);
}
