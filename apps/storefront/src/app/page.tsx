import Link from 'next/link';
import {
  ZiroWordmark,
  StatusBadge,
  MetricCard,
  TaxComparisonGraphic,
  ZeroTaxBadge,
  KyaShieldBadge,
  LocalFirstSeal,
  GstComplianceStamp,
} from '@ziro/ui-kit';
import { HeroSlider } from '../blocks/HeroSlider';
import { ConfiguratorShowcase } from '../blocks/ConfiguratorShowcase';
import { FitmentFinder } from '../components/FitmentFinder';

export default function StorefrontHomePage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10 space-y-16">
      {/* Global Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1F2633] pb-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <ZiroWordmark size="lg" />
          </Link>
          <StatusBadge variant="zero-fee" label="0% GMV Tax" />
        </div>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/" className="text-[#00E599] font-medium">Home</Link>
          <Link href="/catalog" className="text-[#8B95A5] hover:text-[#F4F6F9]">Catalog</Link>
          <Link href="/configure" className="text-[#8B95A5] hover:text-[#F4F6F9]">3D Configurator</Link>
          <Link href="/checkout" className="text-[#8B95A5] hover:text-[#F4F6F9]">Checkout</Link>
        </nav>
      </header>

      {/* Hero Slider */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono uppercase tracking-widest text-[#00E599]">
            The Zero-Tax Commerce OS
          </span>
          <span className="text-xs text-[#8B95A5]">| Precision Retail for D2C &amp; Wholesale</span>
        </div>
        <HeroSlider />
      </div>


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
  );
}
