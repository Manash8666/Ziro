'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@ziro/ui-kit';

export type ConsoleTab = 'storefront' | 'admin' | 'pos' | 'split-admin-pos' | 'split-admin-store';
export type ViewportMode = 'desktop' | 'tablet' | 'mobile';

interface OmniConsoleClientProps {
  initialTab?: ConsoleTab;
  defaultStorefrontUrl?: string;
  defaultAdminUrl?: string;
  defaultPosUrl?: string;
}

export function OmniConsoleClient({
  initialTab = 'split-admin-pos',
  defaultStorefrontUrl = 'https://ziro-storefront.vercel.app',
  defaultAdminUrl = '/admin',
  defaultPosUrl = 'https://ziro-pos.vercel.app',
}: OmniConsoleClientProps) {
  const [activeTab, setActiveTab] = useState<ConsoleTab>(initialTab);
  const [viewport, setViewport] = useState<ViewportMode>('desktop');
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Sync initial tab from URL search params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as ConsoleTab | null;
      if (tabParam && ['storefront', 'admin', 'pos', 'split-admin-pos', 'split-admin-store'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const storefrontUrl =
    process.env.NEXT_PUBLIC_STOREFRONT_URL ?? defaultStorefrontUrl;
  const adminUrl = defaultAdminUrl;
  const posUrl =
    process.env.NEXT_PUBLIC_POS_URL ?? defaultPosUrl;

  const currentUrl =
    activeTab === 'storefront'
      ? storefrontUrl
      : activeTab === 'admin'
        ? (typeof window !== 'undefined' ? `${window.location.origin}${adminUrl}` : adminUrl)
        : activeTab === 'pos'
          ? posUrl
          : `${storefrontUrl} | ${posUrl}`;

  const viewportWidthClass =
    viewport === 'mobile'
      ? 'max-w-[390px] h-[820px] rounded-2xl border border-[var(--ziro-border-hairline,#3D1C26)] shadow-2xl mx-auto overflow-hidden'
      : viewport === 'tablet'
        ? 'max-w-[768px] h-[900px] rounded-xl border border-[var(--ziro-border-hairline,#3D1C26)] shadow-2xl mx-auto overflow-hidden'
        : 'w-full h-full';

  return (
    <div className="flex h-[calc(100vh-57px)] w-full flex-col bg-[var(--ziro-bg-canvas,#14090D)] text-[var(--ziro-text-primary,#F6DCE2)] overflow-hidden transition-colors duration-200">
      {/* Top Console Toolbar */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--ziro-border-hairline,#3D1C26)] bg-[var(--ziro-bg-card,#221016)] px-4 py-2 text-xs">
        {/* Left: Mode Switcher Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="font-mono font-bold text-[var(--ziro-cta-bg,#E8A5B5)] pr-2 hidden sm:inline-block">
            ZIRO 3-IN-1:
          </span>

          <button
            type="button"
            onClick={() => setActiveTab('split-admin-pos')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold transition-all ${
              activeTab === 'split-admin-pos'
                ? 'bg-[var(--ziro-badge-bg,rgba(122,36,59,0.35))] text-[var(--ziro-cta-bg,#E8A5B5)] border border-[var(--ziro-badge-border,#7A243B)] shadow-sm'
                : 'text-[var(--ziro-text-secondary,#C9A3AC)] hover:bg-[var(--ziro-bg-card-hover,#2E121B)] hover:text-[var(--ziro-text-primary,#F6DCE2)]'
            }`}
          >
            <span>⚡ Split (Admin + POS)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('split-admin-store')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold transition-all ${
              activeTab === 'split-admin-store'
                ? 'bg-[var(--ziro-badge-bg,rgba(122,36,59,0.35))] text-[var(--ziro-cta-bg,#E8A5B5)] border border-[var(--ziro-badge-border,#7A243B)] shadow-sm'
                : 'text-[var(--ziro-text-secondary,#C9A3AC)] hover:bg-[var(--ziro-bg-card-hover,#2E121B)] hover:text-[var(--ziro-text-primary,#F6DCE2)]'
            }`}
          >
            <span>⚡ Split (Admin + Store)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('storefront')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold transition-all ${
              activeTab === 'storefront'
                ? 'bg-[var(--ziro-badge-bg,rgba(122,36,59,0.35))] text-[var(--ziro-cta-bg,#E8A5B5)] border border-[var(--ziro-badge-border,#7A243B)] shadow-sm'
                : 'text-[var(--ziro-text-secondary,#C9A3AC)] hover:bg-[var(--ziro-bg-card-hover,#2E121B)] hover:text-[var(--ziro-text-primary,#F6DCE2)]'
            }`}
          >
            <span>🛍️ Storefront</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold transition-all ${
              activeTab === 'admin'
                ? 'bg-[var(--ziro-badge-bg,rgba(122,36,59,0.35))] text-[var(--ziro-cta-bg,#E8A5B5)] border border-[var(--ziro-badge-border,#7A243B)] shadow-sm'
                : 'text-[var(--ziro-text-secondary,#C9A3AC)] hover:bg-[var(--ziro-bg-card-hover,#2E121B)] hover:text-[var(--ziro-text-primary,#F6DCE2)]'
            }`}
          >
            <span>⚙️ Merchant Admin</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold transition-all ${
              activeTab === 'pos'
                ? 'bg-[var(--ziro-badge-bg,rgba(122,36,59,0.35))] text-[var(--ziro-cta-bg,#E8A5B5)] border border-[var(--ziro-badge-border,#7A243B)] shadow-sm'
                : 'text-[var(--ziro-text-secondary,#C9A3AC)] hover:bg-[var(--ziro-bg-card-hover,#2E121B)] hover:text-[var(--ziro-text-primary,#F6DCE2)]'
            }`}
          >
            <span>📟 Counter POS</span>
          </button>
        </div>

        {/* Center / Right Controls: Viewport Mode, Direct Link & Theme Toggle */}
        <div className="flex items-center gap-2">
          {/* Luxury Theme Toggle */}
          <ThemeToggle size="sm" />

          {/* Viewport switchers (only in single-tab view) */}
          {!activeTab.startsWith('split') && (
            <div className="hidden sm:flex items-center rounded-lg border border-[var(--ziro-border-hairline,#3D1C26)] bg-[var(--ziro-bg-canvas,#14090D)] p-0.5">
              <button
                type="button"
                onClick={() => setViewport('desktop')}
                title="Desktop View"
                className={`rounded px-2 py-1 font-mono text-[11px] transition-colors ${
                  viewport === 'desktop'
                    ? 'bg-[var(--ziro-badge-bg,rgba(122,36,59,0.35))] text-[var(--ziro-cta-bg,#E8A5B5)] font-bold'
                    : 'text-[var(--ziro-text-secondary,#C9A3AC)] hover:text-[var(--ziro-text-primary,#F6DCE2)]'
                }`}
              >
                🖥️ 100%
              </button>
              <button
                type="button"
                onClick={() => setViewport('tablet')}
                title="iPad / Tablet View"
                className={`rounded px-2 py-1 font-mono text-[11px] transition-colors ${
                  viewport === 'tablet'
                    ? 'bg-[var(--ziro-badge-bg,rgba(122,36,59,0.35))] text-[var(--ziro-cta-bg,#E8A5B5)] font-bold'
                    : 'text-[var(--ziro-text-secondary,#C9A3AC)] hover:text-[var(--ziro-text-primary,#F6DCE2)]'
                }`}
              >
                📱 Tablet
              </button>
              <button
                type="button"
                onClick={() => setViewport('mobile')}
                title="Mobile View"
                className={`rounded px-2 py-1 font-mono text-[11px] transition-colors ${
                  viewport === 'mobile'
                    ? 'bg-[var(--ziro-badge-bg,rgba(122,36,59,0.35))] text-[var(--ziro-cta-bg,#E8A5B5)] font-bold'
                    : 'text-[var(--ziro-text-secondary,#C9A3AC)] hover:text-[var(--ziro-text-primary,#F6DCE2)]'
                }`}
              >
                📱 Mobile
              </button>
            </div>
          )}

          {/* Reload active views */}
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            title="Reload View"
            className="rounded-lg border border-[var(--ziro-border-hairline,#3D1C26)] bg-[var(--ziro-bg-canvas,#14090D)] px-2 py-1 font-mono text-xs text-[var(--ziro-text-secondary,#C9A3AC)] hover:text-[var(--ziro-cta-bg,#E8A5B5)] transition-colors"
          >
            ⟳ Reload
          </button>

          {/* Open current in external tab */}
          <a
            href={
              activeTab === 'storefront'
                ? storefrontUrl
                : activeTab === 'admin'
                  ? adminUrl
                  : activeTab === 'pos'
                    ? posUrl
                    : storefrontUrl
            }
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded-lg border border-[var(--ziro-border-hairline,#3D1C26)] bg-[var(--ziro-bg-canvas,#14090D)] px-2.5 py-1 font-mono text-xs text-[var(--ziro-text-secondary,#C9A3AC)] hover:border-[var(--ziro-border-hover,#7A243B)] hover:text-[var(--ziro-cta-bg,#E8A5B5)] transition-colors"
          >
            <span>Open Tab ↗</span>
          </a>

          {/* 0% Tax Invariant Badge */}
          <span className="hidden xl:inline-flex items-center rounded-full bg-[var(--ziro-badge-bg,rgba(122,36,59,0.35))] px-2 py-0.5 font-mono text-[10px] text-[var(--ziro-cta-bg,#E8A5B5)] border border-[var(--ziro-badge-border,#7A243B)] font-bold">
            0% GMV Toll
          </span>
        </div>
      </header>

      {/* Main Workspace Frame Area */}
      <main className="flex-1 overflow-hidden bg-[var(--ziro-bg-canvas,#14090D)] p-2">
        {/* VIEW 1: SPLIT SCREEN (Merchant Admin Left, Counter POS Right) */}
        {activeTab === 'split-admin-pos' && (
          <div className="grid h-full w-full grid-cols-1 md:grid-cols-2 gap-2">
            {/* Left: Merchant Admin */}
            <div className="flex flex-col h-full rounded-xl border border-[var(--ziro-border-hairline,#3D1C26)] bg-[var(--ziro-bg-canvas,#14090D)] overflow-hidden shadow-lg">
              <div className="flex items-center justify-between border-b border-[var(--ziro-border-hairline,#3D1C26)] bg-[var(--ziro-bg-card,#221016)] px-3 py-1.5 font-mono text-[11px] text-[var(--ziro-text-secondary,#C9A3AC)]">
                <div className="flex items-center gap-1.5 text-[var(--ziro-text-primary,#F6DCE2)] font-semibold">
                  <span>⚙️ Merchant Admin Shell</span>
                  <span className="text-[10px] text-[var(--ziro-cta-bg,#E8A5B5)] font-bold">● Live Operations</span>
                </div>
                <a href={adminUrl} target="_blank" rel="noreferrer" className="hover:text-[var(--ziro-cta-bg,#E8A5B5)]">
                  Popout ↗
                </a>
              </div>
              <iframe
                key={`split-admin-${refreshKey}`}
                src={adminUrl}
                title="Merchant Admin Shell"
                className="h-full w-full border-0 bg-[var(--ziro-bg-canvas,#14090D)]"
              />
            </div>

            {/* Right: Counter POS */}
            <div className="flex flex-col h-full rounded-xl border border-[var(--ziro-border-hairline,#3D1C26)] bg-[var(--ziro-bg-canvas,#14090D)] overflow-hidden shadow-lg">
              <div className="flex items-center justify-between border-b border-[var(--ziro-border-hairline,#3D1C26)] bg-[var(--ziro-bg-card,#221016)] px-3 py-1.5 font-mono text-[11px] text-[var(--ziro-text-secondary,#C9A3AC)]">
                <div className="flex items-center gap-1.5 text-[var(--ziro-text-primary,#F6DCE2)] font-semibold">
                  <span>📟 Offline Counter POS</span>
                  <span className="text-[10px] text-[var(--ziro-cta-bg,#E8A5B5)] font-bold">● Serwist PWA</span>
                </div>
                <a href={posUrl} target="_blank" rel="noreferrer" className="hover:text-[var(--ziro-cta-bg,#E8A5B5)]">
                  Popout ↗
                </a>
              </div>
              <iframe
                key={`split-pos-${refreshKey}`}
                src={posUrl}
                title="Counter POS Terminal"
                allow="serial; usb; clipboard-read; clipboard-write; camera"
                className="h-full w-full border-0 bg-[var(--ziro-bg-canvas,#14090D)]"
              />
            </div>
          </div>
        )}

        {/* VIEW 2: SPLIT SCREEN (Merchant Admin Left, Storefront Right) */}
        {activeTab === 'split-admin-store' && (
          <div className="grid h-full w-full grid-cols-1 md:grid-cols-2 gap-2">
            {/* Left: Merchant Admin */}
            <div className="flex flex-col h-full rounded-xl border border-[var(--ziro-border-hairline,#3D1C26)] bg-[var(--ziro-bg-canvas,#14090D)] overflow-hidden shadow-lg">
              <div className="flex items-center justify-between border-b border-[var(--ziro-border-hairline,#3D1C26)] bg-[var(--ziro-bg-card,#221016)] px-3 py-1.5 font-mono text-[11px] text-[var(--ziro-text-secondary,#C9A3AC)]">
                <div className="flex items-center gap-1.5 text-[var(--ziro-text-primary,#F6DCE2)] font-semibold">
                  <span>⚙️ Merchant Admin Shell</span>
                  <span className="text-[10px] text-[var(--ziro-cta-bg,#E8A5B5)] font-bold">● Live Operations</span>
                </div>
                <a href={adminUrl} target="_blank" rel="noreferrer" className="hover:text-[var(--ziro-cta-bg,#E8A5B5)]">
                  Popout ↗
                </a>
              </div>
              <iframe
                key={`split-admin2-${refreshKey}`}
                src={adminUrl}
                title="Merchant Admin Shell"
                className="h-full w-full border-0 bg-[var(--ziro-bg-canvas,#14090D)]"
              />
            </div>

            {/* Right: Online Storefront */}
            <div className="flex flex-col h-full rounded-xl border border-[var(--ziro-border-hairline,#3D1C26)] bg-[var(--ziro-bg-canvas,#14090D)] overflow-hidden shadow-lg">
              <div className="flex items-center justify-between border-b border-[var(--ziro-border-hairline,#3D1C26)] bg-[var(--ziro-bg-card,#221016)] px-3 py-1.5 font-mono text-[11px] text-[var(--ziro-text-secondary,#C9A3AC)]">
                <div className="flex items-center gap-1.5 text-[var(--ziro-text-primary,#F6DCE2)] font-semibold">
                  <span>🛍️ Customer Storefront</span>
                  <span className="text-[10px] text-[var(--ziro-cta-bg,#E8A5B5)] font-bold">● 3D &amp; Fitment</span>
                </div>
                <a href={storefrontUrl} target="_blank" rel="noreferrer" className="hover:text-[var(--ziro-cta-bg,#E8A5B5)]">
                  Popout ↗
                </a>
              </div>
              <iframe
                key={`split-store-${refreshKey}`}
                src={storefrontUrl}
                title="Customer Storefront"
                className="h-full w-full border-0 bg-[var(--ziro-bg-canvas,#14090D)]"
              />
            </div>
          </div>
        )}

        {/* VIEW 3: SINGLE STOREFRONT */}
        <div className={`h-full w-full ${activeTab === 'storefront' ? 'block' : 'hidden'}`}>
          <div className={viewportWidthClass}>
            <iframe
              key={`single-storefront-${refreshKey}`}
              src={storefrontUrl}
              title="Customer Storefront"
              className="h-full w-full border-0 bg-[var(--ziro-bg-canvas,#14090D)]"
            />
          </div>
        </div>

        {/* VIEW 4: SINGLE MERCHANT ADMIN */}
        <div className={`h-full w-full ${activeTab === 'admin' ? 'block' : 'hidden'}`}>
          <div className={viewportWidthClass}>
            <iframe
              key={`single-admin-${refreshKey}`}
              src={adminUrl}
              title="Merchant Admin Shell"
              className="h-full w-full border-0 bg-[var(--ziro-bg-canvas,#14090D)]"
            />
          </div>
        </div>

        {/* VIEW 5: SINGLE COUNTER POS */}
        <div className={`h-full w-full ${activeTab === 'pos' ? 'block' : 'hidden'}`}>
          <div className={viewportWidthClass}>
            <iframe
              key={`single-pos-${refreshKey}`}
              src={posUrl}
              title="Counter POS Terminal"
              allow="serial; usb; clipboard-read; clipboard-write; camera"
              className="h-full w-full border-0 bg-[var(--ziro-bg-canvas,#14090D)]"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
