'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ZIRO_PLATFORM_FEE_BPS,
  ZIRO_SAAS_PLANS,
  type TenantBillingStatus,
} from '@/lib/billing-plans';

export type SelfServePlanTier = 'starter' | 'growth' | 'scale';
export type WizardCurrency = 'INR' | 'USD';

export interface LiveEndpointPreview {
  effectiveSlug: string;
  tenantId: string;
  primaryHost: string;
  storefrontUrl: string;
  defaultSubdomainUrl: string;
  posUrl: string;
  ucpManifestUrl: string;
  requiresDnsCname: boolean;
}

export interface ProvisionedTenantPayload {
  status: 'provisioned';
  tenant: {
    tenantId: string;
    slug: string;
    displayName: string;
    ownerEmail: string;
    customDomain: string | null;
    planTier: SelfServePlanTier;
    billingStatus: TenantBillingStatus;
    trialDays: number;
    trialEndsAt: string;
    isDemoSandbox: boolean;
    readOnlyCatalog: boolean;
    platformFeeBps: typeof ZIRO_PLATFORM_FEE_BPS;
  };
  endpoints: {
    storefrontUrl: string;
    defaultSubdomainUrl: string;
    posUrl: string;
    cloudBillingUrl: string;
    ucpManifestUrl: string;
  };
  entitlements: {
    tier: SelfServePlanTier;
    name: string;
    monthlyUsdCents: number;
    monthlyInrPaise: number;
    maxCustomDomains: number;
    maxPosTerminals: number;
    monthlyPulseAgentQueries: number;
    platformFeeBps: typeof ZIRO_PLATFORM_FEE_BPS;
  };
  platformFeeBps: typeof ZIRO_PLATFORM_FEE_BPS;
}

/**
 * Converts a human store display name into a DNS-safe lowercase slug (3–48 chars).
 */
export function slugifyStoreName(displayName: string): string {
  const cleaned = displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '');

  return cleaned;
}

/**
 * Computes real-time tenant ID and edge endpoint URLs as the merchant types.
 */
export function buildLiveEndpointPreview(params: {
  slug: string;
  customDomain: string;
  rootDomain: string;
}): LiveEndpointPreview {
  const root = params.rootDomain.trim().toLowerCase().replace(/\.$/, '') || 'ziro.build';
  const effectiveSlug = slugifyStoreName(params.slug) || 'your-store';
  const tenantId = `tenant_${effectiveSlug.replace(/-/g, '_')}`;

  const normalizedCustom = params.customDomain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '');

  const defaultSubdomainHost = `${effectiveSlug}.${root}`;
  const requiresDnsCname = normalizedCustom.length > 0 && normalizedCustom.includes('.');
  const primaryHost = requiresDnsCname ? normalizedCustom : defaultSubdomainHost;

  return {
    effectiveSlug,
    tenantId,
    primaryHost,
    storefrontUrl: `https://${primaryHost}`,
    defaultSubdomainUrl: `https://${defaultSubdomainHost}`,
    posUrl: `https://pos.${root}`,
    ucpManifestUrl: `https://${primaryHost}/.well-known/ucp`,
    requiresDnsCname,
  };
}

function formatTierPrice(tier: SelfServePlanTier, currency: WizardCurrency): string {
  const def = ZIRO_SAAS_PLANS[tier];
  if (currency === 'INR') {
    return `₹${Math.round(def.monthlyInrPaise / 100).toLocaleString('en-IN')}`;
  }
  return `$${Math.round(def.monthlyUsdCents / 100).toLocaleString('en-US')}`;
}

const PLAN_SUMMARY_BADGES: Record<SelfServePlanTier, string> = {
  starter: 'Storefront + GST/Stripe + UCP Agents',
  growth: 'Fitment + BOM Kits + AI RTO Shield + B2B',
  scale: '3D Configurator + ONDC + Dedicated HNSW',
};

