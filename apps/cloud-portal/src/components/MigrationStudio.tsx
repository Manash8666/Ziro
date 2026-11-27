'use client';

import React, { useState } from 'react';
import { StatusBadge, MetricCard, ZiroWordmark } from '@ziro/ui-kit';

interface PreviewItem {
  handle: string;
  title: string;
  hsnCode: string;
  gstSlab: number;
  fitments: Array<{ make: string; model: string; yearStart: number; yearEnd: number }>;
  variants: Array<{ sku: string; pricePaise: number; inventoryQuantity: number }>;
  platformFeeBps: number;
}

export function MigrationStudio() {
  const [source, setSource] = useState<'shopify' | 'woocommerce'>('shopify');
  const [tenantId, setTenantId] = useState('demo-merchant');
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shopify State
  const [csvText, setCsvText] = useState(
`Handle,Title,Body (HTML),Vendor,Type,Tags,Option1 Name,Option1 Value,Option2 Name,Option2 Value,Variant SKU,Variant Price,Variant Compare At Price,Variant Inventory Qty,Variant Barcode,Image Src
brembo-racing-pad,Brembo Sintered Racing Pad,<p>Top tier friction compound</p>,Brembo,Brakes,"brakes, fitment:Yamaha:R15:2020-2024",Compound,Race,Position,Front,BRM-PAD-01,45.00,55.00,30,8901234567890,https://cdn.example.com/pad.png
brembo-racing-pad,,,,,,,Compound,Street,Position,Front,BRM-PAD-02,35.00,,50,8901234567891,https://cdn.example.com/pad2.png
motul-300v-oil,Motul 300V Factory Line 15W50,100% Synthetic racing engine oil,Motul,Lubricants,"oil, engine oil",Volume,1L,,,MOT-300V-1L,24.50,,100,,https://cdn.example.com/oil.png`
  );

  // WooCommerce State
  const [storeUrl, setStoreUrl] = useState('https://parts-catalog.example.com');
  const [consumerKey, setConsumerKey] = useState('ck_9876543210fedcba');
  const [consumerSecret, setConsumerSecret] = useState('cs_abcdef0123456789');

  // Results State
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const [report, setReport] = useState<{
    totalProcessed: number;
    insertedCount: number;
    updatedCount: number;
    skippedCount: number;
    errors?: Array<{ handle: string; message: string }>;
  } | null>(null);

  const handleMigration = async () => {
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      if (source === 'shopify') {
        const res = await fetch(`/api/v1/migrations?tenantId=${encodeURIComponent(tenantId)}&dryRun=${dryRun}`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/csv' },
          body: csvText,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Shopify migration failed');
        }

        if (dryRun) {
          setPreview(data.preview || []);
          setReport({
            totalProcessed: data.totalProcessed,
            insertedCount: data.totalProcessed,
            updatedCount: 0,
            skippedCount: 0,
          });
        } else {
          setReport(data);
        }
      } else {
        const res = await fetch(`/api/v1/migrations?tenantId=${encodeURIComponent(tenantId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'woocommerce',
            tenantId,
            storeUrl,
            consumerKey,
            consumerSecret,
            dryRun,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'WooCommerce sync failed');
        }

        setReport(data);
      }
    } catch (err: any) {
      setError(err.message || 'Migration encountered an error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 p-6 text-[#F4F6F9]">
      {/* Studio Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#1F2633] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <ZiroWordmark size="md" />
            <span className="text-xl font-bold tracking-tight text-white">1-Click Migration Studio</span>
            <StatusBadge variant="zero-fee" label="0% GMV Tax" />
          </div>
          <p className="text-sm text-[#8B95A5] mt-1">
            Seamlessly import Shopify CSV exports or synchronize WooCommerce catalogs with automated HSN/GST inference and vehicle fitment mapping.
          </p>
        </div>

        {/* Source Selector */}
        <div className="flex items-center bg-[#12161E] border border-[#1F2633] rounded-lg p-1">
          <button
            type="button"
            onClick={() => setSource('shopify')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
              source === 'shopify' ? 'bg-[#00E599] text-black shadow-sm' : 'text-[#8B95A5] hover:text-white'
            }`}
          >
            Shopify CSV
          </button>
          <button
            type="button"
            onClick={() => setSource('woocommerce')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
              source === 'woocommerce' ? 'bg-[#00E599] text-black shadow-sm' : 'text-[#8B95A5] hover:text-white'
            }`}
          >
            WooCommerce REST
          </button>
        </div>
      </div>

      {/* Control Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tenant Config */}
        <div className="bg-[#12161E] border border-[#1F2633] rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white tracking-wide uppercase">Target Merchant Tenant</h3>
          <div>
            <label className="text-xs text-[#8B95A5] block mb-1">Tenant ID</label>
            <input
              type="text"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="w-full bg-[#090B0E] border border-[#1F2633] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00E599]"
            />
          </div>

          <div className="pt-2 border-t border-[#1F2633]">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-[#8B95A5]">Dry-Run Simulation Mode</span>
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="w-4 h-4 accent-[#00E599] rounded cursor-pointer"
              />
            </label>
            <p className="text-[11px] text-[#8B95A5] mt-1">
              Preview HSN/GST and fitment classifications without mutating the production database.
            </p>
          </div>
        </div>

        {/* Source Inputs */}
        <div className="md:col-span-2 bg-[#12161E] border border-[#1F2633] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white tracking-wide uppercase">
              {source === 'shopify' ? 'Shopify CSV Data' : 'WooCommerce REST Credentials'}
            </h3>
            <span className="text-xs font-mono text-[#00E599]">Invariant: Platform Fee = 0 bps</span>
          </div>

          {source === 'shopify' ? (
            <div>
              <textarea
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Paste Shopify CSV export here..."
                className="w-full bg-[#090B0E] border border-[#1F2633] rounded-lg p-3 text-xs font-mono text-[#F4F6F9] focus:outline-none focus:border-[#00E599]"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#8B95A5] block mb-1">Store URL (Public Domain)</label>
                <input
                  type="url"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  placeholder="https://yourstore.com"
                  className="w-full bg-[#090B0E] border border-[#1F2633] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00E599]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#8B95A5] block mb-1">Consumer Key</label>
                  <input
                    type="password"
                    value={consumerKey}
                    onChange={(e) => setConsumerKey(e.target.value)}
                    className="w-full bg-[#090B0E] border border-[#1F2633] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00E599]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#8B95A5] block mb-1">Consumer Secret</label>
                  <input
                    type="password"
                    value={consumerSecret}
                    onChange={(e) => setConsumerSecret(e.target.value)}
                    className="w-full bg-[#090B0E] border border-[#1F2633] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00E599]"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={handleMigration}
              className="bg-[#00E599] hover:bg-[#00C982] text-black font-semibold text-sm px-6 py-2.5 rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Processing...' : dryRun ? 'Preview Migration (Dry-Run)' : 'Execute 1-Click Migration'}
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-950/40 border border-red-500/50 rounded-xl text-red-200 text-sm">
          <strong>Migration Error:</strong> {error}
        </div>
      )}

      {/* Report Cards */}
      {report && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Total Processed" value={String(report.totalProcessed)} />
          <MetricCard label="Inserted Products" value={String(report.insertedCount)} deltaTone="mint" />
          <MetricCard label="Updated Products" value={String(report.updatedCount)} />
          <MetricCard label="Skipped / Idempotent" value={String(report.skippedCount)} />
        </div>
      )}

      {/* Dry Run Preview Table */}
      {preview.length > 0 && (
        <div className="bg-[#12161E] border border-[#1F2633] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white tracking-wide uppercase">
              Dry-Run Classification Preview ({preview.length} items)
            </h3>
            <span className="text-xs text-[#8B95A5]">Automated HSN & GST inference</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1F2633] text-[#8B95A5]">
                  <th className="py-2 px-3">Handle</th>
                  <th className="py-2 px-3">Title</th>
                  <th className="py-2 px-3">HSN Code</th>
                  <th className="py-2 px-3">GST Slab</th>
                  <th className="py-2 px-3">Fitments</th>
                  <th className="py-2 px-3">Variants</th>
                  <th className="py-2 px-3">Platform Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2633] font-mono">
                {preview.map((p) => (
                  <tr key={p.handle} className="hover:bg-[#1A202C]">
                    <td className="py-2 px-3 text-[#00E599]">{p.handle}</td>
                    <td className="py-2 px-3 text-white font-sans">{p.title}</td>
                    <td className="py-2 px-3">{p.hsnCode}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 font-bold">
                        {p.gstSlab}%
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[#8B95A5]">
                      {p.fitments.length > 0 ? `${p.fitments.length} models` : 'Universal'}
                    </td>
                    <td className="py-2 px-3">{p.variants.length}</td>
                    <td className="py-2 px-3 text-[#00E599] font-bold">0% GMV</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
