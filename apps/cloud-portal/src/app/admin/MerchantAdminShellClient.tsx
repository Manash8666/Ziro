'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  AdminProduct,
  AdminOrder,
  MULTI_VERTICAL_STORES,
  filterProducts,
  bulkUpdateProductStatus,
  exportProductsToCsv,
  computeStoreMetrics,
} from '../../lib/merchant-admin-data';

export function MerchantAdminShellClient() {
  const [activeVertical, setActiveVertical] = useState<string>('fashion');
  const [themeMode, setThemeMode] = useState<'polaris-light' | 'dark-precision'>('dark-precision');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'theme-customizer' | 'tax-ledger'>('products');

  // Store data state
  const [stores, setStores] = useState(MULTI_VERTICAL_STORES);
  const currentStore = stores[activeVertical] || stores.fashion;

  // Products filtering & selection state
  const [productSearch, setProductSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Theme Customizer live settings
  const [customizerSettings, setCustomizerSettings] = useState({
    brandName: currentStore.name,
    primaryColor: '#00E599',
    headline: 'Autonomous Commerce with 0% Platform Tax',
    announcementText: '✨ Zero Commission • Local-First Offline POS • UCP/ACP AI Agent Ready',
    showAnnouncement: true,
  });

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Filtered Products
  const displayedProducts = useMemo(() => {
    return filterProducts(currentStore.products, {
      query: productSearch,
      status: statusFilter,
    });
  }, [currentStore.products, productSearch, statusFilter]);

  // Store Metrics
  const metrics = useMemo(() => {
    return computeStoreMetrics(currentStore.orders, currentStore.products);
  }, [currentStore.orders, currentStore.products]);

  // Bulk Product Actions
  const handleBulkStatusChange = (newStatus: 'ACTIVE' | 'DRAFT' | 'ARCHIVED') => {
    if (selectedProductIds.length === 0) return;
    const updated = bulkUpdateProductStatus(currentStore.products, selectedProductIds, newStatus);
    setStores((prev) => ({
      ...prev,
      [activeVertical]: {
        ...currentStore,
        products: updated,
      },
    }));
    showToast(`Updated ${selectedProductIds.length} product(s) to ${newStatus}.`);
    setSelectedProductIds([]);
  };

  // CSV Export
  const handleExportCsv = () => {
    const csv = exportProductsToCsv(displayedProducts);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${currentStore.id}-products.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${displayedProducts.length} products to CSV.`);
  };

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedProductIds.length === displayedProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(displayedProducts.map((p) => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Theme Variables based on Polaris Light vs Dark Precision
  const isLight = themeMode === 'polaris-light';
  const themeClasses = {
    canvas: isLight ? 'bg-[#F1F1F1] text-[#202223]' : 'bg-[#080A0D] text-[#F4F6F9]',
    topBar: isLight ? 'bg-[#1A1A1A] text-white border-b border-[#2C2C2C]' : 'bg-[#090B0E] text-[#F4F6F9] border-b border-[#1F2633]',
    sidebar: isLight ? 'bg-[#EBEBEB] border-r border-[#D2D5D8] text-[#202223]' : 'bg-[#0A0D12] border-r border-[#1F2633] text-[#8B95A5]',
    card: isLight ? 'bg-white border border-[#E1E3E5] shadow-sm' : 'bg-[#12161E] border border-[#1F2633]',
    tableHead: isLight ? 'bg-[#F7F7F7] border-b border-[#E1E3E5] text-[#6D7175]' : 'bg-[#0F131A] border-b border-[#1F2633] text-[#8B95A5]',
    rowHover: isLight ? 'hover:bg-[#F9FAFB]' : 'hover:bg-[#1A202C]',
    subtext: isLight ? 'text-[#6D7175]' : 'text-[#8B95A5]',
    border: isLight ? 'border-[#E1E3E5]' : 'border-[#1F2633]',
    input: isLight ? 'bg-white border-[#C9CCCF] text-[#202223] focus:border-[#008060]' : 'bg-[#090B0E] border-[#1F2633] text-[#F4F6F9] focus:border-[#00E599]',
  };

  return (
    <div className={`flex h-screen w-screen flex-col overflow-hidden font-sans ${themeClasses.canvas}`}>
      {/* 56px Top Bar: Store Switcher, Global Search, Theme Switcher, 0% Fee Invariant */}
      <header className={`flex h-14 items-center justify-between px-4 ${themeClasses.topBar}`}>
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-mono text-base font-black tracking-wider text-[#00E599]">
              ZIRO
            </span>
            <span className="rounded bg-[#2E384D]/40 px-1.5 py-0.5 text-[10px] font-mono text-[#8B95A5]">
              ADMIN
            </span>
          </Link>

          {/* Store Switcher Dropdown */}
          <div className="relative">
            <select
              value={activeVertical}
              onChange={(e) => {
                setActiveVertical(e.target.value);
                const next = stores[e.target.value];
                if (next) {
                  setCustomizerSettings((prev) => ({ ...prev, brandName: next.name }));
                }
              }}
              className="rounded-md border border-[#3E4554] bg-[#12161E] px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-[#00E599]"
            >
              <option value="fashion">👗 Aura Haute Couture (Fashion)</option>
              <option value="ayurveda">🌿 Veda Botanicals (Ayurveda)</option>
              <option value="auto">🏎️ Apex Torque (Auto Parts)</option>
              <option value="electronics">🎧 SonicWave Labs (Electronics)</option>
            </select>
          </div>

          <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-[#00E599]/30 bg-[#00E599]/10 px-2.5 py-0.5 text-[11px] font-mono font-medium text-[#00E599]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00E599] animate-pulse" />
            0% GMV Toll Locked
          </span>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-3">
          {/* Quick links to live apps */}
          <a
            href={
              process.env.NEXT_PUBLIC_STOREFRONT_URL ??
              (process.env.NODE_ENV === 'production'
                ? 'https://ziro-storefront.vercel.app'
                : 'http://localhost:3000')
            }
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex text-xs font-mono text-[#8B95A5] hover:text-[#00E599]"
          >
            Storefront ↗
          </a>
          <a
            href={
              process.env.NEXT_PUBLIC_POS_URL ??
              (process.env.NODE_ENV === 'production'
                ? 'https://ziro-pos.vercel.app'
                : 'http://localhost:3001')
            }
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex text-xs font-mono text-[#8B95A5] hover:text-[#00E599]"
          >
            Counter POS ↗
          </a>

          {/* Theme Mode Toggle (Polaris Light vs Dark Precision) */}
          <button
            type="button"
            onClick={() => setThemeMode(isLight ? 'dark-precision' : 'polaris-light')}
            className="rounded-md border border-[#3E4554] bg-[#12161E] px-2.5 py-1 text-xs font-mono text-white hover:bg-[#1F2633]"
          >
            {isLight ? '🌙 Dark Precision' : '☀️ Polaris Light'}
          </button>
        </div>
      </header>

      {/* Main Admin Body: Sidebar (240px) + Dynamic Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className={`flex w-60 flex-col justify-between p-3 ${themeClasses.sidebar}`}>
          <div className="space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '📊' },
              { id: 'products', label: 'Products', icon: '🏷️', count: currentStore.products.length },
              { id: 'orders', label: 'Orders', icon: '📦', count: currentStore.orders.length },
              { id: 'theme-customizer', label: 'Theme Studio', icon: '🎨' },
              { id: 'tax-ledger', label: '0% Tax Ledger', icon: '🛡️' },
            ].map((nav) => {
              const active = activeTab === nav.id;
              return (
                <button
                  key={nav.id}
                  type="button"
                  onClick={() => setActiveTab(nav.id as any)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                    active
                      ? isLight
                        ? 'bg-[#E1E3E5] text-[#202223]'
                        : 'bg-[#12161E] text-[#00E599] border border-[#00E599]/30 shadow-sm'
                      : isLight
                      ? 'text-[#4A4D50] hover:bg-[#E8E8E8]'
                      : 'text-[#8B95A5] hover:bg-[#12161E] hover:text-[#F4F6F9]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span>{nav.icon}</span>
                    <span>{nav.label}</span>
                  </div>
                  {nav.count !== undefined && (
                    <span className="rounded-full bg-[#1F2633] px-2 py-0.5 text-[10px] font-mono text-[#8B95A5]">
                      {nav.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sales Channels status strip */}
          <div className="space-y-2 border-t border-[#1F2633] pt-3 text-[11px] font-mono">
            <span className="block font-bold uppercase tracking-wider text-[#8B95A5]">
              Active Channels
            </span>
            <div className="flex items-center justify-between text-[#8B95A5]">
              <span>Online Store</span>
              <span className="text-[#00E599]">● Live</span>
            </div>
            <div className="flex items-center justify-between text-[#8B95A5]">
              <span>Counter POS</span>
              <span className="text-[#00E599]">● Ready</span>
            </div>
            <div className="flex items-center justify-between text-[#8B95A5]">
              <span>AI Agents (UCP)</span>
              <span className="text-[#00E599]">● Armed</span>
            </div>
          </div>
        </aside>

        {/* Main Workspace Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: PRODUCTS INDEXTABLE */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              {/* Header & Primary Actions */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold tracking-tight">Products</h1>
                  <p className={`text-xs ${themeClasses.subtext}`}>
                    Manage catalog, inventory, HSN codes, and multi-channel publication.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${themeClasses.card} hover:opacity-90`}
                  >
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => showToast('Product creator modal ready in self-serve pipeline.')}
                    className="rounded-lg bg-[#00E599] px-4 py-1.5 text-xs font-bold text-[#090B0E] hover:opacity-90 shadow-sm"
                  >
                    Add Product
                  </button>
                </div>
              </div>

              {/* Bulk Actions Banner (appears when items selected) */}
              {selectedProductIds.length > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-[#00E599]/40 bg-[#00E599]/10 px-4 py-2.5 text-xs">
                  <span className="font-semibold text-[#00E599]">
                    {selectedProductIds.length} product(s) selected
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleBulkStatusChange('ACTIVE')}
                      className="rounded bg-[#00E599] px-2.5 py-1 text-xs font-bold text-[#090B0E]"
                    >
                      Publish
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkStatusChange('DRAFT')}
                      className="rounded border border-[#3E4554] bg-[#12161E] px-2.5 py-1 text-xs font-semibold text-white"
                    >
                      Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkStatusChange('ARCHIVED')}
                      className="rounded border border-[#EF4444]/40 bg-[#EF4444]/10 px-2.5 py-1 text-xs font-semibold text-[#EF4444]"
                    >
                      Archive
                    </button>
                  </div>
                </div>
              )}

              {/* Polaris IndexTable Container */}
              <div className={`rounded-xl overflow-hidden ${themeClasses.card}`}>
                {/* Search & Status Filters Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1F2633] p-3">
                  <div className="flex items-center gap-2">
                    {['ALL', 'ACTIVE', 'DRAFT', 'ARCHIVED'].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatusFilter(st)}
                        className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                          statusFilter === st
                            ? 'bg-[#00E599] text-[#090B0E] font-bold'
                            : `${themeClasses.subtext} hover:text-white`
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Filter products (title, SKU, HSN)..."
                    className={`w-64 rounded-md px-3 py-1 text-xs outline-none ${themeClasses.input}`}
                  />
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className={themeClasses.tableHead}>
                      <tr>
                        <th className="w-10 px-4 py-3">
                          <input
                            type="checkbox"
                            checked={
                              displayedProducts.length > 0 &&
                              selectedProductIds.length === displayedProducts.length
                            }
                            onChange={toggleSelectAll}
                            className="rounded accent-[#00E599]"
                          />
                        </th>
                        <th className="px-4 py-3 font-semibold">Product</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Inventory</th>
                        <th className="px-4 py-3 font-semibold">Category</th>
                        <th className="px-4 py-3 font-semibold">HSN / GST</th>
                        <th className="px-4 py-3 font-semibold">Channels</th>
                        <th className="px-4 py-3 font-semibold text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F2633]">
                      {displayedProducts.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-[#8B95A5]">
                            No products match your criteria.
                          </td>
                        </tr>
                      ) : (
                        displayedProducts.map((p) => {
                          const isSelected = selectedProductIds.includes(p.id);
                          return (
                            <tr
                              key={p.id}
                              className={`transition-colors ${
                                isSelected
                                  ? isLight
                                    ? 'bg-[#F2F7FE]'
                                    : 'bg-[#00E599]/5'
                                  : themeClasses.rowHover
                              }`}
                            >
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectOne(p.id)}
                                  className="rounded accent-[#00E599]"
                                />
                              </td>
                              <td className="px-4 py-3 font-medium">
                                <div className="font-bold">{p.title}</div>
                                <div className="font-mono text-[10px] text-[#8B95A5]">{p.sku}</div>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold ${
                                    p.status === 'ACTIVE'
                                      ? 'bg-[#00E599]/15 text-[#00E599]'
                                      : p.status === 'DRAFT'
                                      ? 'bg-[#F59E0B]/15 text-[#F59E0B]'
                                      : 'bg-[#EF4444]/15 text-[#EF4444]'
                                  }`}
                                >
                                  {p.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono">
                                <span className={p.inventoryOnHand <= 10 ? 'text-[#F59E0B]' : ''}>
                                  {p.inventoryOnHand} in stock
                                </span>
                              </td>
                              <td className="px-4 py-3">{p.category}</td>
                              <td className="px-4 py-3 font-mono text-[11px]">
                                {p.hsnCode} ({p.gstPercent}%)
                              </td>
                              <td className="px-4 py-3 font-mono text-[10px] text-[#8B95A5]">
                                {p.salesChannels.join(', ')}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-bold">
                                {currentStore.currency === 'INR' ? '₹' : '$'}
                                {(p.pricePaise / 100).toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ORDERS INDEXTABLE */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold tracking-tight">Orders</h1>
                  <p className={`text-xs ${themeClasses.subtext}`}>
                    Live sales orders across Storefront, Counter POS, and AI Agents.
                  </p>
                </div>
                <span className="font-mono text-xs text-[#00E599]">
                  0% Commission Fee on All Orders
                </span>
              </div>

              <div className={`rounded-xl overflow-hidden ${themeClasses.card}`}>
                <table className="w-full text-left text-xs">
                  <thead className={themeClasses.tableHead}>
                    <tr>
                      <th className="px-4 py-3 font-semibold">Order</th>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Customer</th>
                      <th className="px-4 py-3 font-semibold">Channel</th>
                      <th className="px-4 py-3 font-semibold">Payment</th>
                      <th className="px-4 py-3 font-semibold">Fulfillment</th>
                      <th className="px-4 py-3 font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2633]">
                    {currentStore.orders.map((o) => (
                      <tr key={o.id} className={themeClasses.rowHover}>
                        <td className="px-4 py-3 font-mono font-bold text-[#00E599]">
                          {o.orderNumber}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-[#8B95A5]">
                          {new Date(o.createdAt).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold">{o.customerName}</div>
                          <div className="font-mono text-[10px] text-[#8B95A5]">
                            {o.customerEmail}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px]">
                          <span className="rounded bg-[#1F2633] px-2 py-0.5">{o.channel}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-[#00E599]">
                          {o.paymentStatus}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px]">
                          {o.fulfillmentStatus}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold">
                          {currentStore.currency === 'INR' ? '₹' : '$'}
                          {(o.totalPaise / 100).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SPLIT-PANE THEME CUSTOMIZER */}
          {activeTab === 'theme-customizer' && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight">Theme Studio &amp; Customizer</h1>
                <p className={`text-xs ${themeClasses.subtext}`}>
                  Live split-pane customizer. Changes update design tokens in real time.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Controls Pane (4 cols) */}
                <div className={`lg:col-span-4 rounded-xl p-4 space-y-4 ${themeClasses.card}`}>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#00E599]">
                    Design Tokens
                  </h3>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#8B95A5]">Brand Name</label>
                    <input
                      type="text"
                      value={customizerSettings.brandName}
                      onChange={(e) =>
                        setCustomizerSettings((prev) => ({ ...prev, brandName: e.target.value }))
                      }
                      className={`w-full rounded-md px-3 py-1.5 text-xs ${themeClasses.input}`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#8B95A5]">Primary Accent Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customizerSettings.primaryColor}
                        onChange={(e) =>
                          setCustomizerSettings((prev) => ({ ...prev, primaryColor: e.target.value }))
                        }
                        className="h-8 w-12 rounded cursor-pointer border border-[#1F2633] bg-transparent"
                      />
                      <input
                        type="text"
                        value={customizerSettings.primaryColor}
                        onChange={(e) =>
                          setCustomizerSettings((prev) => ({ ...prev, primaryColor: e.target.value }))
                        }
                        className={`w-full rounded-md px-3 py-1 text-xs font-mono ${themeClasses.input}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#8B95A5]">Hero Headline</label>
                    <textarea
                      rows={2}
                      value={customizerSettings.headline}
                      onChange={(e) =>
                        setCustomizerSettings((prev) => ({ ...prev, headline: e.target.value }))
                      }
                      className={`w-full rounded-md px-3 py-1.5 text-xs ${themeClasses.input}`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#8B95A5]">Announcement Bar</label>
                    <input
                      type="text"
                      value={customizerSettings.announcementText}
                      onChange={(e) =>
                        setCustomizerSettings((prev) => ({ ...prev, announcementText: e.target.value }))
                      }
                      className={`w-full rounded-md px-3 py-1.5 text-xs ${themeClasses.input}`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => showToast('Theme tokens saved & compiled to Caddy CDN.')}
                    className="w-full rounded-lg bg-[#00E599] py-2 text-xs font-bold text-[#090B0E] hover:opacity-90 shadow-sm"
                  >
                    Save &amp; Publish Theme
                  </button>
                </div>

                {/* Right Live Preview Frame (8 cols) */}
                <div className={`lg:col-span-8 rounded-xl p-5 space-y-4 ${themeClasses.card}`}>
                  <div className="flex items-center justify-between border-b border-[#1F2633] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#00E599]" />
                      <span className="font-mono text-xs text-[#8B95A5] ml-2">
                        Preview: https://{currentStore.id}.ziro.app
                      </span>
                    </div>
                    <span className="rounded bg-[#00E599]/10 px-2 py-0.5 font-mono text-[10px] text-[#00E599]">
                      LIVE PREVIEW
                    </span>
                  </div>

                  {/* Simulated Storefront Card */}
                  <div className="rounded-lg border border-[#1F2633] bg-[#090B0E] p-6 text-white space-y-6">
                    {/* Announcement */}
                    {customizerSettings.showAnnouncement && (
                      <div
                        className="rounded px-3 py-1.5 text-center text-xs font-mono font-medium"
                        style={{ backgroundColor: `${customizerSettings.primaryColor}20`, color: customizerSettings.primaryColor }}
                      >
                        {customizerSettings.announcementText}
                      </div>
                    )}

                    {/* Nav */}
                    <div className="flex items-center justify-between border-b border-[#1F2633] pb-4">
                      <span className="text-lg font-black tracking-tight" style={{ color: customizerSettings.primaryColor }}>
                        {customizerSettings.brandName}
                      </span>
                      <div className="flex items-center gap-4 text-xs font-medium text-[#8B95A5]">
                        <span>Catalog</span>
                        <span>Fitment</span>
                        <span>Cart (0)</span>
                      </div>
                    </div>

                    {/* Hero */}
                    <div className="space-y-3 py-6 text-center max-w-xl mx-auto">
                      <h2 className="text-2xl font-extrabold tracking-tight">
                        {customizerSettings.headline}
                      </h2>
                      <p className="text-xs text-[#8B95A5]">
                        Experience precision retail with zero commission tolls, instant offline cashiering, and autonomous shopping agents.
                      </p>
                      <button
                        type="button"
                        className="rounded-lg px-5 py-2 text-xs font-bold text-[#090B0E]"
                        style={{ backgroundColor: customizerSettings.primaryColor }}
                      >
                        Shop Now
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: 0% TAX LEDGER */}
          {activeTab === 'tax-ledger' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold tracking-tight">Financial Ledger &amp; 0% GMV Savings</h1>
                <p className={`text-xs ${themeClasses.subtext}`}>
                  Real-time transparent audit proving zero platform fees on every transaction.
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`rounded-xl p-5 space-y-1 ${themeClasses.card}`}>
                  <span className="text-xs text-[#8B95A5]">Total Gross Volume</span>
                  <div className="text-2xl font-bold font-mono">
                    {currentStore.currency === 'INR' ? '₹' : '$'}
                    {(metrics.totalGmvPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] font-mono text-[#00E599]">
                    100% Retained by Merchant
                  </span>
                </div>

                <div className={`rounded-xl p-5 space-y-1 ${themeClasses.card}`}>
                  <span className="text-xs text-[#8B95A5]">Platform Fee Charged</span>
                  <div className="text-2xl font-bold font-mono text-[#00E599]">
                    0% ($0.00)
                  </div>
                  <span className="text-[11px] font-mono text-[#8B95A5]">
                    Flat Monthly SaaS • No Tolls
                  </span>
                </div>

                <div className={`rounded-xl p-5 space-y-1 ${themeClasses.card}`}>
                  <span className="text-xs text-[#8B95A5]">Legacy Shopify Fee Saved</span>
                  <div className="text-2xl font-bold font-mono text-[#E6B800]">
                    {currentStore.currency === 'INR' ? '₹' : '$'}
                    {(metrics.estimatedTaxSavedPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] font-mono text-[#E6B800]">
                    Saved vs 2.9% + $0.30 toll
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold tracking-tight">Store Overview: {currentStore.name}</h1>
                <p className={`text-xs ${themeClasses.subtext}`}>
                  High-level performance across products, orders, and agentic commerce channels.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className={`rounded-xl p-4 ${themeClasses.card}`}>
                  <span className="text-xs text-[#8B95A5]">Active Products</span>
                  <div className="text-xl font-bold font-mono mt-1">{metrics.activeProducts}</div>
                </div>
                <div className={`rounded-xl p-4 ${themeClasses.card}`}>
                  <span className="text-xs text-[#8B95A5]">Total Units in Stock</span>
                  <div className="text-xl font-bold font-mono mt-1">{metrics.totalInventory}</div>
                </div>
                <div className={`rounded-xl p-4 ${themeClasses.card}`}>
                  <span className="text-xs text-[#8B95A5]">Orders Fulfilled</span>
                  <div className="text-xl font-bold font-mono mt-1">{metrics.totalOrders}</div>
                </div>
                <div className={`rounded-xl p-4 ${themeClasses.card}`}>
                  <span className="text-xs text-[#8B95A5]">Average Order Value</span>
                  <div className="text-xl font-bold font-mono mt-1">
                    {currentStore.currency === 'INR' ? '₹' : '$'}
                    {(metrics.avgOrderValuePaise / 100).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="absolute bottom-6 right-6 z-50 rounded-lg border border-[#00E599]/40 bg-[#090B0E]/95 px-4 py-2.5 font-mono text-xs text-[#00E599] shadow-2xl backdrop-blur-md">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
