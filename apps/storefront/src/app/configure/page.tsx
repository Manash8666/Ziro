'use client';

import Link from 'next/link';
import { ZiroWordmark, StatusBadge, ThemeToggle } from '@ziro/ui-kit';
import { ProductConfigurator3D } from '@ziro/ui-kit/3d';
import { useCartStore } from '../../store/cart';

export default function ConfigurePage() {
  const addItem = useCartStore((s) => s.addItem);

  return (
    <main className="min-h-screen bg-[var(--ziro-bg-canvas,#14090D)] text-[var(--ziro-text-primary,#F6DCE2)] mx-auto max-w-7xl px-6 py-10 space-y-8 transition-colors duration-200">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--ziro-border-hairline,#3D1C26)] pb-4">
        <div className="flex items-center gap-4">
          <Link href="/">
            <ZiroWordmark />
          </Link>
          <StatusBadge variant="live-sync" label="Three.js R3F Engine" />
        </div>
        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/" className="text-[var(--ziro-text-secondary,#C9A3AC)] hover:text-[var(--ziro-text-primary,#F6DCE2)]">Home</Link>
            <Link href="/catalog" className="text-[var(--ziro-text-secondary,#C9A3AC)] hover:text-[var(--ziro-text-primary,#F6DCE2)]">Catalog</Link>
            <Link href="/configure" className="text-[var(--ziro-cta-bg,#E8A5B5)] font-semibold">3D Configurator</Link>
            <Link href="/checkout" className="text-[var(--ziro-text-secondary,#C9A3AC)] hover:text-[var(--ziro-text-primary,#F6DCE2)]">Checkout</Link>
          </nav>
          <ThemeToggle size="sm" />
        </div>
      </header>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--ziro-text-primary,#F6DCE2)]">
            3D Assembly Configurator & BOM Fitment
          </h1>
          <p className="text-xs text-[var(--ziro-text-secondary,#C9A3AC)] font-mono mt-1">
            Real-time material rendering, dynamic pricing, and direct cart synchronisation.
          </p>
        </div>
        <span className="text-xs font-mono text-[var(--ziro-cta-bg,#E8A5B5)] bg-[var(--ziro-badge-bg,rgba(122,36,59,0.35))] border border-[var(--ziro-badge-border,#7A243B)] px-3 py-1 rounded font-bold">
          0% Transaction Tax
        </span>
      </div>

      <ProductConfigurator3D
        sku="ZRO-BRK-3D"
        title="Ziro Forged Brake Rotor & Caliper Assembly"
        basePriceMinor={185000}
        currency="INR"
        finishes={[
          { id: 'titanium-slate', label: 'Titanium Slate', swatchHex: '#4B5563', priceDeltaMinor: 0 },
          { id: 'anodized-mint', label: 'Luminous Blush Anodized', swatchHex: '#E8A5B5', priceDeltaMinor: 15000 },
        ]}
        bomOptions={[
          { id: 'opt_pads', childSku: 'sku_ceramic_pads', label: 'Ceramic Pads', priceDeltaMinor: 25000, defaultSelected: true },
          { id: 'opt_bolts', childSku: 'sku_ti_bolts', label: 'Titanium Mounting Bolts', priceDeltaMinor: 8500, defaultSelected: false },
        ]}
        onAddToCart={(selection) => {
          addItem({
            sku: selection.sku,
            title: 'Ziro Forged Brake Assembly',
            unitPriceMinor: selection.totalPriceMinor,
            qty: 1,
            materialVariant: selection.finish?.id,
            selectedOptionalSkus: selection.selectedOptionalSkus,
          });
        }}
      />
    </main>
  );
}
