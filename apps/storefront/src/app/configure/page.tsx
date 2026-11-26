'use client';

import Link from 'next/link';
import { ZiroWordmark, StatusBadge } from '@ziro/ui-kit';
import { ProductConfigurator3D } from '@ziro/ui-kit/3d';
import { useCartStore } from '../../store/cart';

export default function ConfigurePage() {
  const addItem = useCartStore((s) => s.addItem);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1F2633] pb-4">
        <div className="flex items-center gap-4">
          <Link href="/">
            <ZiroWordmark />
          </Link>
          <StatusBadge variant="live-sync" label="Three.js R3F Engine" />
        </div>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/" className="text-[#8B95A5] hover:text-[#F4F6F9]">Home</Link>
          <Link href="/catalog" className="text-[#8B95A5] hover:text-[#F4F6F9]">Catalog</Link>
          <Link href="/configure" className="text-[#00E599] font-medium">3D Configurator</Link>
          <Link href="/checkout" className="text-[#8B95A5] hover:text-[#F4F6F9]">Checkout</Link>
        </nav>
      </header>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F4F6F9]">
            3D Assembly Configurator & BOM Fitment
          </h1>
          <p className="text-xs text-[#8B95A5] font-mono mt-1">
            Real-time material rendering, dynamic pricing, and direct cart synchronisation.
          </p>
        </div>
        <span className="text-xs font-mono text-[#00E599] bg-[#00E599]/10 px-3 py-1 rounded">
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
          { id: 'anodized-mint', label: 'Electric Mint Anodized', swatchHex: '#00E599', priceDeltaMinor: 15000 },
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
