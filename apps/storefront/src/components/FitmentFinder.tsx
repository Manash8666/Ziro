'use client';

import { useState } from 'react';
import { ZiroButton } from '@ziro/ui-kit';

export function FitmentFinder() {
  const [year, setYear] = useState('2021');
  const [make, setMake] = useState('Hyundai');
  const [model, setModel] = useState('Creta');
  const [status, setStatus] = useState<string>('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(`Matched 4 verified fitment parts for ${year} ${make} ${model}`);
  };

  return (
    <form
      onSubmit={handleSearch}
      className="rounded-lg border border-[#1F2633] bg-[#12161E] p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-[#F4F6F9]">Vehicle Fitment Finder</h2>
        <span className="text-xs font-mono text-[#00E599]">Y / M / M Verified</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <input
          aria-label="Vehicle Year"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          placeholder="Year"
          className="rounded border border-[#1F2633] bg-[#090B0E] px-3 py-2 text-sm font-mono"
        />
        <input
          aria-label="Vehicle Make"
          value={make}
          onChange={(e) => setMake(e.target.value)}
          placeholder="Make"
          className="rounded border border-[#1F2633] bg-[#090B0E] px-3 py-2 text-sm"
        />
        <input
          aria-label="Vehicle Model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="Model"
          className="rounded border border-[#1F2633] bg-[#090B0E] px-3 py-2 text-sm"
        />
        <ZiroButton type="submit" variant="primary">
          Find Parts
        </ZiroButton>
      </div>
      {status && <p className="text-xs font-mono text-[#00E599]">{status}</p>}
    </form>
  );
}
