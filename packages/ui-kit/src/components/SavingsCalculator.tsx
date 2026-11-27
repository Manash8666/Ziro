'use client';

import React, { useState } from 'react';

export interface AnnualSavingsInput {
  annualGmvDollars: number;
  averageOrderValueDollars?: number;
}

export interface AnnualSavingsResult {
  annualGmvDollars: number;
  orderCount: number;
  legacyPercentageFeeDollars: number;
  legacyFixedFeeDollars: number;
  legacyFeeDollars: number;
  ziroPlatformFeeDollars: number;
  netSavingsDollars: number;
}

/**
 * Calculates exact annual transaction tax savings on Ziro compared to legacy platforms
 * (Standard 2.9% + $0.30/txn). Ziro retains 0% platform GMV fee.
 */
export function calculateAnnualSavings({
  annualGmvDollars,
  averageOrderValueDollars = 50,
}: AnnualSavingsInput): AnnualSavingsResult {
  const safeAov = Math.max(1, averageOrderValueDollars);
  const orderCount = Math.round(annualGmvDollars / safeAov);

  const legacyPercentageFeeDollars = Math.round(annualGmvDollars * 0.029);
  const legacyFixedFeeDollars = Math.round(orderCount * 0.3);
  const legacyFeeDollars = legacyPercentageFeeDollars + legacyFixedFeeDollars;
  const ziroPlatformFeeDollars = 0;
  const netSavingsDollars = legacyFeeDollars - ziroPlatformFeeDollars;

  return {
    annualGmvDollars,
    orderCount,
    legacyPercentageFeeDollars,
    legacyFixedFeeDollars,
    legacyFeeDollars,
    ziroPlatformFeeDollars,
    netSavingsDollars,
  };
}

export interface SavingsCalculatorProps {
  initialGmvDollars?: number;
  initialAovDollars?: number;
  className?: string;
}

export const SavingsCalculator: React.FC<SavingsCalculatorProps> = ({
  initialGmvDollars = 500000,
  initialAovDollars = 50,
  className = '',
}) => {
  const [gmv, setGmv] = useState(initialGmvDollars);
  const [aov, setAov] = useState(initialAovDollars);

  const savings = calculateAnnualSavings({
    annualGmvDollars: gmv,
    averageOrderValueDollars: aov,
  });

  return (
    <div className={`rounded-xl border border-[var(--ziro-border-hairline,#3D1C26)] bg-[var(--ziro-bg-card,#221016)] p-6 lg:p-8 space-y-6 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--ziro-border-hairline,#3D1C26)] pb-4">
        <div>
          <h3 className="text-xl font-bold text-[var(--ziro-text-primary,#F6DCE2)] font-sans">
            Transaction Tax ROI Calculator
          </h3>
          <p className="text-xs text-[var(--ziro-text-secondary,#C9A3AC)] mt-1">
            Calculate how much capital stays in your company with Ziro's 0% GMV fee model.
          </p>
        </div>
        <span className="font-mono text-xs font-semibold text-[var(--ziro-cta-bg,#E8A5B5)] bg-[var(--ziro-badge-bg,rgba(122,36,59,0.35))] px-3 py-1 rounded-full border border-[var(--ziro-badge-border,#7A243B)]">
          0% GMV Fee Guaranteed
        </span>
      </div>

      {/* Inputs */}
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs font-mono mb-1">
            <span className="text-[var(--ziro-text-secondary,#C9A3AC)]">ANNUAL GMV</span>
            <span className="text-[var(--ziro-cta-bg,#E8A5B5)] font-bold ziro-tabular">
              ${gmv.toLocaleString()}
            </span>
          </div>
          <input
            type="range"
            min={10000}
            max={5000000}
            step={10000}
            value={gmv}
            onChange={(e) => setGmv(Number(e.target.value))}
            className="w-full accent-[var(--ziro-cta-bg,#E8A5B5)] bg-[var(--ziro-bg-canvas,#14090D)] h-2 rounded cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs font-mono mb-1">
            <span className="text-[var(--ziro-text-secondary,#C9A3AC)]">AVERAGE ORDER VALUE (AOV)</span>
            <span className="text-[var(--ziro-text-primary,#F6DCE2)] font-bold ziro-tabular">
              ${aov.toLocaleString()}
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={500}
            step={5}
            value={aov}
            onChange={(e) => setAov(Number(e.target.value))}
            className="w-full accent-[var(--ziro-cta-bg,#E8A5B5)] bg-[var(--ziro-bg-canvas,#14090D)] h-2 rounded cursor-pointer"
          />
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="rounded-lg border border-[var(--ziro-border-hairline,#3D1C26)] bg-[var(--ziro-bg-canvas,#14090D)] p-4 space-y-1">
          <span className="text-xs font-mono text-[var(--ziro-text-secondary,#C9A3AC)]">LEGACY PLATFORM TAKE</span>
          <p className="text-2xl font-bold font-mono text-[#D9485C] ziro-tabular">
            ${savings.legacyFeeDollars.toLocaleString()}
          </p>
          <span className="text-[10px] text-[var(--ziro-text-secondary,#C9A3AC)]">2.9% + 30¢ / transaction</span>
        </div>

        <div className="rounded-lg border border-[var(--ziro-accent-brand,#7A243B)]/40 bg-[var(--ziro-badge-bg,rgba(122,36,59,0.25))] p-4 space-y-1">
          <span className="text-xs font-mono text-[var(--ziro-cta-bg,#E8A5B5)]">ZIRO PLATFORM FEE</span>
          <p className="text-2xl font-bold font-mono text-[var(--ziro-cta-bg,#E8A5B5)] ziro-tabular">
            $0
          </p>
          <span className="text-[10px] text-[var(--ziro-cta-bg,#E8A5B5)]">0% Flat Hosting Model</span>
        </div>

        <div className="rounded-lg border border-[var(--ziro-cta-bg,#E8A5B5)] bg-[var(--ziro-bg-card,#221016)] p-4 space-y-1">
          <span className="text-xs font-mono text-[var(--ziro-text-primary,#F6DCE2)]">Net Annual Savings</span>
          <p className="text-2xl font-bold font-mono text-[var(--ziro-cta-bg,#E8A5B5)] ziro-tabular">
            ${savings.netSavingsDollars.toLocaleString()}
          </p>
          <span className="text-[10px] text-[var(--ziro-text-secondary,#C9A3AC)]">Retained Operating Cash</span>
        </div>
      </div>
    </div>
  );
};
