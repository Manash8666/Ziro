'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ZiroWordmark, StatusBadge, ZiroButton, GstComplianceStamp } from '@ziro/ui-kit';
import { BomDrawer, type BomChildItem } from '../../../components/BomDrawer';
import { LogisticsClient, type ShippingQuote } from '../../../lib/logistics-client';

export default function ProductDetailPage() {
  const [isBomOpen, setIsBomOpen] = useState(false);
  const [shippingQuotes, setShippingQuotes] = useState<ShippingQuote[]>([]);
  const [requiresEwayBill, setRequiresEwayBill] = useState(false);

  // Sample PDP product
  const product = {
    title: 'Aerospace Forged Dual-Caliper Complete Assembly Kit',
    sku: 'BRK-ASY-001',
    priceMinor: 2450000,
    currency: 'INR',
    hsn: '87083000',
    gstRate: '28%',
    fitmentSummary: '2020-2024 Toyota Fortuner / Hilux 4x4 (Front Axle)',
  };

  const sampleBomChildren: BomChildItem[] = [
    { sku: 'BRK-CAL-L', name: 'Forged 6-Piston Caliper (Left)', quantity: 1, hsn: '87083000' },
    { sku: 'BRK-CAL-R', name: 'Forged 6-Piston Caliper (Right)', quantity: 1, hsn: '87083000' },
    { sku: 'BRK-ROTOR-355', name: '355mm Two-Piece Floating Rotor', quantity: 2, hsn: '87083000' },
    { sku: 'BRK-PAD-CER', name: 'Ceramic Compound Brake Pads', quantity: 4, hsn: '87083000' },
    { sku: 'BRK-LINE-SS', name: 'Braided Stainless Steel Brake Lines', quantity: 2, hsn: '87083000' },
  ];

  useEffect(() => {
    const client = new LogisticsClient();
    client
      .getShippingQuotes({
        originPincode: '110001',
        destinationPincode: '400001',
        weightGrams: 4500,
        consignmentValueMinor: product.priceMinor,
      })
      .then((res) => {
        setShippingQuotes(res.quotes);
        setRequiresEwayBill(res.requiresEwayBill);
      });
  }, [product.priceMinor]);

  const formattedPrice = (product.priceMinor / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: product.currency,
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 space-y-10">
      {/* Navigation */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1F2633] pb-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <ZiroWordmark size="md" />
          </Link>
          <StatusBadge variant="zero-fee" label="0% GMV Tax" />
        </div>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/catalog" className="text-[#8B95A5] hover:text-[#F4F6F9]">← Back to Catalog</Link>
          <Link href="/configure" className="text-[#8B95A5] hover:text-[#F4F6F9]">3D Configurator</Link>
          <Link href="/checkout" className="text-[#8B95A5] hover:text-[#F4F6F9]">Checkout</Link>
        </nav>
      </header>

      {/* PDP Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Product Media & 3D Teaser */}
        <div className="space-y-4">
          <div className="relative flex aspect-square w-full flex-col items-center justify-center rounded-xl border border-[#1F2633] bg-[#090B0E] p-8 text-center">
            <div className="absolute top-4 left-4">
              <StatusBadge variant="live-sync" label="3D CAD Verified" />
            </div>
            <div className="w-32 h-32 rounded-full border-2 border-dashed border-[#00E599]/40 flex items-center justify-center mb-4">
              <span className="font-mono text-xs text-[#00E599]">CAD Assembly</span>
            </div>
            <p className="text-xs font-mono text-[#8B95A5]">
              Interactive WebGL CAD Exploded View
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-[#1F2633] bg-[#12161E] p-4">
            <div>
              <span className="text-xs font-mono text-[#8B95A5]">CUSTOM CONFIGURATION</span>
              <p className="text-sm font-semibold text-[#F4F6F9]">Interactive 3D BOM Configurator</p>
            </div>
            <Link href="/configure">
              <ZiroButton variant="secondary" size="sm">
                Open 3D View
              </ZiroButton>
            </Link>
          </div>
        </div>

        {/* Product Details & Actions */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-[#8B95A5] mb-2">
              <span>SKU: {product.sku}</span>
              <span className="text-[#00E599]">HSN: {product.hsn} (GST {product.gstRate})</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#F4F6F9]">
              {product.title}
            </h1>
            <p className="text-3xl font-bold font-mono text-[#00E599] mt-3 ziro-tabular">
              {formattedPrice}
            </p>
          </div>

          {/* Fitment Status Box */}
          <div className="rounded-lg border border-[#00E599]/30 bg-[#00E599]/5 p-4 space-y-1">
            <span className="text-xs font-mono font-semibold text-[#00E599]">
              ✓ GUARANTEED VEHICLE FITMENT
            </span>
            <p className="text-sm text-[#F4F6F9]">{product.fitmentSummary}</p>
          </div>

          {/* BOM Drawer Action */}
          <div className="flex items-center justify-between rounded-lg border border-[#1F2633] bg-[#12161E] p-4">
            <div>
              <span className="text-xs font-mono text-[#8B95A5]">ASSEMBLY DETAILS</span>
              <p className="text-sm font-semibold text-[#F4F6F9]">
                Contains {sampleBomChildren.length} OEM Child Components
              </p>
            </div>
            <ZiroButton variant="secondary" size="sm" onClick={() => setIsBomOpen(true)}>
              Inspect BOM
            </ZiroButton>
          </div>

          {/* Live Courier Rate Comparison */}
          <div className="rounded-lg border border-[#1F2633] bg-[#090B0E] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#8B95A5]">LIVE COURIER RATES</span>
              {requiresEwayBill && (
                <span className="text-[10px] font-mono text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded">
                  e-Way Bill Generated
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {shippingQuotes.map((q) => (
                <div key={q.providerId} className="rounded border border-[#1F2633] bg-[#12161E] p-2 text-center">
                  <span className="text-[10px] font-mono text-[#8B95A5] block uppercase">
                    {q.providerId}
                  </span>
                  <span className="text-xs font-bold font-mono text-[#F4F6F9] ziro-tabular block">
                    ₹{(q.rateMinor / 100).toFixed(0)}
                  </span>
                  <span className="text-[10px] text-[#00E599]">{q.estimatedDays}d delivery</span>
                </div>
              ))}
            </div>
          </div>

          {/* Direct Buy Buttons */}
          <div className="pt-4 space-y-3">
            <Link href="/checkout" className="w-full block">
              <ZiroButton variant="primary" size="lg" className="w-full">
                Instant Checkout (UPI Intent / Card)
              </ZiroButton>
            </Link>
          </div>
        </div>
      </div>

      {/* BOM Breakdown Drawer */}
      <BomDrawer
        isOpen={isBomOpen}
        onClose={() => setIsBomOpen(false)}
        assemblyTitle={product.title}
        assemblySku={product.sku}
        childrenItems={sampleBomChildren}
      />
    </main>
  );
}