export function StoreLaunchWizard({
  initialPlanTier = 'growth',
  rootDomain = 'ziro.build',
  initialProvisionedResult = null,
}: {
  initialPlanTier?: SelfServePlanTier;
  rootDomain?: string;
  initialProvisionedResult?: ProvisionedTenantPayload | null;
}) {
  const [displayName, setDisplayName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [planTier, setPlanTier] = useState<SelfServePlanTier>(initialPlanTier);
  const [currency, setCurrency] = useState<WizardCurrency>('INR');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [conflictField, setConflictField] = useState<string | null>(null);
  const [provisioned, setProvisioned] = useState<ProvisionedTenantPayload | null>(
    initialProvisionedResult
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const livePreview = useMemo(
    () =>
      buildLiveEndpointPreview({
        slug,
        customDomain,
        rootDomain,
      }),
    [slug, customDomain, rootDomain]
  );

  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    if (!slugManuallyEdited) {
      setSlug(slugifyStoreName(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true);
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
  };

  const copyValue = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((curr) => (curr === key ? null : curr)), 1800);
    } catch {
      // Clipboard unavailable in restricted contexts
    }
  };

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setConflictField(null);

    const normalizedSlug = slugifyStoreName(slug);
    if (displayName.trim().length < 2) {
      setErrorMsg('Enter a store display name of at least 2 characters.');
      return;
    }
    if (normalizedSlug.length < 3) {
      setErrorMsg('Store slug must be at least 3 lowercase letters, numbers, or hyphens.');
      setConflictField('slug');
      return;
    }
    if (!ownerEmail.trim() || !ownerEmail.includes('@')) {
      setErrorMsg('Enter a valid owner email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/v1/tenants/provision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: displayName.trim(),
          slug: normalizedSlug,
          planTier,
          ownerEmail: ownerEmail.trim(),
          customDomain: customDomain.trim() || null,
          platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        if (typeof payload.conflictField === 'string') {
          setConflictField(payload.conflictField);
        } else if (typeof payload.field === 'string') {
          setConflictField(payload.field);
        }
        throw new Error(payload.error || `Provisioning failed (HTTP ${res.status})`);
      }

      const data = payload as ProvisionedTenantPayload;
      if (data.platformFeeBps !== ZIRO_PLATFORM_FEE_BPS) {
        throw new Error('Security invariant violation: non-zero platformFeeBps returned.');
      }

      setProvisioned(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to provision store tenant.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selfServeTiers: SelfServePlanTier[] = ['starter', 'growth', 'scale'];

  // ============================================================================
  // POST-PROVISIONING LAUNCHPAD STATE
  // ============================================================================
  if (provisioned) {
    const { tenant, endpoints, entitlements } = provisioned;
    const encodedTenantId = encodeURIComponent(tenant.tenantId);
    const trialEndFormatted = new Date(tenant.trialEndsAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    return (
      <div className="mx-auto max-w-5xl space-y-6 text-[#F4F6F9]">
        {/* Provisioned Success Header */}
        <div className="rounded-2xl border border-[#00E599]/50 bg-[#12161E] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#00E599]" />
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#00E599]">
                TENANT PROVISIONED • {tenant.trialDays}-DAY FREE TRIAL ACTIVE
              </span>
            </div>

            <span className="rounded-md border border-[#00E599]/40 bg-[#00E599]/10 px-2.5 py-1 font-mono text-xs font-semibold text-[#00E599]">
              0% GMV TAX LOCKED (BPS: {tenant.platformFeeBps})
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            {tenant.displayName} is Live on Ziro Cloud
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Provisioned under RLS scope{' '}
            <code className="rounded bg-[#090B0E] px-2 py-0.5 font-mono text-xs text-[#F4F6F9]">
              {tenant.tenantId}
            </code>{' '}
            on the <strong className="uppercase text-slate-200">{tenant.planTier}</strong> tier
            (trial active through <span className="font-mono text-slate-200">{trialEndFormatted}</span>
            ).
          </p>

          {/* Provisioned Endpoints Grid */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(
              [
                {
                  key: 'tenant_id',
                  label: 'RLS Tenant ID',
                  value: tenant.tenantId,
                },
                {
                  key: 'storefront_url',
                  label: 'Primary Storefront URL',
                  value: endpoints.storefrontUrl,
                },
                {
                  key: 'pos_url',
                  label: 'Offline-First POS PWA',
                  value: endpoints.posUrl,
                },
                {
                  key: 'ucp_url',
                  label: 'UCP AI Agent Manifest',
                  value: endpoints.ucpManifestUrl,
                },
              ] as const
            ).map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#1F2633] bg-[#090B0E] px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                    {item.label}
                  </div>
                  <div className="mt-0.5 truncate font-mono text-xs text-[#F4F6F9]">
                    {item.value}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyValue(item.key, item.value)}
                  className="shrink-0 rounded border border-[#1F2633] bg-[#12161E] px-2.5 py-1 font-mono text-[11px] text-[#00E599] hover:border-[#00E599]"
                >
                  {copiedKey === item.key ? 'COPIED' : 'COPY'}
                </button>
              </div>
            ))}
          </div>

          {/* Entitlements Summary Strip */}
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-[#1F2633] bg-[#090B0E] px-4 py-3 font-mono text-xs text-slate-300">
            <span>
              Plan: <strong className="text-[#F4F6F9]">{entitlements.name}</strong>
            </span>
            <span>•</span>
            <span>
              Custom Domains: <strong className="text-[#F4F6F9]">{entitlements.maxCustomDomains}</strong>
            </span>
            <span>•</span>
            <span>
              Offline POS Seats: <strong className="text-[#F4F6F9]">{entitlements.maxPosTerminals}</strong>
            </span>
            <span>•</span>
            <span>
              Pulse AI Queries/mo:{' '}
              <strong className="text-[#F4F6F9]">
                {entitlements.monthlyPulseAgentQueries.toLocaleString('en-US')}
              </strong>
            </span>
            <Link
              href={`/dashboard?tenantId=${encodedTenantId}`}
              className="ml-auto font-semibold text-[#00E599] hover:underline"
            >
              Open Command Dashboard →
            </Link>
          </div>
        </div>

        {/* 3 Post-Provisioning Next-Step Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Next Step 1: /migrate */}
          <div className="flex flex-col justify-between rounded-2xl border border-[#1F2633] bg-[#12161E] p-5">
            <div className="space-y-2">
              <span className="font-mono text-xs font-semibold text-[#00E599]">
                STEP 01 • CATALOG INGESTION
              </span>
              <h2 className="text-base font-semibold">Import Shopify or WooCommerce Catalog</h2>
              <p className="text-xs leading-relaxed text-slate-400">
                Upload a Shopify CSV or connect WooCommerce REST v3 keys to auto-assign HSN codes,
                GST slabs, vehicle fitment matrices, and 1024-dim semantic vectors.
              </p>
            </div>
            <Link
              href={`/migrate?tenantId=${encodedTenantId}`}
              className="mt-5 block rounded-xl bg-[#00E599] py-2.5 text-center font-mono text-xs font-semibold text-[#090B0E] transition hover:brightness-110"
            >
              Open Migration Studio →
            </Link>
          </div>

          {/* Next Step 2: /billing */}
          <div className="flex flex-col justify-between rounded-2xl border border-[#1F2633] bg-[#12161E] p-5">
            <div className="space-y-2">
              <span className="font-mono text-xs font-semibold text-[#F59E0B]">
                STEP 02 • SUBSCRIPTION MANDATE
              </span>
              <h2 className="text-base font-semibold">Activate Razorpay or Stripe Billing</h2>
              <p className="text-xs leading-relaxed text-slate-400">
                Lock in flat monthly billing in INR (Razorpay) or USD (Stripe) before your{' '}
                {tenant.trialDays}-day trial expires—with 0% GMV transaction tax guaranteed.
              </p>
            </div>
            <Link
              href={`/billing?tenantId=${encodedTenantId}`}
              className="mt-5 block rounded-xl border border-[#1F2633] bg-[#090B0E] py-2.5 text-center font-mono text-xs font-semibold text-[#F4F6F9] transition hover:border-[#F59E0B] hover:text-[#F59E0B]"
            >
              Configure Billing &amp; Plan →
            </Link>
          </div>

          {/* Next Step 3: /docs */}
          <div className="flex flex-col justify-between rounded-2xl border border-[#1F2633] bg-[#12161E] p-5">
            <div className="space-y-2">
              <span className="font-mono text-xs font-semibold text-slate-300">
                STEP 03 • DNS, GATEWAYS &amp; POS
              </span>
              <h2 className="text-base font-semibold">DNS CNAME, Thermal Printer &amp; Agents</h2>
              <p className="text-xs leading-relaxed text-slate-400">
                Configure custom domain CNAME records for Caddy On-Demand TLS, pair WebSerial
                ESC/POS receipt printers, and test KYA agent HMAC signatures.
              </p>
            </div>
            <Link
              href={`/docs?tenantId=${encodedTenantId}`}
              className="mt-5 block rounded-xl border border-[#1F2633] bg-[#090B0E] py-2.5 text-center font-mono text-xs font-semibold text-[#F4F6F9] transition hover:border-[#00E599] hover:text-[#00E599]"
            >
              Open Onboarding Workbench →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // INITIAL STORE PROVISIONING WIZARD FORM
  // ============================================================================
  return (
    <div className="mx-auto max-w-6xl space-y-6 text-[#F4F6F9]">
      {/* Top Hero Strip */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#1F2633] bg-[#12161E] p-6 lg:flex-row lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-block h-2 w-2 rounded-full bg-[#00E599]" />
            <span className="font-mono text-xs uppercase tracking-wider text-[#00E599]">
              Ziro Cloud • 1-Click Tenant Provisioning
            </span>
            <span className="rounded border border-[#00E599]/40 bg-[#00E599]/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#00E599]">
              0% GMV TAX • 14-DAY FREE TRIAL
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Launch Your Zero-Tax Commerce OS Instance
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Isolated PostgreSQL 17 Row-Level Security, offline-first POS, and native UCP/ACP AI
            shopping agent endpoints—provisioned in seconds.
          </p>
        </div>

        {/* Currency Preview Switch */}
        <div className="inline-flex self-start rounded-xl border border-[#1F2633] bg-[#090B0E] p-1 lg:self-center">
          <button
            type="button"
            onClick={() => setCurrency('INR')}
            className={`rounded-lg px-3.5 py-2 font-mono text-xs font-semibold transition ${
              currency === 'INR'
                ? 'bg-[#00E599] text-[#090B0E]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            INR (₹)
          </button>
          <button
            type="button"
            onClick={() => setCurrency('USD')}
            className={`rounded-lg px-3.5 py-2 font-mono text-xs font-semibold transition ${
              currency === 'USD'
                ? 'bg-[#00E599] text-[#090B0E]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            USD ($)
          </button>
        </div>
      </div>

      {/* Main Split Grid: Form (7 cols) | Live Infrastructure Preview (5 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <form
          onSubmit={handleProvisionSubmit}
          className="space-y-6 rounded-2xl border border-[#1F2633] bg-[#12161E] p-6 lg:col-span-7"
        >
          {/* Section A: Store Identity */}
          <div className="space-y-4">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-300">
              01. Store Identity &amp; Routing
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="wizard-display-name"
                  className="mb-1 block font-mono text-xs text-slate-400"
                >
                  Store / Brand Name *
                </label>
                <input
                  id="wizard-display-name"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => handleDisplayNameChange(e.target.value)}
                  placeholder="MotoFit 2 Performance Parts"
                  className="w-full rounded-lg border border-[#1F2633] bg-[#090B0E] px-3.5 py-2.5 text-sm text-[#F4F6F9] placeholder:text-slate-600 focus:border-[#00E599] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="wizard-slug"
                  className="mb-1 block font-mono text-xs text-slate-400"
                >
                  Store Subdomain Slug *
                </label>
                <div className="flex items-center rounded-lg border border-[#1F2633] bg-[#090B0E] focus-within:border-[#00E599]">
                  <input
                    id="wizard-slug"
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="motofit-2"
                    className={`w-full bg-transparent px-3 py-2.5 font-mono text-sm text-[#F4F6F9] placeholder:text-slate-600 focus:outline-none ${
                      conflictField === 'slug' ? 'text-red-400' : ''
                    }`}
                  />
                  <span className="shrink-0 pr-3 font-mono text-xs text-slate-500">
                    .{rootDomain}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="wizard-owner-email"
                  className="mb-1 block font-mono text-xs text-slate-400"
                >
                  Owner Admin Email *
                </label>
                <input
                  id="wizard-owner-email"
                  type="email"
                  required
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="founder@yourbrand.com"
                  className="w-full rounded-lg border border-[#1F2633] bg-[#090B0E] px-3.5 py-2.5 font-mono text-sm text-[#F4F6F9] placeholder:text-slate-600 focus:border-[#00E599] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="wizard-custom-domain"
                  className="mb-1 block font-mono text-xs text-slate-400"
                >
                  Custom Domain (Optional)
                </label>
                <input
                  id="wizard-custom-domain"
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="shop.yourbrand.com"
                  className={`w-full rounded-lg border bg-[#090B0E] px-3.5 py-2.5 font-mono text-sm text-[#F4F6F9] placeholder:text-slate-600 focus:border-[#00E599] focus:outline-none ${
                    conflictField === 'customDomain' ? 'border-red-500' : 'border-[#1F2633]'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Section B: Flat-Rate Tier Selector */}
          <div className="space-y-3 border-t border-[#1F2633] pt-5">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-300">
                02. Select Trial Plan Tier (0% GMV Tax on All Tiers)
              </h2>
              <span className="font-mono text-[11px] text-[#00E599]">
                14 days free • Switch anytime
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {selfServeTiers.map((tier) => {
                const plan = ZIRO_SAAS_PLANS[tier];
                const isSelected = planTier === tier;

                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setPlanTier(tier)}
                    aria-pressed={isSelected}
                    className={`flex flex-col justify-between rounded-xl border p-4 text-left transition ${
                      isSelected
                        ? 'border-[#00E599] bg-[#00E599]/10'
                        : 'border-[#1F2633] bg-[#090B0E] hover:border-slate-600'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[#F4F6F9]">{plan.name}</span>
                        {tier === 'growth' && (
                          <span className="rounded bg-[#00E599] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-[#090B0E]">
                            POPULAR
                          </span>
                        )}
                      </div>
                      <div className="mt-2 font-mono text-xl font-bold text-[#F4F6F9] tabular-nums">
                        {formatTierPrice(tier, currency)}
                        <span className="text-xs font-normal text-slate-400">/mo</span>
                      </div>
                      <p className="mt-1.5 text-[11px] leading-snug text-slate-400">
                        {PLAN_SUMMARY_BADGES[tier]}
                      </p>
                    </div>

                    <div className="mt-3 border-t border-[#1F2633] pt-2 font-mono text-[10px] text-[#00E599]">
                      {plan.maxCustomDomains} domain(s) • {plan.maxPosTerminals} POS • 0% fee
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/40 bg-red-950/30 p-3.5 font-mono text-xs text-red-300"
            >
              [PROVISIONING ERROR] {errorMsg}
            </div>
          )}

          {/* Submit CTA */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-[#1F2633] pt-5 sm:flex-row">
            <span className="font-mono text-xs text-slate-400">
              No credit card required for 14-day trial.
            </span>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#00E599] px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-[#090B0E] transition hover:brightness-110 disabled:opacity-50 sm:w-auto"
            >
              {isSubmitting
                ? 'Provisioning RLS Tenant...'
                : 'Launch Store & Start 14-Day Trial →'}
            </button>
          </div>
        </form>

        {/* Right Column: Live Tenant Architecture & Endpoint Preview */}
        <aside className="space-y-4 lg:col-span-5">
          <div className="rounded-2xl border border-[#1F2633] bg-[#12161E] p-6">
            <div className="flex items-center justify-between border-b border-[#1F2633] pb-3">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#00E599]">
                Live Infrastructure Blueprint
              </span>
              <span className="font-mono text-[11px] text-slate-400">PG17 RLS ISOLATED</span>
            </div>

            <dl className="mt-4 space-y-3.5 font-mono text-xs">
              <div className="rounded-lg border border-[#1F2633] bg-[#090B0E] p-3">
                <dt className="text-[10px] uppercase text-slate-400">PostgreSQL RLS Tenant ID</dt>
                <dd className="mt-1 font-semibold text-[#F4F6F9]">{livePreview.tenantId}</dd>
              </div>

              <div className="rounded-lg border border-[#1F2633] bg-[#090B0E] p-3">
                <dt className="text-[10px] uppercase text-slate-400">Primary Storefront URL</dt>
                <dd className="mt-1 truncate text-[#00E599]">{livePreview.storefrontUrl}</dd>
              </div>

              <div className="rounded-lg border border-[#1F2633] bg-[#090B0E] p-3">
                <dt className="text-[10px] uppercase text-slate-400">
                  Native AI Agent Discovery (UCP)
                </dt>
                <dd className="mt-1 truncate text-slate-200">{livePreview.ucpManifestUrl}</dd>
              </div>

              <div className="rounded-lg border border-[#1F2633] bg-[#090B0E] p-3">
                <dt className="text-[10px] uppercase text-slate-400">
                  Offline-First Counter POS PWA
                </dt>
                <dd className="mt-1 truncate text-slate-200">{livePreview.posUrl}</dd>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-[#00E599]/30 bg-[#00E599]/10 p-3">
                <dt className="text-[10px] uppercase text-[#00E599]">Platform GMV Tax</dt>
                <dd className="font-bold text-[#00E599]">0.00% (0 BPS)</dd>
              </div>
            </dl>

            {livePreview.requiresDnsCname && (
              <div className="mt-4 rounded-xl border border-[#F59E0B]/40 bg-[#F59E0B]/10 p-3.5 font-mono text-[11px] text-[#F59E0B]">
                <strong>Custom Domain TLS Note:</strong> Point a <span className="underline">CNAME</span>{' '}
                record for <strong>{livePreview.primaryHost}</strong> to{' '}
                <strong>edge.{rootDomain}</strong> to activate automatic Caddy SSL.
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
