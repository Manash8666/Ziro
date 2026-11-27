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
  return (
    <div className="min-h-screen bg-[#080A0D] text-[#F4F6F9]">
      {/* Precision Multi-App Navigation */}
      <ZiroNavigationHeader
        activePath="/"
        taxRegime="GST"
        portalUrl="http://localhost:3002/admin"
        posUrl="http://localhost:3001"
        renderLink={({ href, children, className }) => (
          <Link href={href} className={className}>
            {children}
          </Link>
        )}
      />

      <main className="mx-auto max-w-7xl px-6 py-10 space-y-16">
        {/* Flagship Hybrid Hero: Left-aligned High-Velocity Search + Editorial 3D Showcase */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: High-Velocity Semantic & Fitment Intelligence */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00E599]/30 bg-[#00E599]/10 px-3 py-1 text-xs font-mono font-medium text-[#00E599]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00E599] animate-pulse" />
                STAGE 5 PRODUCTION COMMERCE OS
              </span>
              <span className="text-xs font-mono text-[#8B95A5]">
                Zero GMV Toll • Sub-30ms POS • UCP/ACP Agentic
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#F4F6F9] leading-tight">
                One Unified Ledger for Storefront, Counter POS &amp;{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00E599] to-[#E6B800]">
                  AI Shopping Agents
                </span>
              </h1>
              <p className="text-base text-[#8B95A5] leading-relaxed max-w-2xl">
                The zero-tax commerce platform engineered for complex Indian retail and global cross-border brands.
                Zero platform commissions, offline-first barcode cashiering, and BAAI/bge-m3 semantic fitment matching.
              </p>
            </div>

            {/* High-Velocity Semantic Fitment Search Engine */}
            <div className="rounded-xl border border-[#1F2633] bg-[#12161E]/80 p-5 shadow-2xl backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-[#00E599]">
                  Instant Catalog &amp; Fitment Discovery
                </span>
                <span className="text-[11px] font-mono text-[#8B95A5]">
                  1024-dim BAAI/bge-m3 Vectors
                </span>
              </div>
              <SemanticFitmentSearchBar />
              
              {/* Fast Filter Tags */}
              <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[#8B95A5] text-[11px] font-mono">Popular:</span>
                {['Brembo Ceramic Caliper', 'BOM Kit Assemblies', 'Mahindra Scorpio-N', 'Heavy Duty Rotors'].map((tag) => (
                  <span
                    key={tag}
                    className="cursor-pointer rounded-md border border-[#1F2633] bg-[#090B0E] px-2.5 py-1 text-[11px] font-medium text-[#8B95A5] transition-colors hover:border-[#00E599] hover:text-[#00E599]"
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
                className="inline-flex items-center justify-center rounded-lg bg-[#00E599] px-6 py-3 text-sm font-bold text-[#090B0E] shadow-[0_0_20px_rgba(0,229,153,0.3)] transition-all hover:bg-[#00E599]/90"
              >
                Explore Full Catalog
              </Link>
              <Link
                href="/configure"
                className="inline-flex items-center justify-center rounded-lg border border-[#1F2633] bg-[#12161E] px-6 py-3 text-sm font-semibold text-[#F4F6F9] transition-all hover:border-[#2E384D] hover:bg-[#1A202C]"
              >
                Launch 3D Configurator
              </Link>
              <a
                href="http://localhost:3001"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs font-mono text-[#8B95A5] hover:text-[#00E599] transition-colors ml-auto"
              >
                <span className="h-2 w-2 rounded-full bg-[#00E599]" />
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
        <section className="flex flex-wrap items-center justify-around gap-6 rounded-xl border border-[#1F2633] bg-[#12161E] p-6">
          <div className="flex items-center gap-3">
            <ZeroTaxBadge size={54} />
            <div>
              <span className="block text-xs font-bold text-[#F4F6F9] font-sans">0% GMV Tax</span>
              <span className="text-[10px] text-[#8B95A5] font-mono">Zero Transaction Toll</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <KyaShieldBadge size={54} />
            <div>
              <span className="block text-xs font-bold text-[#F4F6F9] font-sans">KYA Cryptographic Shield</span>
              <span className="text-[10px] text-[#8B95A5] font-mono">Autonomous Buyer Verified</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LocalFirstSeal size={54} />
            <div>
              <span className="block text-xs font-bold text-[#F4F6F9] font-sans">Local-First Engine</span>
              <span className="text-[10px] text-[#8B95A5] font-mono">Zero-Latency Counter POS</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <GstComplianceStamp size={54} />
            <div>
              <span className="block text-xs font-bold text-[#F4F6F9] font-sans">GST 38+1 Compliant</span>
              <span className="text-[10px] text-[#8B95A5] font-mono">e-Way Bill Automation</span>
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
            <h2 className="text-3xl font-extrabold tracking-tight text-[#F4F6F9]">
              The Three Pillars of Ziro Commerce OS
            </h2>
            <p className="text-sm text-[#8B95A5]">
              Designed from first principles to replace fee-extracting legacy commerce monoliths with an open, high-performance ecosystem.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pillar 1 */}
            <div className="rounded-xl border border-[#1F2633] bg-[#12161E] p-6 space-y-4 hover:border-[#00E599]/40 transition-colors">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#00E599]/10 text-[#00E599] font-mono font-bold text-lg">
                0%
              </div>
              <h3 className="text-lg font-bold text-[#F4F6F9]">Zero GMV Tax &amp; Open Core</h3>
              <p className="text-xs text-[#8B95A5] leading-relaxed">
                Never pay 2%–15% gross revenue tolls. Keep 100% of your gross margins with flat monthly SaaS pricing or free self-hosted open core under permissive MIT/Apache-2.0 licenses.
              </p>
              <div className="text-[11px] font-mono text-[#00E599]">
                ✓ Hardcoded ZIRO_PLATFORM_FEE_BPS = 0
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="rounded-xl border border-[#1F2633] bg-[#12161E] p-6 space-y-4 hover:border-[#00E599]/40 transition-colors">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#00E599]/10 text-[#00E599] font-mono font-bold text-lg">
                AI
              </div>
              <h3 className="text-lg font-bold text-[#F4F6F9]">Agentic Commerce &amp; KYA Shield</h3>
              <p className="text-xs text-[#8B95A5] leading-relaxed">
                Native endpoints for Universal Commerce Protocol (UCP), Agentic Checkout Protocol (ACP), and WebMCP shopping agents—protected by Know-Your-Agent cryptographic margin guardrails.
              </p>
              <div className="text-[11px] font-mono text-[#00E599]">
                ✓ Automated COD-RTO Risk Scoring
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="rounded-xl border border-[#1F2633] bg-[#12161E] p-6 space-y-4 hover:border-[#00E599]/40 transition-colors">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#00E599]/10 text-[#00E599] font-mono font-bold text-lg">
                POS
              </div>
              <h3 className="text-lg font-bold text-[#F4F6F9]">Local-First Counter POS</h3>
              <p className="text-xs text-[#8B95A5] leading-relaxed">
                Dexie.js IndexedDB offline cashiering with sub-30ms HID barcode burst detector, WebSerial raw ESC/POS thermal printing, and automatic idempotent delta synchronization.
              </p>
              <div className="text-[11px] font-mono text-[#00E599]">
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
              <h2 className="text-2xl font-bold tracking-tight text-[#F4F6F9]">
                Interactive 3D Assembly Studio
              </h2>
              <p className="text-sm text-[#8B95A5]">
                Real-time WebGL component fitment, finish selection, and dynamic BOM roll-up calculation.
              </p>
            </div>
            <Link href="/configure">
              <span className="text-xs font-mono text-[#00E599] hover:underline">
                Launch Fullscreen Studio →
              </span>
            </Link>
          </div>
          <ConfiguratorShowcase />
        </section>

        {/* Interactive Annual Savings Calculator */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#F4F6F9]">
              Calculate Your 0% GMV Tax Savings
            </h2>
            <p className="text-sm text-[#8B95A5]">
              Compare your current Shopify or marketplace toll with Ziro's flat-tier architecture.
            </p>
          </div>
          <SavingsCalculator initialGmvDollars={500000} />
        </section>

        {/* 0% Tax Graphic vs Legacy Monoliths */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#F4F6F9]">
              The Zero-Tax Difference
            </h2>
            <p className="text-sm text-[#8B95A5]">
              Legacy monoliths penalize growth with 2.5% to 15% revenue tolls. Ziro returns 100% of transaction margin to the merchant.
            </p>
          </div>
          <TaxComparisonGraphic />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1F2633] bg-[#090B0E] py-12 text-xs text-[#8B95A5]">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <ZiroWordmark size="sm" />
            <span>— The Zero-Tax Commerce OS. Permissive open-source stack.</span>
          </div>
          <div className="flex items-center gap-6 font-mono text-[11px]">
            <Link href="/catalog" className="hover:text-[#F4F6F9]">Catalog</Link>
            <Link href="/configure" className="hover:text-[#F4F6F9]">3D Studio</Link>
            <a href="http://localhost:3002/admin" className="hover:text-[#F4F6F9]">Merchant Admin</a>
            <a href="http://localhost:3001" className="hover:text-[#F4F6F9]">Counter POS</a>
            <a href="https://github.com/Manash8666/Ziro" target="_blank" rel="noreferrer" className="text-[#00E599] hover:underline">
              GitHub Repo ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
