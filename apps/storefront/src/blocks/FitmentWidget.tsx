'use client';

import { useState } from 'react';
import { ZiroButton } from '@ziro/ui-kit';

export interface FitmentWidgetProps {
  title?: string;
  onSearch?: (criteria: { year: string; make: string; model: string }) => void;
}

export function FitmentWidget({
  title = 'Vehicle & Machinery Fitment Finder',
  onSearch,
}: FitmentWidgetProps) {
  const [year, setYear] = useState('2024');
  const [make, setMake] = useState('Toyota');
  const [model, setModel] = useState('Hilux');
  const [matchCount, setMatchCount] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMatchCount(8);
    onSearch?.({ year, make, model });
  };

  return (
    <div className="rounded-xl border border-[#1F2633] bg-[#12161E] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[#F4F6F9]">{title}</h3>
          <p className="text-xs text-[#8B95A5]">
            Filter guaranteed compatible spare parts & assemblies
          </p>
        </div>
        <span className="font-mono text-xs text-[#00E599] bg-[#00E599]/10 px-2 py-1 rounded">
          Guaranteed Fitment
        </span>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-mono text-[#8B95A5] mb-1">YEAR</label>
          <input
            type="text"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full rounded border border-[#1F2633] bg-[#090B0E] px-3 py-2 text-sm text-[#F4F6F9] font-mono focus:border-[#00E599] focus:outline-none"
            placeholder="e.g. 2024"
          />
        </div>

        <div>
          <label className="block text-xs font-mono text-[#8B95A5] mb-1">MAKE</label>
          <input
            type="text"
            value={make}
            onChange={(e) => setMake(e.target.value)}
            className="w-full rounded border border-[#1F2633] bg-[#090B0E] px-3 py-2 text-sm text-[#F4F6F9] focus:border-[#00E599] focus:outline-none"
            placeholder="e.g. Toyota"
          />
        </div>

        <div>
          <label className="block text-xs font-mono text-[#8B95A5] mb-1">MODEL</label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full rounded border border-[#1F2633] bg-[#090B0E] px-3 py-2 text-sm text-[#F4F6F9] focus:border-[#00E599] focus:outline-none"
            placeholder="e.g. Hilux"
          />
        </div>

        <div className="flex items-end">
          <ZiroButton type="submit" variant="primary" className="w-full">
            Verify Fitment
          </ZiroButton>
        </div>
      </form>

      {matchCount !== null && (
        <p className="text-xs font-mono text-[#00E599] pt-2">
          ✓ Verified {matchCount} direct-fit components matching {year} {make} {model}
        </p>
      )}
    </div>
  );
}
