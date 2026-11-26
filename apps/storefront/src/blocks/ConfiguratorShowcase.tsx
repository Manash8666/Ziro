'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ZiroButton, StatusBadge } from '@ziro/ui-kit';

export interface ConfiguratorShowcaseProps {
  productTitle?: string;
  sku?: string;
  basePriceMinor?: number;
}

export function ConfiguratorShowcase({
  productTitle = 'Performance Dual-Caliper Braking Assembly',
  sku = 'BRK-ASY-001',
  basePriceMinor = 1250000,
}: ConfiguratorShowcaseProps) {
  const [selectedFinish, setSelectedFinish] = useState<'matte-black' | 'electric-mint' | 'raw-titanium'>('electric-mint');

  const priceFormatted = (basePriceMinor / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 rounded-xl border border-[#1F2633] bg-[#12161E] p-6 lg:p-8">
      {/* 3D Visualizer Canvas container */}
      <div className="relative flex flex-col items-center justify-center min-h-[320px] rounded-lg border border-[#1F2633] bg-[#090B0E] p-6 text-center">
        <div className="absolute top-4 left-4">
          <StatusBadge variant="live-sync" label="Interactive 3D" />
        </div>

        <div className="space-y-3">
          <div className="mx-auto w-24 h-24 rounded-full border-2 border-dashed border-[#00E599]/40 flex items-center justify-center">
            <span className="font-mono text-xs text-[#00E599]">Three.js</span>
          </div>
          <p className="text-xs font-mono text-[#8B95A5]">
            WebGL / R3F Real-Time Exploded BOM View
          </p>
          <span className="inline-block text-[10px] font-mono text-[#8B95A5] bg-[#12161E] px-2 py-1 rounded">
            Finish: {selectedFinish}
          </span>
        </div>
      </div>

      {/* Product Spec & Interactive Finishes */}
      <div className="flex flex-col justify-between space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-[#8B95A5]">SKU: {sku}</span>
            <span className="text-lg font-bold text-[#00E599] font-mono">{priceFormatted}</span>
          </div>
          <h3 className="text-2xl font-semibold text-[#F4F6F9]">{productTitle}</h3>
          <p className="text-sm text-[#8B95A5] mt-2 leading-relaxed">
            Aerospace-grade forged aluminium body with multi-layer ceramic pads. Real-time
            bill-of-materials calculation and fitment compatibility check.
          </p>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-mono text-[#8B95A5]">ANODIZED FINISH SELECTION</label>
          <div className="flex gap-3">
            {[
              { id: 'matte-black', label: 'Obsidian Black' },
              { id: 'electric-mint', label: 'Electric Mint' },
              { id: 'raw-titanium', label: 'Raw Titanium' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFinish(f.id as any)}
                className={`px-3 py-2 text-xs font-medium rounded border transition-colors ${
                  selectedFinish === f.id
                    ? 'border-[#00E599] bg-[#00E599]/10 text-[#00E599]'
                    : 'border-[#1F2633] bg-[#090B0E] text-[#8B95A5] hover:border-[#8B95A5]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 flex items-center gap-4">
          <Link href="/configure" className="w-full">
            <ZiroButton variant="primary" className="w-full">
              Open Full 3D Configurator
            </ZiroButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
