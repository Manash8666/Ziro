'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ZiroWordmark, ZiroButton } from '@ziro/ui-kit';

export default function B2bQuickOrderPage() {
  const [csvInput, setCsvInput] = useState('BRK-001,10\nOIL-002,25');
  const [parsedRows, setParsedRows] = useState<Array<{ sku: string; qty: number }>>([]);

  const parseCsv = () => {
    const rows = csvInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [sku, qtyRaw] = line.split(',');
        return { sku: (sku ?? '').trim(), qty: Number(qtyRaw ?? '1') };
      })
      .filter((r) => r.sku.length > 0 && Number.isFinite(r.qty) && r.qty > 0);
    setParsedRows(rows);
  };

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <header className="flex items-center justify-between border-b border-[#1F2633] pb-4">
        <ZiroWordmark />
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-[#8B95A5] hover:text-[#F4F6F9]">Counter</Link>
          <Link href="/warehouse" className="text-[#8B95A5] hover:text-[#F4F6F9]">Warehouse</Link>
          <Link href="/b2b" className="text-[#00E599] font-medium">B2B Quick Order</Link>
        </nav>
      </header>

      <div className="rounded-lg border border-[#1F2633] bg-[#12161E] p-6 space-y-4">
        <h1 className="text-lg font-medium">B2B Wholesale Quick-Order CSV / SKU Grid</h1>
        <textarea
          rows={5}
          value={csvInput}
          onChange={(e) => setCsvInput(e.target.value)}
          className="w-full rounded border border-[#1F2633] bg-[#090B0E] p-3 font-mono text-sm"
        />
        <ZiroButton variant="primary" onClick={parseCsv}>Parse Wholesale Grid</ZiroButton>

        {parsedRows.length > 0 && (
          <div className="border-t border-[#1F2633] pt-4 space-y-2">
            {parsedRows.map((row, idx) => (
              <div key={`${row.sku}-${idx}`} className="flex justify-between font-mono text-sm">
                <span>{row.sku}</span>
                <span className="text-[#00E599]">Qty: {row.qty}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
