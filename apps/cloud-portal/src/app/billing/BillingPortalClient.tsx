'use client';

import React, { useMemo, useState } from 'react';
import {
  DUNNING_GRACE_PERIOD_DAYS,
  ZIRO_PLATFORM_FEE_BPS,
  ZIRO_SAAS_PLANS,
  type BillingProvider,
  type TenantBillingStatus,
  type ZiroPlanTier,
} from '@/lib/billing-plans';

export type BillingCurrency = 'INR' | 'USD';

export interface InitialTenantBillingSnapshot {
  tenantId: string;
  displayName: string;
  customDomain: string | null;
  planTier: ZiroPlanTier;
  billingStatus: TenantBillingStatus;
  billingProvider: BillingProvider | null;
  currentPeriodEnd: string | null;
  gracePeriodEndsAt: string | null;
  isDemoSandbox: boolean;
  platformFeeBps: typeof ZIRO_PLATFORM_FEE_BPS;
}

export interface SubscribeCheckoutResponse {
  provider: BillingProvider;
  tenantId: string;
  planTier: ZiroPlanTier;
  subscriptionId?: string;
  checkoutSessionId?: string;
  checkoutUrl: string | null;
  amountInrPaise?: number;
  amountUsdCents?: number;
  platformFeeBps: typeof ZIRO_PLATFORM_FEE_BPS;
}

export function currencyToBillingProvider(currency: BillingCurrency): BillingProvider {
  return currency === 'INR' ? 'razorpay' : 'stripe';
}

export function formatPlanMonthlyPrice(tier: ZiroPlanTier, currency: BillingCurrency): string {
  if (tier === 'enterprise') {
    return 'Custom';
  }
  const plan = ZIRO_SAAS_PLANS[tier];
  if (currency === 'INR') {
    const inr = Math.round(plan.monthlyInrPaise / 100);
    return `₹${inr.toLocaleString('en-IN')}`;
  }
  const usd = Math.round(plan.monthlyUsdCents / 100);
  return `$${usd.toLocaleString('en-US')}`;
}

export function computeGraceDaysRemaining(
  gracePeriodEndsAt: string | null,
  nowMs: number = Date.now()
): number | null {
  if (!gracePeriodEndsAt) return null;
  const expiryMs = Date.parse(gracePeriodEndsAt);
  if (!Number.isFinite(expiryMs)) return null;
  const diffMs = expiryMs - nowMs;
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / 86_400_000);
}

const PLAN_HIGHLIGHTS: Record<ZiroPlanTier, string[]> = {
  starter: [
    'Full Medusa v2 Commerce Core + Next.js 16 Storefront',
    'Native Indian GST (CGST/SGST/IGST) + Stripe Global Checkout',
    'UCP, ACP & WebMCP AI Shopping Agent Endpoints',
    '0% GMV Transaction Tax — Keep 100% of Revenue',
  ],
  growth: [
    'Everything in Starter + Automotive Fitment & BOM Kits',
    'AI COD-RTO Shield (@ziro/pulse) with UPI Nudges',
    'B2B Wholesale Price Lists & Net-30 Credit Ledgers',
    '0% GMV Transaction Tax — Keep 100% of Revenue',
  ],
  scale: [
    'Everything in Growth + Three.js 3D Product Configurator',
    'ONDC Seller-Node Interoperability & Automated e-Way Bills',
    'Dedicated pgvector HNSW Semantic Search Cluster',
    '0% GMV Transaction Tax — Keep 100% of Revenue',
  ],
  enterprise: [
    'Dedicated Single-Tenant PostgreSQL 17 + Valkey Cluster',
    'Custom SLA, Multi-Warehouse & ERP Webhook Bridges',
    'White-Labeled POS PWA & Custom Domain Fleet',
    '0% GMV Transaction Tax — Contractual Lock',
  ],
};

