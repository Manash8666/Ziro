'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

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
      ? 'max-w-[390px] h-[820px] rounded-2xl border border-[#1F2633] shadow-2xl mx-auto overflow-hidden'
      : viewport === 'tablet'
        ? 'max-w-[768px] h-[900px] rounded-xl border border-[#1F2633] shadow-2xl mx-auto overflow-hidden'
        : 'w-full h-full';

  return (
    <div className="flex h-[calc(100vh-57px)] w-full flex-col bg-[#080A0D] text-[#F4F6F9] overflow-hidden">
      {/* Top Console Toolbar */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#1F2633] bg-[#090B0E] px-4 py-2 text-xs">
        {/* Left: Mode Switcher Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="font-mono font-bold text-[#00E599] pr-2 hidden sm:inline-block">
            ZIRO 3-IN-1:
          </span>

          <button
            type="button"
            onClick={() => setActiveTab('split-admin-pos')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold transition-all ${
              activeTab === 'split-admin-pos'
                ? 'bg-[#00E599]/15 text-[#00E599] border border-[#00E599]/40 shadow-sm'
                : 'text-[#8B95A5] hover:bg-[#12161E] hover:text-[#F4F6F9]'
            }`}
          >
            <span>⚡ Split (Admin + POS)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('split-admin-store')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold transition-all ${
              activeTab === 'split-admin-store'
                ? 'bg-[#00E599]/15 text-[#00E599] border border-[#00E599]/40 shadow-sm'
                : 'text-[#8B95A5] hover:bg-[#12161E] hover:text-[#F4F6F9]'
            }`}
          >
            <span>⚡ Split (Admin + Store)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('storefront')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold transition-all ${
              activeTab === 'storefront'
                ? 'bg-[#00E599]/15 text-[#00E599] border border-[#00E599]/40 shadow-sm'
                : 'text-[#8B95A5] hover:bg-[#12161E] hover:text-[#F4F6F9]'
            }`}
          >
            <span>🛍️ Storefront</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold transition-all ${
              activeTab === 'admin'
                ? 'bg-[#00E599]/15 text-[#00E599] border border-[#00E599]/40 shadow-sm'
                : 'text-[#8B95A5] hover:bg-[#12161E] hover:text-[#F4F6F9]'
            }`}
          >
            <span>⚙️ Merchant Admin</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold transition-all ${
              activeTab === 'pos'
                ? 'bg-[#00E599]/15 text-[#00E599] border border-[#00E599]/40 shadow-sm'
                : 'text-[#8B95A5] hover:bg-[#12161E] hover:text-[#F4F6F9]'
            }`}
          >
            <span>📟 Counter POS</span>
          </button>
        </div>

        {/* Center / Right Controls: Viewport Mode & Direct Link */}
        <div className="flex items-center gap-2">
          {/* Viewport switchers (only in single-tab view) */}
          {!activeTab.startsWith('split') && (
            <div className="hidden sm:flex items-center rounded-lg border border-[#1F2633] bg-[#12161E] p-0.5">
              <button
                type="button"
                onClick={() => setViewport('desktop')}
                title="Desktop View"
                className={`rounded px-2 py-1 font-mono text-[11px] ${
                  viewport === 'desktop' ? 'bg-[#1F2633] text-[#00E599]' : 'text-[#8B95A5]'
                }`}
              >
                🖥️ 100%
              </button>
              <button
                type="button"
                onClick={() => setViewport('tablet')}
                title="iPad / Tablet View"
                className={`rounded px-2 py-1 font-mono text-[11px] ${
                  viewport === 'tablet' ? 'bg-[#1F2633] text-[#00E599]' : 'text-[#8B95A5]'
                }`}
              >
                📱 Tablet
              </button>
              <button
                type="button"
                onClick={() => setViewport('mobile')}
                title="Mobile View"
                className={`rounded px-2 py-1 font-mono text-[11px] ${
                  viewport === 'mobile' ? 'bg-[#1F2633] text-[#00E599]' : 'text-[#8B95A5]'
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
            className="rounded-lg border border-[#1F2633] bg-[#12161E] px-2 py-1 font-mono text-xs text-[#8B95A5] hover:text-[#00E599]"
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
            className="flex items-center gap-1 rounded-lg border border-[#1F2633] bg-[#12161E] px-2.5 py-1 font-mono text-xs text-[#8B95A5] hover:border-[#00E599]/40 hover:text-[#00E599]"
          >
            <span>Open Tab ↗</span>
          </a>

          {/* 0% Tax Invariant Badge */}
          <span className="hidden xl:inline-flex items-center rounded-full bg-[#00E599]/10 px-2 py-0.5 font-mono text-[10px] text-[#00E599] border border-[#00E599]/30">
            0% GMV Toll
          </span>
        </div>
      </header>

      {/* Main Workspace Frame Area */}
      <main className="flex-1 overflow-hidden bg-[#050608] p-2">
        {/* VIEW 1: SPLIT SCREEN (Merchant Admin Left, Counter POS Right) */}
        {activeTab === 'split-admin-pos' && (
          <div className="grid h-full w-full grid-cols-1 md:grid-cols-2 gap-2">
            {/* Left: Merchant Admin */}
            <div className="flex flex-col h-full rounded-xl border border-[#1F2633] bg-[#090B0E] overflow-hidden shadow-lg">
              <div className="flex items-center justify-between border-b border-[#1F2633] bg-[#12161E] px-3 py-1.5 font-mono text-[11px] text-[#8B95A5]">
                <div className="flex items-center gap-1.5 text-[#F4F6F9] font-semibold">
                  <span>⚙️ Merchant Admin Shell</span>
                  <span className="text-[10px] text-[#00E599]">● Live Polaris</span>
                </div>
                <a href={adminUrl} target="_blank" rel="noreferrer" className="hover:text-[#00E599]">
                  Popout ↗
                </a>
              </div>
              <iframe
                key={`split-admin-${refreshKey}`}
                src={adminUrl}
                title="Merchant Admin Shell"
                className="h-full w-full border-0 bg-[#090B0E]"
              />
            </div>

            {/* Right: Counter POS */}
            <div className="flex flex-col h-full rounded-xl border border-[#1F2633] bg-[#090B0E] overflow-hidden shadow-lg">
              <div className="flex items-center justify-between border-b border-[#1F2633] bg-[#12161E] px-3 py-1.5 font-mono text-[11px] text-[#8B95A5]">
                <div className="flex items-center gap-1.5 text-[#F4F6F9] font-semibold">
                  <span>📟 Offline Counter POS</span>
                  <span className="text-[10px] text-[#00E599]">● Serwist PWA</span>
                </div>
                <a href={posUrl} target="_blank" rel="noreferrer" className="hover:text-[#00E599]">
                  Popout ↗
                </a>
              </div>
              <iframe
                key={`split-pos-${refreshKey}`}
                src={posUrl}
                title="Counter POS Terminal"
                allow="serial; usb; clipboard-read; clipboard-write; camera"
                className="h-full w-full border-0 bg-[#080A0D]"
              />
            </div>
          </div>
        )}

        {/* VIEW 2: SPLIT SCREEN (Merchant Admin Left, Storefront Right) */}
        {activeTab === 'split-admin-store' && (
          <div className="grid h-full w-full grid-cols-1 md:grid-cols-2 gap-2">
            {/* Left: Merchant Admin */}
            <div className="flex flex-col h-full rounded-xl border border-[#1F2633] bg-[#090B0E] overflow-hidden shadow-lg">
              <div className="flex items-center justify-between border-b border-[#1F2633] bg-[#12161E] px-3 py-1.5 font-mono text-[11px] text-[#8B95A5]">
                <div className="flex items-center gap-1.5 text-[#F4F6F9] font-semibold">
                  <span>⚙️ Merchant Admin Shell</span>
                  <span className="text-[10px] text-[#00E599]">● Live Polaris</span>
                </div>
                <a href={adminUrl} target="_blank" rel="noreferrer" className="hover:text-[#00E599]">
                  Popout ↗
                </a>
              </div>
              <iframe
                key={`split-admin2-${refreshKey}`}
                src={adminUrl}
                title="Merchant Admin Shell"
                className="h-full w-full border-0 bg-[#090B0E]"
              />
            </div>

            {/* Right: Online Storefront */}
            <div className="flex flex-col h-full rounded-xl border border-[#1F2633] bg-[#090B0E] overflow-hidden shadow-lg">
              <div className="flex items-center justify-between border-b border-[#1F2633] bg-[#12161E] px-3 py-1.5 font-mono text-[11px] text-[#8B95A5]">
                <div className="flex items-center gap-1.5 text-[#F4F6F9] font-semibold">
                  <span>🛍️ Customer Storefront</span>
                  <span className="text-[10px] text-[#00E599]">● 3D &amp; Fitment</span>
                </div>
                <a href={storefrontUrl} target="_blank" rel="noreferrer" className="hover:text-[#00E599]">
                  Popout ↗
                </a>
              </div>
              <iframe
                key={`split-store-${refreshKey}`}
                src={storefrontUrl}
                title="Customer Storefront"
                className="h-full w-full border-0 bg-[#080A0D]"
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
              className="h-full w-full border-0 bg-[#080A0D]"
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
              className="h-full w-full border-0 bg-[#090B0E]"
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
              className="h-full w-full border-0 bg-[#080A0D]"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
