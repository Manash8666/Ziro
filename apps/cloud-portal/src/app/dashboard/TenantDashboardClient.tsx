'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { computeGmvTaxSavings } from '@/lib/billing-plans';
import type { TenantDashboardSnapshot } from '@/lib/tenant-dashboard-loader';

function formatInrFromPaise(paise: number): string {
  const rupees = Math.round(paise / 100);
  return `₹${rupees.toLocaleString('en-IN')}`;
}

export function TenantDashboardClient({
  snapshot,
}: {
  snapshot: TenantDashboardSnapshot;
}) {
  const savings = useMemo(
    () =>
      computeGmvTaxSavings({
        gmvAmount: Math.round(snapshot.catalog.cumulativeGmvPaise / 100),
        competitorFeePercent: 2.0,
      }),
    [snapshot.catalog.cumulativeGmvPaise]
  );

  const agentQuotaPct = useMemo(() => {
    if (snapshot.entitlements.monthlyPulseAgentQueries <= 0) return 0;
    return Math.min(
      100,
      Math.round(
        (snapshot.pulse.monthlyAgentQueries /
          snapshot.entitlements.monthlyPulseAgentQueries) *
          100
      )
    );
  }, [snapshot.pulse.monthlyAgentQueries, snapshot.entitlements.monthlyPulseAgentQueries]);

  const encodedTenantId = encodeURIComponent(snapshot.tenantId);

  return (
    <div className="mx-auto max-w-6xl space-y-6 text-[#F4F6F9]">
      {/* 1. Command Center Header Strip */}
      <header className="flex flex-col justify-between gap-4 rounded-2xl border border-[#1F2633] bg-[#12161E] p-6 lg:flex-row lg:items-center">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                snapshot.edgeRoutingActive ? 'bg-[#00E599]' : 'bg-red-500'
              }`}
            />
            <span className="font-mono text-xs uppercase tracking-wider text-[#00E599]">
              TENANT COMMAND CENTER • RLS ISOLATED
            </span>
            <span className="rounded border border-[#00E599]/40 bg-[#00E599]/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#00E599]">
              0% GMV TAX LOCKED (BPS: {snapshot.platformFeeBps})
            </span>
            {snapshot.isDemoSandbox && (
              <span className="rounded border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#F59E0B]">
                PUBLIC SANDBOX (READ-ONLY)
              </span>
            )}
          </div>

          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {snapshot.displayName}
          </h1>
          <p className="font-mono text-xs text-slate-400">
            Tenant ID: <span className="text-slate-200">{snapshot.tenantId}</span> • Plan:{' '}
            <span className="uppercase text-slate-200">{snapshot.planName}</span> • Edge TLS:{' '}
            <span
              className={
                snapshot.edgeRoutingActive ? 'text-[#00E599]' : 'text-red-400'
              }
            >
              {snapshot.edgeRoutingActive ? 'ACTIVE' : 'PAUSED'}
            </span>
          </p>
        </div>

        {/* Quick Switcher & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/migrate?tenantId=${encodedTenantId}`}
            className="rounded-xl border border-[#1F2633] bg-[#090B0E] px-4 py-2 font-mono text-xs font-semibold text-[#F4F6F9] transition hover:border-[#00E599]"
          >
            Import Catalog
          </Link>
          <Link
            href={`/billing?tenantId=${encodedTenantId}`}
            className="rounded-xl border border-[#1F2633] bg-[#090B0E] px-4 py-2 font-mono text-xs font-semibold text-[#F4F6F9] transition hover:border-[#F59E0B]"
          >
            Manage Billing
          </Link>
          <Link
            href="/onboarding"
            className="rounded-xl bg-[#00E599] px-4 py-2 font-mono text-xs font-bold text-[#090B0E] transition hover:brightness-110"
          >
            + Launch Tenant
          </Link>
        </div>
      </header>

      {/* Dunning Warning Strip */}
      {snapshot.billingStatus === 'past_due' && (
        <div
          role="alert"
          className="flex flex-col justify-between gap-3 rounded-xl border border-[#F59E0B]/50 bg-[#F59E0B]/10 p-4 sm:flex-row sm:items-center"
        >
          <span className="font-mono text-xs text-[#F59E0B]">
            [DUNNING GRACE WINDOW ACTIVE] Subscription renewal pending. Resolve invoice to maintain
            custom domain TLS termination.
          </span>
          <Link
            href={`/billing?tenantId=${encodedTenantId}`}
            className="shrink-0 rounded-lg bg-[#F59E0B] px-3.5 py-1.5 font-mono text-xs font-bold text-[#090B0E]"
          >
            Resolve Now →
          </Link>
        </div>
      )}

      {/* 2. Four Core Metric Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#1F2633] bg-[#12161E] p-5">
          <div className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
            Cumulative GMV (0% Ziro Tax)
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-[#F4F6F9] tabular-nums">
            {formatInrFromPaise(snapshot.catalog.cumulativeGmvPaise)}
          </div>
          <div className="mt-2 font-mono text-xs text-[#00E599]">
            Saved ₹{savings.netSavingsAmount.toLocaleString('en-IN')} vs 2% legacy fees
          </div>
        </div>

        <div className="rounded-2xl border border-[#1F2633] bg-[#12161E] p-5">
          <div className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
            Catalog &amp; Fitment Graph
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-[#F4F6F9] tabular-nums">
            {snapshot.catalog.totalProducts.toLocaleString('en-US')} SKUs
          </div>
          <div className="mt-2 font-mono text-xs text-slate-400">
            {snapshot.catalog.totalBomKits} BOM Kits • {snapshot.catalog.totalFitmentRules}{' '}
            Fitment Rules
          </div>
        </div>

        <div className="rounded-2xl border border-[#1F2633] bg-[#12161E] p-5">
          <div className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
            BAAI/bge-m3 Vector Index
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-[#00E599] tabular-nums">
            {snapshot.catalog.vectorCoveragePercent}%
          </div>
          <div className="mt-2 font-mono text-xs text-slate-400">
            {snapshot.catalog.indexedVectorsCount} / {snapshot.catalog.totalProducts} HNSW
            1024-dim indexed
          </div>
        </div>

        <div className="rounded-2xl border border-[#1F2633] bg-[#12161E] p-5">
          <div className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
            AI RTO Shield Loss Prevented
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-[#F59E0B] tabular-nums">
            {formatInrFromPaise(snapshot.pulse.estimatedRtoLossSavedPaise)}
          </div>
          <div className="mt-2 font-mono text-xs text-slate-400">
            {snapshot.pulse.rtoHighRiskOrdersNudged} high-risk COD orders nudged to UPI
          </div>
        </div>
      </section>

      {/* 3. Infrastructure Endpoints & Plan Entitlement Quotas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Live Endpoints & TLS Edge Status */}
        <section className="space-y-4 rounded-2xl border border-[#1F2633] bg-[#12161E] p-6 lg:col-span-5">
          <div className="flex items-center justify-between border-b border-[#1F2633] pb-3">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-300">
              Edge Routing &amp; Entitlements
            </h2>
            <span className="font-mono text-[11px] uppercase text-[#00E599]">
              {snapshot.billingStatus}
            </span>
          </div>

          <dl className="space-y-2.5 font-mono text-xs">
            <div className="flex justify-between rounded-lg border border-[#1F2633] bg-[#090B0E] px-3 py-2">
              <dt className="text-slate-400">Storefront URL</dt>
              <dd className="truncate text-[#00E599]">{snapshot.storefrontUrl}</dd>
            </div>
            <div className="flex justify-between rounded-lg border border-[#1F2633] bg-[#090B0E] px-3 py-2">
              <dt className="text-slate-400">Offline POS PWA</dt>
              <dd className="truncate text-slate-200">{snapshot.posUrl}</dd>
            </div>
            <div className="flex justify-between rounded-lg border border-[#1F2633] bg-[#090B0E] px-3 py-2">
              <dt className="text-slate-400">UCP Agent Endpoint</dt>
              <dd className="truncate text-slate-200">{snapshot.ucpManifestUrl}</dd>
            </div>
          </dl>

          {/* Agent Quota Bar */}
          <div className="space-y-1.5 rounded-xl border border-[#1F2633] bg-[#090B0E] p-3.5 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Monthly Pulse AI Queries</span>
              <span className="text-[#F4F6F9]">
                {snapshot.pulse.monthlyAgentQueries.toLocaleString('en-US')} /{' '}
                {snapshot.entitlements.monthlyPulseAgentQueries.toLocaleString('en-US')} (
                {agentQuotaPct}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#1F2633]">
              <div
                className="h-full rounded-full bg-[#00E599]"
                style={{ width: `${agentQuotaPct}%` }}
              />
            </div>
            <div className="flex justify-between pt-1 text-[11px] text-slate-400">
              <span>Custom Domains: {snapshot.entitlements.activeCustomDomains} / {snapshot.entitlements.maxCustomDomains}</span>
              <span>POS Seats: up to {snapshot.entitlements.maxPosTerminals}</span>
            </div>
          </div>
        </section>

        {/* Right: Autonomous Agent & RTO Telemetry Feed */}
        <section className="space-y-4 rounded-2xl border border-[#1F2633] bg-[#12161E] p-6 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F2633] pb-3">
            <div>
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-300">
                Autonomous Agent &amp; KYA Telemetry Feed
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                UCP Discovery ({snapshot.pulse.ucpDiscoveryRequests}) • ACP Checkouts (
                {snapshot.pulse.acpCheckoutsCompleted}) • KYA Bots Blocked (
                {snapshot.pulse.kyaArbitrageBotsBlocked})
              </p>
            </div>
            <span className="rounded bg-[#1F2633] px-2 py-0.5 font-mono text-[10px] text-[#00E599]">
              {snapshot.pulse.source === 'live_pulse_ai'
                ? 'LIVE @ziro/pulse'
                : 'CACHED TELEMETRY'}
            </span>
          </div>

          <div className="space-y-2.5">
            {snapshot.pulse.recentEvents.map((ev) => (
              <div
                key={ev.eventId}
                className="flex flex-col justify-between gap-2 rounded-xl border border-[#1F2633] bg-[#090B0E] p-3.5 sm:flex-row sm:items-center"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="rounded bg-[#1F2633] px-1.5 py-0.5 font-bold text-[#F4F6F9]">
                      {ev.protocol}
                    </span>
                    <span className="text-slate-400">{ev.agentId}</span>
                  </div>
                  <p className="text-xs text-slate-200">{ev.action}</p>
                </div>

                <div className="flex shrink-0 items-center gap-3 font-mono text-xs">
                  {ev.valuePaise > 0 && (
                    <span className="text-slate-300 tabular-nums">
                      {formatInrFromPaise(ev.valuePaise)}
                    </span>
                  )}
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                      ev.outcome === 'converted' || ev.outcome === 'allowed'
                        ? 'bg-[#00E599]/15 text-[#00E599]'
                        : ev.outcome === 'nudged_upi'
                          ? 'bg-[#F59E0B]/15 text-[#F59E0B]'
                          : 'bg-red-500/15 text-red-400'
                    }`}
                  >
                    {ev.outcome}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
