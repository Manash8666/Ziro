import Link from 'next/link';
import {
  ZiroWordmark,
  ZiroNavigationHeader,
  StatusBadge,
  MetricCard,
  TaxComparisonGraphic,
  ZeroTaxBadge,
  KyaShieldBadge,
  LocalFirstSeal,
  GstComplianceStamp,
  SavingsCalculator,
} from '@ziro/ui-kit';
import { HeroSlider } from '../blocks/HeroSlider';
import { ConfiguratorShowcase } from '../blocks/ConfiguratorShowcase';
import { FitmentFinder } from '../components/FitmentFinder';
import { SemanticFitmentSearchBar } from '../components/search/SemanticFitmentSearchBar';

export default function StorefrontHomePage() {
  const portalBase =
    process.env.NEXT_PUBLIC_PORTAL_URL ??
    (process.env.NODE_ENV === 'production'
      ? 'https://ziro-orcin.vercel.app'
      : 'http://localhost:3002');
  const portalUrl = portalBase.endsWith('/admin') ? portalBase : `${portalBase}/admin`;
  const posUrl =
    process.env.NEXT_PUBLIC_POS_URL ??
    (process.env.NODE_ENV === 'production'
      ? 'https://ziro-pos.vercel.app'
      : 'http://localhost:3001');

  return (
    <div className="min-h-screen bg-[var(--ziro-bg-canvas,#14090D)] text-[var(--ziro-text-primary,#F6DCE2)] transition-colors duration-200">
      {/* Precision Multi-App Navigation with Built-in Luxury Theme Toggle */}
      <ZiroNavigationHeader
        activePath="/"
        taxRegime="GST"
        portalUrl={portalUrl}
        posUrl={posUrl}
        renderLink={({ href, children, className }) => (
          <Link href={href} className={className}>
            {children}
          </Link>
        )}
      />

      <main className="mx-auto max-w-7xl px-6 py-10 space-y-16">
        {/* Flagship Hybrid Hero with subtle luxury radial gradient glow */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start rounded-3xl p-6 sm:p-10 border border-[var(--ziro-border-hairline,#3D1C26)] ziro-hero-bg shadow-2xl">
          {/* Left Column: High-Velocity Semantic & Fitment Intelligence */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ziro-badge-border,#7A243B)] bg-[var(--ziro-badge-bg,rgba(122,36,59,0.35))] px-3 py-1 text-xs font-mono font-medium text-[var(--ziro-cta-bg,#E8A5B5)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--ziro-cta-bg,#E8A5B5)] animate-pulse" />
                STAGE 5 PRODUCTION COMMERCE OS
              </span>
              <span className="text-xs font-mono text-[var(--ziro-text-secondary,#C9A3AC)]">
                Zero GMV Toll • Sub-30ms POS • UCP/ACP Agentic
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[var(--ziro-text-primary,#F6DCE2)] leading-tight">
                One Unified Ledger for Storefront, Counter POS &amp;{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--ziro-cta-bg,#E8A5B5)] to-[var(--ziro-accent-brand,#7A243B)]">
                  AI Shopping Agents
                </span>
              </h1>
              <p className="text-base text-[var(--ziro-text-secondary,#C9A3AC)] leading-relaxed max-w-2xl">
                The zero-tax commerce platform engineered for complex Indian retail and global cross-border brands.
                Zero platform commissions, offline-first barcode cashiering, and BAAI/bge-m3 semantic fitment matching.
              </p>
            </div>

            {/* High-Velocity Semantic Fitment Search Engine */}
            <div className="rounded-xl border border-[var(--ziro-border-hairline,#3D1C26)] bg-[var(--ziro-bg-card,#221016)]/90 p-5 shadow-2xl backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--ziro-cta-bg,#E8A5B5)] font-bold">
                  Instant Catalog &amp; Fitment Discovery
                </span>
                <span className="text-[11px] font-mono text-[var(--ziro-text-secondary,#C9A3AC)]">
                  1024-dim BAAI/bge-m3 Vectors
                </span>
              </div>
              <SemanticFitmentSearchBar />
              
              {/* Fast Filter Tags */}
              <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[var(--ziro-text-secondary,#C9A3AC)] text-[11px] font-mono">Popular:</span>
                {['Brembo Ceramic Caliper', 'BOM Kit Assemblies', 'Mahindra Scorpio-N', 'Heavy Duty Rotors'].map((tag) => (
                  <span
                    key={tag}
                    className="cursor-pointer rounded-md border border-[var(--ziro-border-hairline,#3D1C26)] bg-[var(--ziro-bg-canvas,#14090D)] px-2.5 py-1 text-[11px] font-medium text-[var(--ziro-text-secondary,#C9A3AC)] transition-colors hover:border-[var(--ziro-cta-bg,#E8A5B5)] hover:text-[var(--ziro-cta-bg,#E8A5B5)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/catalog"
                className="inline-flex items-center justify-center rounded-lg bg-[var(--ziro-cta-bg,#E8A5B5)] px-6 py-3 text-sm font-bold text-[var(--ziro-cta-text,#14090D)] shadow-[0_0_20px_rgba(232,165,181,0.25)] transition-all hover:opacity-90"
              >
                Explore Full Catalog
              </Link>
              <Link
                href="/configure"
                className="inline-flex items-center justify-center rounded-lg border border-[var(--ziro-border-hairline,#3D1C26)] bg-[var(--ziro-bg-card,#221016)] px-6 py-3 text-sm font-semibold text-[var(--ziro-text-primary,#F6DCE2)] transition-all hover:border-[var(--ziro-accent-brand,#7A243B)] hover:bg-[var(--ziro-bg-card-hover,#2E121B)]"
              >
                Launch 3D Configurator
              </Link>
              <a
                href={posUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs font-mono text-[var(--ziro-text-secondary,#C9A3AC)] hover:text-[var(--ziro-cta-bg,#E8A5B5)] transition-colors ml-auto"
              >
                <span className="h-2 w-2 rounded-full bg-[var(--ziro-cta-bg,#E8A5B5)]" />
                Open Offline POS Terminal ↗
              </a>
            </div>
          </div>

          {/* Right Column: Dynamic Slider & Visual Showcase */}
          <div className="lg:col-span-5 space-y-4">
            <HeroSlider />
          </div>
        </section>

        {/* Trust & Compliance Badges Strip */}
        <section className="flex flex-wrap items-center justify-around gap-6 rounded-xl border border-[var(--ziro-border-hairline,#3D1C26)] bg-[var(--ziro-bg-card,#221016)] p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <ZeroTaxBadge size={54} />
            <div>
              <span className="block text-xs font-bold text-[var(--ziro-text-primary,#F6DCE2)] font-sans">0% GMV Tax</span>
              <span className="text-[10px] text-[var(--ziro-text-secondary,#C9A3AC)] font-mono">Zero Transaction Toll</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <KyaShieldBadge size={54} />
            <div>
              <span className="block text-xs font-bold text-[var(--ziro-text-primary,#F6DCE2)] font-sans">KYA Cryptographic Shield</span>
              <span className="text-[10px] text-[var(--ziro-text-secondary,#C9A3AC)] font-mono">Autonomous Buyer Verified</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LocalFirstSeal size={54} />
            <div>
              <span className="block text-xs font-bold text-[var(--ziro-text-primary,#F6DCE2)] font-sans">Local-First Engine</span>
              <span className="text-[10px] text-[var(--ziro-text-secondary,#C9A3AC)] font-mono">Zero-Latency Counter POS</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <GstComplianceStamp size={54} />
            <div>
              <span className="block text-xs font-bold text-[var(--ziro-text-primary,#F6DCE2)] font-sans">GST 38+1 Compliant</span>
              <span className="text-[10px] text-[var(--ziro-text-secondary,#C9A3AC)] font-mono">e-Way Bill Automation</span>
            </div>
          </div>
        </section>

        {/* Live Financial Metrics */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            label="Platform GMV Fee"
            value="0%"
            delta="Flat-tier SaaS or Self-Hosted"
            deltaTone="mint"
          />
          <MetricCard
            label="Agentic Readiness"
            value="UCP / ACP"
            delta="KYA Margin Guardrails Active"
            deltaTone="mint"
          />
          <MetricCard
            label="POS Sync Latency"
            value="0 ms"
            delta="Local-First IndexedDB Ledger"
            deltaTone="neutral"
          />
        </section>

        {/* Three Commerce Pillars Grid */}
        <section className="space-y-6">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight text-[var(--ziro-text-primary,#F6DCE2)]">
              The Three Pillars of Ziro Commerce OS
            </h2>
            <p className="text-sm text-[var(--ziro-text-secondary,#C9A3AC)]">
              Designed from first principles to replace fee-extracting legacy commerce monoliths with an open, high-performance ecosystem.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pillar 1 */}
            <div className="rounded-xl border border-[var(--ziro-border-hairline,#3D1C26)] bg-[var(--ziro-bg-card,#221016)] p-6 space-y-4 hover:border-[var(--ziro-accent-brand,#7A243B)] transition-colors shadow-sm">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--ziro-badge-bg,rgba(122,36,59,0.35))] text-[var(--ziro-cta-bg,#E8A5B5)] font-mono font-bold text-lg border border-[var(--ziro-badge-border,#7A243B)]">
                0%
              </div>
              <h3 className="text-lg font-bold text-[var(--ziro-text-primary,#F6DCE2)]">Zero GMV Tax &amp; Open Core</h3>
              <p className="text-xs text-[var(--ziro-text-secondary,#C9A3AC)] leading-relaxed">
                Never pay 2%–15% gross revenue tolls. Keep 100% of your gross margins with flat monthly SaaS pricing or free self-hosted open core under permissive MIT/Apache-2.0 licenses.
              </p>
              <div className="text-[11px] font-mono text-[var(--ziro-cta-bg,#E8A5B5)] font-semibold">
                ✓ Hardcoded ZIRO_PLATFORM_FEE_BPS = 0
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="rounded-xl border border-[var(--ziro-border-hairline,#3D1C26)] bg-[var(--ziro-bg-card,#221016)] p-6 space-y-4 hover:border-[var(--ziro-accent-brand,#7A243B)] transition-colors shadow-sm">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--ziro-badge-bg,rgba(122,36,59,0.35))] text-[var(--ziro-cta-bg,#E8A5B5)] font-mono font-bold text-lg border border-[var(--ziro-badge-border,#7A243B)]">
                AI
              </div>
              <h3 className="text-lg font-bold text-[var(--ziro-text-primary,#F6DCE2)]">Agentic Commerce &amp; KYA Shield</h3>
              <p className="text-xs text-[var(--ziro-text-secondary,#C9A3AC)] leading-relaxed">
                Native endpoints for Universal Commerce Protocol (UCP), Agentic Checkout Protocol (ACP), and WebMCP shopping agents—protected by Know-Your-Agent cryptographic margin guardrails.
              </p>
              <div className="text-[11px] font-mono text-[var(--ziro-cta-bg,#E8A5B5)] font-semibold">
                ✓ Automated COD-RTO Risk Scoring
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="rounded-xl border border-[var(--ziro-border-hairline,#3D1C26)] bg-[var(--ziro-bg-card,#221016)] p-6 space-y-4 hover:border-[var(--ziro-accent-brand,#7A243B)] transition-colors shadow-sm">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--ziro-badge-bg,rgba(122,36,59,0.35))] text-[var(--ziro-cta-bg,#E8A5B5)] font-mono font-bold text-lg border border-[var(--ziro-badge-border,#7A243B)]">
                POS
              </div>
              <h3 className="text-lg font-bold text-[var(--ziro-text-primary,#F6DCE2)]">Local-First Counter POS</h3>
              <p className="text-xs text-[var(--ziro-text-secondary,#C9A3AC)] leading-relaxed">
                Dexie.js IndexedDB offline cashiering with sub-30ms HID barcode burst detector, WebSerial raw ESC/POS thermal printing, and automatic idempotent delta synchronization.
              </p>
              <div className="text-[11px] font-mono text-[var(--ziro-cta-bg,#E8A5B5)] font-semibold">
                ✓ Zero Latency Counter Billing
              </div>
            </div>
          </div>
        </section>

        {/* Vehicle Fitment Finder */}
        <FitmentFinder />

        {/* Interactive 3D Configurator Showcase */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-[var(--ziro-text-primary,#F6DCE2)]">
                Interactive 3D Assembly Studio
              </h2>
              <p className="text-sm text-[var(--ziro-text-secondary,#C9A3AC)]">
                Real-time WebGL component fitment, finish selection, and dynamic BOM roll-up calculation.
              </p>
            </div>
            <Link href="/configure">
              <span className="text-xs font-mono text-[var(--ziro-cta-bg,#E8A5B5)] hover:underline font-semibold">
                Launch Fullscreen Studio →
              </span>
            </Link>
          </div>
          <ConfiguratorShowcase />
        </section>

        {/* Interactive Annual Savings Calculator */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--ziro-text-primary,#F6DCE2)]">
              Calculate Your 0% GMV Tax Savings
            </h2>
            <p className="text-sm text-[var(--ziro-text-secondary,#C9A3AC)]">
              Compare your current Shopify or marketplace toll with Ziro's flat-tier architecture.
            </p>
          </div>
          <SavingsCalculator initialGmvDollars={500000} />
        </section>

        {/* 0% Tax Graphic vs Legacy Monoliths */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--ziro-text-primary,#F6DCE2)]">
              The Zero-Tax Difference
            </h2>
            <p className="text-sm text-[var(--ziro-text-secondary,#C9A3AC)]">
              Legacy monoliths penalize growth with 2.5% to 15% revenue tolls. Ziro returns 100% of transaction margin to the merchant.
            </p>
          </div>
          <TaxComparisonGraphic />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--ziro-border-hairline,#3D1C26)] bg-[var(--ziro-bg-card,#221016)] py-12 text-xs text-[var(--ziro-text-secondary,#C9A3AC)]">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <ZiroWordmark size="sm" />
            <span>— The Zero-Tax Commerce OS. Permissive open-source stack.</span>
          </div>
          <div className="flex items-center gap-6 font-mono text-[11px]">
            <Link href="/catalog" className="hover:text-[var(--ziro-text-primary,#F6DCE2)]">Catalog</Link>
            <Link href="/configure" className="hover:text-[var(--ziro-text-primary,#F6DCE2)]">3D Studio</Link>
            <a href={portalUrl} className="hover:text-[var(--ziro-text-primary,#F6DCE2)]">Merchant Admin</a>
            <a href={posUrl} className="hover:text-[var(--ziro-text-primary,#F6DCE2)]">Counter POS</a>
            <a href="https://github.com/Manash8666/Ziro" target="_blank" rel="noreferrer" className="text-[var(--ziro-cta-bg,#E8A5B5)] hover:underline font-semibold">
              GitHub Repo ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
