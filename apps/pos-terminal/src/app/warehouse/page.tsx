'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ZiroWordmark, ZiroButton } from '@ziro/ui-kit';
import { DexiePosStorage, ZiroPosDb } from '../../lib/db';
import { PosSyncEngine } from '../../lib/sync-engine';

export default function WarehouseAuditPage() {
  const [sku, setSku] = useState('BRK-001');
  const [countedQty, setCountedQty] = useState(12);
  const [auditMode, setAuditMode] = useState<'ABSOLUTE' | 'DELTA'>('ABSOLUTE');
  const [message, setMessage] = useState('');

  const submitAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    const storage = new DexiePosStorage(new ZiroPosDb());
    const engine = new PosSyncEngine({
      storage,
      deviceId: 'pos-scanner-01',
      locationId: 'loc_main',
      apiBaseUrl: process.env.NEXT_PUBLIC_COMMERCE_URL ?? 'http://localhost:9000',
    });
    const queued = await engine.queueStockAudit({ sku, counted_qty: countedQty, audit_mode: auditMode });
    setMessage(`Queued ${auditMode} stock audit for ${sku} (${queued.client_mutation_id})`);
  };

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <header className="flex items-center justify-between border-b border-[#1F2633] pb-4">
        <ZiroWordmark />
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-[#8B95A5] hover:text-[#F4F6F9]">Counter</Link>
          <Link href="/warehouse" className="text-[#00E599] font-medium">Warehouse</Link>
          <Link href="/b2b" className="text-[#8B95A5] hover:text-[#F4F6F9]">B2B Quick Order</Link>
        </nav>
      </header>

      <form onSubmit={submitAudit} className="rounded-lg border border-[#1F2633] bg-[#12161E] p-6 space-y-4">
        <h1 className="text-lg font-medium">Barcode Warehouse Stock Audit</h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="space-y-1 text-sm">
            <span className="text-[#8B95A5]">Barcode / SKU</span>
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full rounded border border-[#1F2633] bg-[#090B0E] px-3 py-2 font-mono text-sm"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-[#8B95A5]">Counted Quantity</span>
            <input
              type="number"
              value={countedQty}
              onChange={(e) => setCountedQty(Number(e.target.value))}
              className="w-full rounded border border-[#1F2633] bg-[#090B0E] px-3 py-2 font-mono text-sm"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-[#8B95A5]">Audit Mode</span>
            <select
              value={auditMode}
              onChange={(e) => setAuditMode(e.target.value as 'ABSOLUTE' | 'DELTA')}
              className="w-full rounded border border-[#1F2633] bg-[#090B0E] px-3 py-2 text-sm"
            >
              <option value="ABSOLUTE">ABSOLUTE (Physical Count)</option>
              <option value="DELTA">DELTA (Adjustment)</option>
            </select>
          </label>
        </div>
        <ZiroButton type="submit" variant="primary">Queue Stock Audit</ZiroButton>
        {message && <p className="text-xs text-[#00E599] font-mono">{message}</p>}
      </form>
    </div>
  );
}
