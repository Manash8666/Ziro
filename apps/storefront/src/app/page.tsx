import Link from 'next/link';
import { ZiroWordmark, StatusBadge, MetricCard } from '@ziro/ui-kit';
import { FitmentFinder } from '../components/FitmentFinder';

export default function StorefrontHomePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10 space-y-12">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1F2633] pb-6">
        <div className="flex items-center gap-4">
          <ZiroWordmark size="lg" />
          <StatusBadge variant="zero-fee" label="0% GMV Tax" />
        </div>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/" className="text-[#00E599] font-medium">Storefront</Link>
          <Link href="/configure" className="text-[#8B95A5] hover:text-[#F4F6F9]">3D Configurator</Link>
          <Link href="/checkout" className="text-[#8B95A5] hover:text-[#F4F6F9]">Checkout</Link>
        </nav>
      </header>

      <section className="space-y-4 max-w-3xl">
        <p className="text-xs font-mono uppercase tracking-widest text-[#00E599]">
          The Zero-Tax Commerce OS
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-[#F4F6F9]">
          One unified ledger for D2C, B2B wholesale, counter POS, and AI shopping agents.
        </h1>
        <p className="text-[#8B95A5] text-base">
          Engineered for Indian retail complexity (UPI, GST, RTO protection, ONDC) and global DDP velocity out of a single codebase.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="Platform GMV Fee" value="0%" delta="Flat-tier SaaS or Self-Hosted" deltaTone="mint" />
        <MetricCard label="Agentic Readiness" value="UCP / ACP" delta="KYA Margin Guardrails Active" deltaTone="mint" />
        <MetricCard label="POS Sync Latency" value="0 ms" delta="Local-First IndexedDB Ledger" deltaTone="neutral" />
      </section>

      <FitmentFinder />
    </main>
  );
}
