import type { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';

export const metadata: Metadata = {
  title: 'Merchant & Developer Onboarding Workbench | Ziro Cloud',
  description:
    'Configure Caddy On-Demand TLS DNS CNAMEs, WebSerial ESC/POS thermal receipt printers, Razorpay/Stripe webhooks, and UCP/KYA agent protocols.',
};

interface DocsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DocsWorkbenchPage({ searchParams }: DocsPageProps) {
  const resolved = await searchParams;
  const rawTenant = Array.isArray(resolved.tenantId)
    ? resolved.tenantId[0]
    : resolved.tenantId;
  const tenantId = rawTenant?.trim() || 'tenant_motofit2';
  const rootDomain = (process.env.ZIRO_ROOT_DOMAIN ?? 'ziro.build').trim().toLowerCase();

  return (
    <main className="min-h-screen bg-[#090B0E] px-4 py-10 text-[#F4F6F9] sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl border border-[#1F2633] bg-[#12161E] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="font-mono text-xs uppercase tracking-wider text-[#00E599]">
                ZIRO ONBOARDING WORKBENCH
              </span>
              <h1 className="mt-1 text-2xl font-semibold">
                Cutover, Hardware &amp; Protocol Configuration
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Active Tenant Context:{' '}
                <code className="rounded bg-[#090B0E] px-2 py-0.5 font-mono text-xs text-[#F4F6F9]">
                  {tenantId}
                </code>
              </p>
            </div>
            <Link
              href={`/dashboard?tenantId=${encodeURIComponent(tenantId)}`}
              className="rounded-xl bg-[#00E599] px-4 py-2 font-mono text-xs font-bold text-[#090B0E]"
            >
              Open Dashboard →
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* 1. DNS & Caddy On-Demand TLS */}
          <div className="space-y-3 rounded-2xl border border-[#1F2633] bg-[#12161E] p-6">
            <span className="font-mono text-xs font-semibold text-[#00E599]">
              01 • CADDY ON-DEMAND TLS &amp; DNS
            </span>
            <h2 className="text-lg font-semibold">Custom Domain CNAME Cutover</h2>
            <p className="text-xs leading-relaxed text-slate-400">
              Point your merchant custom storefront domain to Ziro&apos;s edge ingress. Caddy verifies
              active subscription/dunning status automatically via{' '}
              <code className="font-mono text-slate-200">/api/caddy/check-domain</code>.
            </p>
            <div className="rounded-xl border border-[#1F2633] bg-[#090B0E] p-4 font-mono text-xs text-slate-200">
              <div>Type: CNAME</div>
              <div>Host: shop (or @ ALIAS)</div>
              <div>Target: edge.{rootDomain}</div>
              <div className="mt-2 text-[#F59E0B]">Cloudflare Proxy: DNS Only (Grey Cloud) during TLS issue</div>
            </div>
          </div>

          {/* 2. WebSerial ESC/POS Counter POS */}
          <div className="space-y-3 rounded-2xl border border-[#1F2633] bg-[#12161E] p-6">
            <span className="font-mono text-xs font-semibold text-[#00E599]">
              02 • COUNTER POS &amp; THERMAL PRINTERS
            </span>
            <h2 className="text-lg font-semibold">Offline POS PWA &amp; ESC/POS Pairing</h2>
            <p className="text-xs leading-relaxed text-slate-400">
              Launch <code className="font-mono text-slate-200">https://pos.{rootDomain}</code> in
              Chrome/Edge on your counter tablet. Grant WebSerial permission once to drive 80mm/58mm
              thermal printers and kick pulses (`0x1B 0x70`).
            </p>
            <div className="rounded-xl border border-[#1F2633] bg-[#090B0E] p-4 font-mono text-xs text-slate-200">
              <div>Cash Drawer Kick: ESC p 0 25 250 [1B 70 00 19 FA]</div>
              <div>Barcode Buffer: HID keyboard wedge (&lt; 30ms inter-key)</div>
              <div>Offline Engine: IndexedDB + Serwist PWA delta sync</div>
            </div>
          </div>

          {/* 3. Razorpay & Stripe SaaS Webhooks */}
          <div className="space-y-3 rounded-2xl border border-[#1F2633] bg-[#12161E] p-6">
            <span className="font-mono text-xs font-semibold text-[#F59E0B]">
              03 • DUAL-HEMISPHERE PAYMENT RAILS
            </span>
            <h2 className="text-lg font-semibold">Webhook Endpoints (0% GMV Fee)</h2>
            <p className="text-xs leading-relaxed text-slate-400">
              Configure Razorpay Subscriptions (India INR) and Stripe Billing (Global USD) webhooks
              for automatic dunning grace windows and plan-tier gating.
            </p>
            <div className="rounded-xl border border-[#1F2633] bg-[#090B0E] p-4 font-mono text-xs text-slate-200">
              <div>Razorpay: https://cloud.{rootDomain}/api/webhooks/razorpay</div>
              <div>Stripe:   https://cloud.{rootDomain}/api/webhooks/stripe</div>
              <div className="mt-2 text-[#00E599]">Invariant: ZIRO_PLATFORM_FEE_BPS = 0 locked</div>
            </div>
          </div>

          {/* 4. UCP / ACP / KYA AI Shopping Agents */}
          <div className="space-y-3 rounded-2xl border border-[#1F2633] bg-[#12161E] p-6">
            <span className="font-mono text-xs font-semibold text-slate-300">
              04 • AGENTIC COMMERCE &amp; KYA
            </span>
            <h2 className="text-lg font-semibold">UCP &amp; ACP Discovery Endpoints</h2>
            <p className="text-xs leading-relaxed text-slate-400">
              AI buyer agents auto-discover catalog capabilities, fitment filters, and tokenized
              checkout directly via protocol-native manifests.
            </p>
            <pre className="overflow-x-auto rounded-xl border border-[#1F2633] bg-[#090B0E] p-4 font-mono text-xs text-[#00E599]">
{`curl -fsS https://${rootDomain}/.well-known/ucp \\
  -H "X-Ziro-Tenant-Id: ${tenantId}"`}
            </pre>
          </div>
        </section>
      </div>
    </main>
  );
}