export function BillingPortalClient({
  initialTenant,
  checkoutRedirectStatus = null,
  onRedirect = (url: string) => {
    window.location.assign(url);
  },
}: {
  initialTenant: InitialTenantBillingSnapshot;
  checkoutRedirectStatus?: 'success' | 'canceled' | null;
  onRedirect?: (url: string) => void;
}) {
  const [currency, setCurrency] = useState<BillingCurrency>(() =>
    initialTenant.billingProvider === 'stripe' ? 'USD' : 'INR'
  );
  const [tenantId, setTenantId] = useState(initialTenant.tenantId);
  const [customerEmail, setCustomerEmail] = useState('billing@motofit2.in');
  const [activeTierLoading, setActiveTierLoading] = useState<ZiroPlanTier | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [checkoutSession, setCheckoutSession] = useState<SubscribeCheckoutResponse | null>(null);

  // Interactive GMV Savings Preview
  const [monthlyGmv, setMonthlyGmv] = useState<number>(2_500_000); // ₹25L or $25k default

  const provider = currencyToBillingProvider(currency);
  const graceDaysLeft = useMemo(
    () => computeGraceDaysRemaining(initialTenant.gracePeriodEndsAt),
    [initialTenant.gracePeriodEndsAt]
  );

  const estimatedCompetitorTax = useMemo(() => {
    // Compare against standard 2.0% GMV platform fee charged by legacy SaaS
    return Math.round(monthlyGmv * 0.02);
  }, [monthlyGmv]);

  const handleSubscribe = async (planTier: 'starter' | 'growth' | 'scale') => {
    setErrorMsg(null);
    setCheckoutSession(null);

    if (!tenantId.trim() || tenantId.trim().length < 3) {
      setErrorMsg('Enter a valid Tenant ID (at least 3 alphanumeric characters).');
      return;
    }

    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      setErrorMsg('Enter a valid billing contact email address.');
      return;
    }

    setActiveTierLoading(planTier);

    try {
      const res = await fetch('/api/v1/billing/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ziro-Tenant-Id': tenantId.trim(),
        },
        body: JSON.stringify({
          tenantId: tenantId.trim(),
          planTier,
          provider,
          customerEmail: customerEmail.trim(),
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || `Subscription initialization failed (HTTP ${res.status})`);
      }

      const data = payload as SubscribeCheckoutResponse;
      if (data.platformFeeBps !== ZIRO_PLATFORM_FEE_BPS) {
        throw new Error('Security invariant error: non-zero platformFeeBps returned.');
      }

      setCheckoutSession(data);

      if (data.checkoutUrl) {
        onRedirect(data.checkoutUrl);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to start subscription checkout.');
    } finally {
      setActiveTierLoading(null);
    }
  };

  const orderedTiers: ZiroPlanTier[] = ['starter', 'growth', 'scale', 'enterprise'];

  return (
    <div className="mx-auto max-w-6xl space-y-6 text-[#F4F6F9]">
      {/* 1. Checkout Redirect Status Banner */}
      {checkoutRedirectStatus === 'success' && (
        <div className="rounded-xl border border-[#00E599]/50 bg-[#00E599]/10 p-4 text-sm text-[#00E599]">
          <strong>Subscription Confirmed:</strong> Your payment mandate was received. Webhook
          reconciliation will activate your upgraded entitlements within seconds—with{' '}
          <span className="font-mono font-semibold">0% GMV tax</span> locked.
        </div>
      )}

      {checkoutRedirectStatus === 'canceled' && (
        <div className="rounded-xl border border-[#F59E0B]/50 bg-[#F59E0B]/10 p-4 text-sm text-[#F59E0B]">
          <strong>Checkout Canceled:</strong> No charges were made. Your existing tenant state and{' '}
          <span className="font-mono">0% GMV fee</span> remain unchanged.
        </div>
      )}

      {/* 2. Dunning / Lifecycle State Banner */}
      {initialTenant.billingStatus === 'past_due' && (
        <div
          role="alert"
          className="flex flex-col justify-between gap-4 rounded-xl border border-[#F59E0B]/60 bg-[#F59E0B]/15 p-5 sm:flex-row sm:items-center"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase text-[#F59E0B]">
              <span>ACTION REQUIRED • DUNNING GRACE PERIOD ACTIVE</span>
            </div>
            <p className="text-sm text-[#F4F6F9]">
              Your last subscription renewal failed. Your storefront and Caddy TLS certificate remain
              online during the <strong>{DUNNING_GRACE_PERIOD_DAYS}-day grace window</strong>
              {graceDaysLeft !== null ? (
                <>
                  {' '}
                  (<span className="font-mono text-[#F59E0B]">{graceDaysLeft} day(s) remaining</span>
                  )
                </>
              ) : null}
              . Renew below to avoid automatic suspension.
            </p>
          </div>
          <button
            type="button"
            disabled={activeTierLoading !== null}
            onClick={() =>
              handleSubscribe(
                initialTenant.planTier === 'enterprise' ? 'scale' : initialTenant.planTier
              )
            }
            className="shrink-0 rounded-lg bg-[#F59E0B] px-4 py-2.5 text-xs font-semibold text-[#090B0E] transition hover:brightness-110"
          >
            Resolve Payment Now
          </button>
        </div>
      )}

      {(initialTenant.billingStatus === 'suspended' ||
        initialTenant.billingStatus === 'canceled') && (
        <div
          role="alert"
          className="flex flex-col justify-between gap-4 rounded-xl border border-red-500/60 bg-red-950/40 p-5 sm:flex-row sm:items-center"
        >
          <div className="space-y-1">
            <span className="font-mono text-xs font-semibold uppercase text-red-400">
              SUBSCRIPTION {initialTenant.billingStatus.toUpperCase()} • EDGE ROUTING PAUSED
            </span>
            <p className="text-sm text-slate-200">
              Caddy On-Demand TLS custom domain routing is currently paused for{' '}
              <code className="font-mono text-xs text-white">{initialTenant.tenantId}</code>.
              Select any flat-rate tier below to restore live traffic immediately.
            </p>
          </div>
        </div>
      )}

      {initialTenant.isDemoSandbox && (
        <div className="rounded-xl border border-[#F59E0B]/40 bg-[#12161E] p-4 font-mono text-xs text-[#F59E0B]">
          [SANDBOX NOTICE] Tenant &ldquo;{initialTenant.tenantId}&rdquo; is a read-only public demo
          sandbox. Switch to your live tenant ID below to initiate a real Razorpay or Stripe
          subscription.
        </div>
      )}

      {/* 3. Top Control Bar: Tenant Context, 0% GMV Guarantee & Currency Toggle */}
      <div className="rounded-2xl border border-[#1F2633] bg-[#12161E] p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-block h-2 w-2 rounded-full bg-[#00E599]" />
              <span className="font-mono text-xs uppercase tracking-wider text-[#00E599]">
                Ziro Cloud Billing • Flat-Rate SaaS
              </span>
              <span className="rounded-md border border-[#00E599]/40 bg-[#00E599]/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-[#00E599]">
                0% GMV TAX GUARANTEED (BPS: {ZIRO_PLATFORM_FEE_BPS})
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              Predictable Infrastructure Pricing. Zero Revenue Penalties.
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Scale across D2C, B2B wholesale, offline POS, and AI shopping agents without ever
              paying a percentage of your sales.
            </p>
          </div>

          {/* INR / USD Currency & Gateway Switcher */}
          <div className="flex flex-col items-start gap-1.5 lg:items-end">
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
              Billing Currency &amp; Rail
            </span>
            <div className="inline-flex rounded-xl border border-[#1F2633] bg-[#090B0E] p-1">
              <button
                type="button"
                onClick={() => setCurrency('INR')}
                className={`rounded-lg px-4 py-2 font-mono text-xs font-semibold transition ${
                  currency === 'INR'
                    ? 'bg-[#00E599] text-[#090B0E]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                INR (₹) • Razorpay
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`rounded-lg px-4 py-2 font-mono text-xs font-semibold transition ${
                  currency === 'USD'
                    ? 'bg-[#00E599] text-[#090B0E]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                USD ($) • Stripe
              </button>
            </div>
          </div>
        </div>

        {/* Tenant ID, Billing Email & Current Lifecycle Status Strip */}
        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-[#1F2633] pt-5 sm:grid-cols-3">
          <div>
            <label
              htmlFor="billing-tenant-id"
              className="mb-1 block font-mono text-[11px] uppercase text-slate-400"
            >
              Tenant ID
            </label>
            <input
              id="billing-tenant-id"
              type="text"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="w-full rounded-lg border border-[#1F2633] bg-[#090B0E] px-3 py-2 font-mono text-sm text-[#F4F6F9] focus:border-[#00E599] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="billing-customer-email"
              className="mb-1 block font-mono text-[11px] uppercase text-slate-400"
            >
              Invoice &amp; Mandate Email
            </label>
            <input
              id="billing-customer-email"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full rounded-lg border border-[#1F2633] bg-[#090B0E] px-3 py-2 font-mono text-sm text-[#F4F6F9] focus:border-[#00E599] focus:outline-none"
            />
          </div>

          <div className="flex flex-col justify-between rounded-lg border border-[#1F2633] bg-[#090B0E] px-3.5 py-2">
            <span className="font-mono text-[11px] uppercase text-slate-400">
              Current Plan &amp; State
            </span>
            <div className="mt-1 flex items-center justify-between font-mono text-xs">
              <span className="font-semibold uppercase text-[#F4F6F9]">
                {initialTenant.planTier}
              </span>
              <span
                className={`rounded px-2 py-0.5 uppercase ${
                  initialTenant.billingStatus === 'active' ||
                  initialTenant.billingStatus === 'trialing'
                    ? 'bg-[#00E599]/15 text-[#00E599]'
                    : initialTenant.billingStatus === 'past_due'
                      ? 'bg-[#F59E0B]/15 text-[#F59E0B]'
                      : 'bg-red-500/15 text-red-400'
                }`}
              >
                {initialTenant.billingStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error & Active Checkout Session Callouts */}
      {errorMsg && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/30 p-4 font-mono text-xs text-red-300">
          [BILLING ERROR] {errorMsg}
        </div>
      )}

      {checkoutSession && (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-[#00E599]/50 bg-[#12161E] p-4 sm:flex-row sm:items-center">
          <div className="space-y-0.5 font-mono text-xs">
            <div className="text-[#00E599]">
              [SESSION READY] {checkoutSession.provider.toUpperCase()} •{' '}
              {checkoutSession.subscriptionId ?? checkoutSession.checkoutSessionId}
            </div>
            <div className="text-slate-400">
              Plan: {checkoutSession.planTier.toUpperCase()} • Platform GMV Fee:{' '}
              {checkoutSession.platformFeeBps} bps
            </div>
          </div>
          {checkoutSession.checkoutUrl && (
            <a
              href={checkoutSession.checkoutUrl}
              className="rounded-lg bg-[#00E599] px-4 py-2 text-center font-mono text-xs font-semibold text-[#090B0E] hover:brightness-110"
            >
              Complete {checkoutSession.provider === 'razorpay' ? 'Razorpay' : 'Stripe'} Mandate →
            </a>
          )}
        </div>
      )}

      {/* 4. Four Plan Entitlement Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {orderedTiers.map((tier) => {
          const plan = ZIRO_SAAS_PLANS[tier];
          const isCurrentPlan = initialTenant.planTier === tier;
          const isPopular = tier === 'growth';
          const isLoadingThis = activeTierLoading === tier;

          return (
            <section
              key={tier}
              className={`flex flex-col justify-between rounded-2xl border p-5 transition ${
                isPopular
                  ? 'border-[#00E599] bg-[#12161E] shadow-[0_0_30px_-12px_rgba(0,229,153,0.35)]'
                  : 'border-[#1F2633] bg-[#12161E]'
              }`}
            >
              <div className="space-y-4">
                {/* Tier Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-[#F4F6F9]">{plan.name}</h2>
                  {isPopular ? (
                    <span className="rounded-full bg-[#00E599] px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase text-[#090B0E]">
                      MOST POPULAR
                    </span>
                  ) : isCurrentPlan ? (
                    <span className="rounded-full border border-[#1F2633] bg-[#090B0E] px-2.5 py-0.5 font-mono text-[10px] uppercase text-slate-300">
                      CURRENT
                    </span>
                  ) : null}
                </div>

                {/* Price & 0% GMV Badge */}
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-3xl font-bold text-[#F4F6F9] tabular-nums">
                      {formatPlanMonthlyPrice(tier, currency)}
                    </span>
                    {tier !== 'enterprise' && (
                      <span className="font-mono text-xs text-slate-400">/ month</span>
                    )}
                  </div>
                  <div className="mt-1.5 inline-block rounded border border-[#00E599]/30 bg-[#00E599]/10 px-2 py-0.5 font-mono text-[11px] text-[#00E599]">
                    + {currency === 'INR' ? '₹0' : '$0'} GMV Fee (0%)
                  </div>
                </div>

                {/* Hard Quota Entitlements */}
                <div className="space-y-2 rounded-xl border border-[#1F2633] bg-[#090B0E] p-3 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Custom Domains</span>
                    <span className="font-semibold text-[#F4F6F9] tabular-nums">
                      {plan.maxCustomDomains}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Offline POS Seats</span>
                    <span className="font-semibold text-[#F4F6F9] tabular-nums">
                      {plan.maxPosTerminals}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pulse AI Queries/mo</span>
                    <span className="font-semibold text-[#F4F6F9] tabular-nums">
                      {plan.monthlyPulseAgentQueries.toLocaleString('en-US')}
                    </span>
                  </div>
                </div>

                {/* Feature List */}
                <ul className="space-y-2 text-xs text-slate-300">
                  {PLAN_HIGHLIGHTS[tier].map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-0.5 font-mono text-[#00E599]">✓</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action CTA */}
              <div className="mt-6 pt-2">
                {tier === 'enterprise' ? (
                  <a
                    href="mailto:enterprise@ziro.build?subject=Ziro%20Enterprise%20Architecture"
                    className="block w-full rounded-xl border border-[#1F2633] bg-[#090B0E] py-2.5 text-center font-mono text-xs font-semibold text-[#F4F6F9] transition hover:border-[#00E599]"
                  >
                    Contact Hybrid StudioZ →
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled={activeTierLoading !== null}
                    onClick={() => handleSubscribe(tier)}
                    className={`w-full rounded-xl py-2.5 font-mono text-xs font-semibold transition disabled:opacity-50 ${
                      isPopular
                        ? 'bg-[#00E599] text-[#090B0E] hover:brightness-110'
                        : 'border border-[#1F2633] bg-[#090B0E] text-[#F4F6F9] hover:border-[#00E599] hover:text-[#00E599]'
                    }`}
                  >
                    {isLoadingThis
                      ? `Connecting ${currency === 'INR' ? 'Razorpay' : 'Stripe'}...`
                      : `Subscribe (${currency === 'INR' ? 'Razorpay' : 'Stripe'})`}
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* 5. Interactive 0% GMV Tax Savings Guarantee Strip */}
      <div className="rounded-2xl border border-[#1F2633] bg-[#12161E] p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="space-y-1">
            <span className="font-mono text-xs uppercase tracking-wider text-[#00E599]">
              THE ZIRO 0% GMV TAX GUARANTEE
            </span>
            <h3 className="text-base font-semibold">
              Calculate Your Monthly GMV Tax Savings vs. 2.0% Legacy Platform Fees
            </h3>
            <p className="text-xs text-slate-400">
              Enforced at the PostgreSQL schema level (
              <code className="font-mono text-slate-200">CHECK (platform_fee_bps = 0)</code>) and
              published in every store&apos;s <code className="font-mono text-slate-200">/.well-known/ucp</code> manifest.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[#1F2633] bg-[#090B0E] p-4">
            <div>
              <label
                htmlFor="gmv-savings-input"
                className="block font-mono text-[11px] uppercase text-slate-400"
              >
                Monthly Store GMV ({currency})
              </label>
              <input
                id="gmv-savings-input"
                type="number"
                min={0}
                step={currency === 'INR' ? 100000 : 1000}
                value={monthlyGmv}
                onChange={(e) => setMonthlyGmv(Math.max(0, Number(e.target.value) || 0))}
                className="mt-1 w-40 rounded border border-[#1F2633] bg-[#12161E] px-2.5 py-1.5 font-mono text-sm text-[#F4F6F9] tabular-nums focus:border-[#00E599] focus:outline-none"
              />
            </div>

            <div className="border-l border-[#1F2633] pl-4">
              <div className="font-mono text-[11px] uppercase text-slate-400">
                Saved Every Month
              </div>
              <div className="mt-1 font-mono text-xl font-bold text-[#00E599] tabular-nums">
                {currency === 'INR'
                  ? `₹${estimatedCompetitorTax.toLocaleString('en-IN')}`
                  : `$${estimatedCompetitorTax.toLocaleString('en-US')}`}
                <span className="ml-1 text-xs font-normal text-slate-400">/ mo</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
