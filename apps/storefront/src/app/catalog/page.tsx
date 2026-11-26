'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ZiroWordmark, StatusBadge } from '@ziro/ui-kit';
import { ProductCard, type ProductItem } from '../../components/ProductCard';

const SAMPLE_CATALOG: ProductItem[] = [
  {
    handle: 'ceramic-brake-pad-creta',
    title: 'High-Friction Ceramic Front Brake Pad Set',
    sku: 'BRK-PAD-001',
    priceMinor: 349900,
    currency: 'INR',
    category: 'Braking Systems',
    fitmentSummary: '2020-2024 Hyundai Creta / Kia Seltos',
  },
  {
    handle: 'drilled-disc-rotors-pair',
    title: 'Slotted & Drilled Ventilated Disc Rotors (Pair)',
    sku: 'BRK-ROTOR-01',
    priceMinor: 899900,
    currency: 'INR',
    category: 'Braking Systems',
    fitmentSummary: '2019-2024 Mahindra Thar / Scorpio-N',
  },
  {
    handle: 'nitrogen-charged-shock-absorbers',
    title: 'Heavy-Duty Nitrogen Charged Monotube Dampers',
    sku: 'SUS-DAMPER-01',
    priceMinor: 1450000,
    currency: 'INR',
    category: 'Suspension',
    fitmentSummary: '2020-2024 Toyota Hilux / Fortuner',
  },
  {
    handle: 'high-flow-cold-air-intake',
    title: 'Carbon-Composite Cold Air Intake System',
    sku: 'ENG-AIR-001',
    priceMinor: 1120000,
    currency: 'INR',
    category: 'Powertrain',
    fitmentSummary: '2021-2024 Tata Safari / Harrier 2.0L',
  },
  {
    handle: 'dual-caliper-performance-brake-kit',
    title: 'Aerospace Forged Dual-Caliper Complete Assembly Kit',
    sku: 'BRK-ASY-001',
    priceMinor: 2450000,
    currency: 'INR',
    category: 'Braking Systems',
    fitmentSummary: 'Universal 5x114.3 PCD Hub Fitment',
  },
  {
    handle: 'polyurethane-suspension-bush-kit',
    title: 'Competition Grade Polyurethane Suspension Bush Kit',
    sku: 'SUS-BUSH-01',
    priceMinor: 480000,
    currency: 'INR',
    category: 'Suspension',
    fitmentSummary: '2018-2024 Maruti Suzuki Jimny',
  },
];

export default function CatalogPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredProducts = SAMPLE_CATALOG.filter((p) => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesQuery =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.fitmentSummary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 space-y-10">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1F2633] pb-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <ZiroWordmark size="md" />
          </Link>
          <StatusBadge variant="zero-fee" label="Verified OEM Catalog" />
        </div>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/" className="text-[#8B95A5] hover:text-[#F4F6F9]">Home</Link>
          <Link href="/catalog" className="text-[#00E599] font-medium">Catalog</Link>
          <Link href="/configure" className="text-[#8B95A5] hover:text-[#F4F6F9]">3D Configurator</Link>
          <Link href="/checkout" className="text-[#8B95A5] hover:text-[#F4F6F9]">Checkout</Link>
        </nav>
      </header>

      {/* Catalog Title & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#F4F6F9]">
            Industrial & Automotive Catalog
          </h1>
          <p className="text-sm text-[#8B95A5] mt-1">
            Browse verified assemblies with real-time inventory and BOM fitments.
          </p>
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by SKU, Part, or Vehicle..."
          className="w-full md:w-80 rounded-lg border border-[#1F2633] bg-[#090B0E] px-4 py-2 text-sm text-[#F4F6F9] focus:border-[#00E599] focus:outline-none font-mono"
        />
      </div>

      {/* Category Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['All', 'Braking Systems', 'Suspension', 'Powertrain'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 text-xs font-mono rounded-lg transition-colors ${
              selectedCategory === cat
                ? 'bg-[#00E599] text-[#090B0E] font-bold'
                : 'bg-[#12161E] border border-[#1F2633] text-[#8B95A5] hover:text-[#F4F6F9]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((p) => (
          <ProductCard key={p.sku} product={p} />
        ))}
      </div>
    </main>
  );
}
