'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { ZiroButton, StatusBadge } from '@ziro/ui-kit';
import {
  searchProductsSemantic,
  type SemanticSearchResultItem,
  type SemanticFitmentFilter,
} from '../../app/actions/semantic-search';

interface SemanticFitmentSearchBarProps {
  onResultsChange?: (results: SemanticSearchResultItem[]) => void;
  className?: string;
}

const VEHICLE_MAKES = ['All Makes', 'Toyota', 'Mahindra', 'Hyundai', 'Tata', 'Maruti Suzuki', 'Porsche'];
const VEHICLE_MODELS: Record<string, string[]> = {
  Toyota: ['Fortuner', 'Hilux', 'Innova Crysta'],
  Mahindra: ['Thar', 'Scorpio', 'XUV700'],
  Hyundai: ['Creta', 'Verna', 'Tucson'],
  Tata: ['Harrier', 'Safari', 'Nexon'],
  'Maruti Suzuki': ['Jimny', 'Grand Vitara', 'Breza'],
  Porsche: ['911 GT3', 'Cayenne', 'Macan'],
};

export function SemanticFitmentSearchBar({ onResultsChange, className = '' }: SemanticFitmentSearchBarProps) {
  const [query, setQuery] = useState('');
  const [make, setMake] = useState('All Makes');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('2024');
  const [results, setResults] = useState<SemanticSearchResultItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchSource, setSearchSource] = useState<'pulse-ai' | 'fallback' | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleMakeChange = (newMake: string) => {
    setMake(newMake);
    setModel('');
  };

  const executeSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    startTransition(async () => {
      const fitment: SemanticFitmentFilter = {
        ...(make !== 'All Makes' ? { make } : {}),
        ...(model ? { model } : {}),
        ...(year ? { year } : {}),
      };

      const res = await searchProductsSemantic(query, fitment);
      setResults(res.results);
      setHasSearched(true);
      setSearchSource(res.source);
      if (onResultsChange) {
        onResultsChange(res.results);
      }
    });
  };

  const availableModels = make !== 'All Makes' && VEHICLE_MODELS[make] ? VEHICLE_MODELS[make] : [];

  return (
    <div className={`rounded-xl border border-[#1F2633] bg-[#12161E]/95 backdrop-blur-md p-6 space-y-5 shadow-2xl ${className}`}>
      {/* Header bar with Ziro Invariant Pill */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1F2633] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00E599]/10 text-[#00E599] font-mono text-sm font-bold">
            0%
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#F4F6F9]">AI Semantic Fitment Search</h3>
            <p className="text-xs text-[#8B95A5]">1024-dimension BAAI/bge-m3 dense vector catalog retrieval</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge variant="zero-fee" label="0% GMV Tax Shield" />
          {searchSource && (
            <span className="rounded bg-[#1F2633] px-2 py-0.5 text-[10px] font-mono text-[#00E599]">
              {searchSource === 'pulse-ai' ? '⚡ Pulse AI Vector Engine' : '📦 Resilient Catalog Fallback'}
            </span>
          )}
        </div>
      </div>

      {/* Main Search and Fitment Controls */}
      <form onSubmit={executeSearch} className="space-y-4">
        {/* Natural Language Search Input */}
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe what you need: e.g. 'ceramic front brake pads for heavy offroad use' or 'synthetic oil filter'"
            className="w-full rounded-lg border border-[#1F2633] bg-[#090B0E] px-4 py-3 text-sm text-[#F4F6F9] placeholder-[#4B5565] focus:border-[#00E599] focus:outline-none transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-3 text-xs text-[#8B95A5] hover:text-[#F4F6F9]"
            >
              Clear
            </button>
          )}
        </div>

        {/* Vehicle Fitment Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <select
            value={make}
            onChange={(e) => handleMakeChange(e.target.value)}
            className="rounded-lg border border-[#1F2633] bg-[#090B0E] px-3 py-2.5 text-xs text-[#F4F6F9] focus:border-[#00E599] focus:outline-none"
          >
            {VEHICLE_MAKES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={make === 'All Makes'}
            className="rounded-lg border border-[#1F2633] bg-[#090B0E] px-3 py-2.5 text-xs text-[#F4F6F9] focus:border-[#00E599] focus:outline-none disabled:opacity-40"
          >
            <option value="">{make === 'All Makes' ? 'Select Make First' : 'All Models'}</option>
            {availableModels.map((mdl) => (
              <option key={mdl} value={mdl}>
                {mdl}
              </option>
            ))}
          </select>

          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="Year (e.g. 2024)"
            min={1990}
            max={2030}
            className="rounded-lg border border-[#1F2633] bg-[#090B0E] px-3 py-2.5 text-xs font-mono text-[#F4F6F9] focus:border-[#00E599] focus:outline-none"
          />

          <ZiroButton type="submit" variant="primary" loading={isPending} className="w-full">
            {isPending ? 'Searching...' : 'Search Catalog'}
          </ZiroButton>
        </div>
      </form>

      {/* Results Section */}
      {hasSearched && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs text-[#8B95A5]">
            <span>
              Found <strong className="text-[#00E599]">{results.length}</strong> matching automotive & industrial components
            </span>
            {make !== 'All Makes' && (
              <span className="font-mono text-[#00E599]">
                ✓ Filtering for {make} {model ? model : ''} ({year})
              </span>
            )}
          </div>

          {results.length === 0 ? (
            <div className="rounded-lg border border-[#1F2633] bg-[#090B0E]/60 p-6 text-center text-sm text-[#8B95A5]">
              No exact fitment matches found for this query. Try removing vehicle filters or widening search terms.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {results.map((item) => {
                const priceFormatted = (item.minPricePaise / 100).toLocaleString('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                });
                return (
                  <div
                    key={item.productId}
                    className="flex flex-col justify-between rounded-lg border border-[#1F2633] bg-[#090B0E] p-4 hover:border-[#00E599]/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded bg-[#00E599]/10 px-2 py-0.5 text-[10px] font-mono text-[#00E599]">
                          {Math.round(item.similarityScore * 100)}% Match
                        </span>
                        <span className="text-[10px] font-mono text-[#8B95A5]">HSN {item.hsnCode} • {item.gstSlabPercent}% GST</span>
                      </div>
                      <h4 className="mt-2 text-sm font-semibold text-[#F4F6F9] line-clamp-1">
                        {item.title}
                      </h4>
                      <p className="mt-1 text-xs text-[#8B95A5] line-clamp-2">
                        {item.semanticText}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-[#1F2633] pt-3">
                      <div>
                        <span className="text-xs text-[#8B95A5]">Price (0% fee): </span>
                        <span className="text-sm font-mono font-bold text-[#F4F6F9]">{priceFormatted}</span>
                      </div>
                      <Link
                        href={`/products/${item.handle}`}
                        className="rounded bg-[#12161E] px-3 py-1 text-xs font-medium text-[#00E599] hover:bg-[#00E599]/10 border border-[#1F2633] transition-colors"
                      >
                        View Fitment →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
