'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  OfflineCatalogItem,
  PosCartItem,
  OfflinePosOrder,
  SEED_OFFLINE_CATALOG,
  calculatePosTicketTotals,
  ZiroOfflinePosDb,
  seedOfflineCatalogIfEmpty,
  enqueueOfflinePosOrder,
  flushPendingOfflineOrders,
} from '../../lib/pos-offline-db';
import { useHidBarcodeScanner } from '../../hooks/useHidBarcodeScanner';
import { EscPosWebSerialDriver } from '../../lib/webserial-escpos';

export function PosTerminalClient() {
  const [catalog, setCatalog] = useState<OfflineCatalogItem[]>(SEED_OFFLINE_CATALOG);
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isInterState, setIsInterState] = useState<boolean>(false);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD' | 'B2B_CREDIT'>('CASH');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [printerConnected, setPrinterConnected] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastCompletedOrder, setLastCompletedOrder] = useState<OfflinePosOrder | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const dbRef = useRef<ZiroOfflinePosDb | null>(null);
  const driverRef = useRef<EscPosWebSerialDriver>(new EscPosWebSerialDriver());

  // Show temporary toast
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Initialize Dexie Offline Database
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const db = new ZiroOfflinePosDb();
    dbRef.current = db;

    const initDb = async () => {
      try {
        await seedOfflineCatalogIfEmpty(db);
        const items = await db.catalog.toArray();
        if (items.length > 0) {
          setCatalog(items);
        }
        const pendingCount = await db.pendingOrders.where('status').equals('PENDING').count();
        setPendingSyncCount(pendingCount);
      } catch (err) {
        console.error('Failed to init IndexedDB:', err);
      }
    };

    initDb();

    // Online / Offline window listeners
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Network restored. Live sync active.');
      if (dbRef.current) {
        flushPendingOfflineOrders(dbRef.current).then(({ syncedCount }) => {
          if (syncedCount > 0) {
            showToast(`Synchronized ${syncedCount} offline ticket(s) to cloud ledger.`);
            dbRef.current?.pendingOrders.where('status').equals('PENDING').count().then(setPendingSyncCount);
          }
        });
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Operating offline. All tickets saved to local IndexedDB.');
    };

    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  // Connect WebSerial Thermal Printer
  const handleConnectPrinter = async () => {
    if (!EscPosWebSerialDriver.isSupported()) {
      showToast('WebSerial API is not supported in this browser. Use desktop Chromium/Edge.');
      return;
    }
    const success = await driverRef.current.connect();
    if (success) {
      setPrinterConnected(true);
      showToast('USB Thermal Printer connected & cash drawer armed.');
    } else {
      showToast('Could not open serial port for printer.');
    }
  };

  // Kick Cash Drawer manually
  const handleKickDrawer = async () => {
    const ok = await driverRef.current.kickCashDrawer();
    if (ok) {
      showToast('Cash drawer solenoid triggered (0x1B 0x70).');
    } else {
      showToast('Simulated drawer kick: Pulse 0x1B 0x70 sent.');
    }
  };

  // Add Item to Cart
  const addToCart = useCallback((item: OfflineCatalogItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.sku === item.sku);
      if (existing) {
        return prev.map((i) =>
          i.sku === item.sku ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [
        ...prev,
        {
          sku: item.sku,
          title: item.title,
          barcode: item.barcode,
          hsnCode: item.hsnCode,
          gstSlabPercent: item.gstSlabPercent,
          unitPricePaise: item.pricePaise,
          qty: 1,
        },
      ];
    });
  }, []);

  // Barcode Scan Handler (Hardware HID and Manual input)
  const handleBarcodeScanned = useCallback(
    (barcode: string) => {
      const match = catalog.find((c) => c.barcode === barcode || c.sku.toLowerCase() === barcode.toLowerCase());
      if (match) {
        addToCart(match);
        showToast(`Scanned: ${match.title}`);
      } else {
        showToast(`No catalog item for barcode: ${barcode}`);
      }
      if (barcodeInputRef.current) {
        barcodeInputRef.current.value = '';
      }
    },
    [catalog, addToCart, showToast]
  );

  // High-velocity sub-30ms hardware HID scanner hook
  useHidBarcodeScanner(handleBarcodeScanned, { maxInterKeyMs: 30, minLength: 3 });

  // Update Cart Quantity
  const updateQty = (sku: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.sku === sku) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as PosCartItem[]
    );
  };

  // Remove Item
  const removeFromCart = (sku: string) => {
    setCart((prev) => prev.filter((i) => i.sku !== sku));
  };

  // Totals calculation
  const totals = useMemo(() => {
    return calculatePosTicketTotals(cart, { isInterState });
  }, [cart, isInterState]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    catalog.forEach((item) => set.add(item.category));
    return Array.from(set);
  }, [catalog]);

  // Filtered Catalog Items
  const filteredCatalog = useMemo(() => {
    return catalog.filter((item) => {
      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchQuery =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.barcode.includes(searchQuery);
      return matchCat && matchQuery;
    });
  }, [catalog, selectedCategory, searchQuery]);

  // Charge / Settle Order
  const handleSettleOrder = async () => {
    if (cart.length === 0) return;

    const orderId = `pos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const invoiceNo = `INV-POS-${Date.now().toString().slice(-6)}`;

    const order: OfflinePosOrder = {
      offlineOrderId: orderId,
      tenantId: 'tenant_fashion_01',
      terminalId: 'POS-COUNTER-01',
      cashierId: 'cashier_vikram',
      items: [...cart],
      subtotalPaise: totals.subtotalPaise,
      cgstPaise: totals.cgstPaise,
      sgstPaise: totals.sgstPaise,
      igstPaise: totals.igstPaise,
      totalTaxPaise: totals.totalTaxPaise,
      totalPaise: totals.totalPaise,
      paymentMode,
      platformFeeBps: 0,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    // 1. Persist to Dexie IndexedDB
    if (dbRef.current) {
      await enqueueOfflinePosOrder(dbRef.current, order);
      const updatedItems = await dbRef.current.catalog.toArray();
      setCatalog(updatedItems);
      const pendingCount = await dbRef.current.pendingOrders.where('status').equals('PENDING').count();
      setPendingSyncCount(pendingCount);
    }

    // 2. Thermal Receipt & Cash Drawer kick
    if (printerConnected) {
      await driverRef.current.printReceipt({
        storeName: 'ZIRO PERFORMANCE RETAIL',
        invoiceNo,
        cashierName: 'Vikram S.',
        terminalId: 'POS-COUNTER-01',
        dateIso: order.createdAt,
        items: cart.map((i) => ({
          sku: i.sku,
          title: i.title,
          qty: i.qty,
          unitPricePaise: i.unitPricePaise,
          totalPaise: i.unitPricePaise * i.qty,
          hsnCode: i.hsnCode,
          gstPercent: i.gstSlabPercent,
        })),
        subtotalPaise: totals.subtotalPaise,
        cgstPaise: totals.cgstPaise,
        sgstPaise: totals.sgstPaise,
        igstPaise: totals.igstPaise,
        totalTaxPaise: totals.totalTaxPaise,
        totalPaise: totals.totalPaise,
        paymentMode,
        platformFeeBps: 0,
        openCashDrawer: paymentMode === 'CASH',
      });
    }

    setLastCompletedOrder(order);
    setCart([]);
    showToast(`Order settled! Invoice ${invoiceNo} (Rs. ${(totals.totalPaise / 100).toFixed(2)})`);

    // 3. Attempt immediate sync if online
    if (isOnline && dbRef.current) {
      flushPendingOfflineOrders(dbRef.current).then(({ syncedCount }) => {
        if (syncedCount > 0) {
          dbRef.current?.pendingOrders.where('status').equals('PENDING').count().then(setPendingSyncCount);
        }
      });
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-[#080A0D] text-[#F4F6F9] overflow-hidden select-none font-sans">
      {/* Top Navigation & Status Bar */}
      <header className="flex h-14 items-center justify-between border-b border-[#1F2633] bg-[#090B0E] px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-extrabold tracking-wider text-[#00E599]">
              ZIRO POS
            </span>
            <span className="rounded bg-[#12161E] border border-[#1F2633] px-1.5 py-0.5 font-mono text-[10px] text-[#8B95A5]">
              COUNTER 01
            </span>
          </div>

          {/* 0% GMV Fee Invariant Badge */}
          <span className="hidden sm:inline-flex items-center rounded-full bg-[#00E599]/10 px-2.5 py-0.5 text-[11px] font-mono font-medium text-[#00E599] border border-[#00E599]/30">
            0% GMV Toll Locked
          </span>

          {/* Cross-App Navigation Links */}
          <a
            href={
              process.env.NEXT_PUBLIC_STOREFRONT_URL ??
              (process.env.NODE_ENV === 'production'
                ? 'https://ziro-storefront.vercel.app'
                : 'http://localhost:3000')
            }
            target="_blank"
            rel="noreferrer"
            className="hidden lg:inline-flex items-center gap-1 rounded-md border border-[#1F2633] bg-[#12161E] px-2 py-0.5 font-mono text-[11px] text-[#8B95A5] hover:text-[#00E599]"
          >
            Storefront ↗
          </a>
          <a
            href={
              process.env.NEXT_PUBLIC_PORTAL_URL
                ? `${process.env.NEXT_PUBLIC_PORTAL_URL.replace(/\/admin\/?$/, '')}/admin`
                : (process.env.NODE_ENV === 'production'
                    ? 'https://ziro-orcin.vercel.app/admin'
                    : 'http://localhost:3002/admin')
            }
            target="_blank"
            rel="noreferrer"
            className="hidden lg:inline-flex items-center gap-1 rounded-md border border-[#1F2633] bg-[#12161E] px-2 py-0.5 font-mono text-[11px] text-[#8B95A5] hover:text-[#00E599]"
          >
            Admin Portal ↗
          </a>
        </div>

        {/* Barcode Search / Scanner Input */}
        <div className="flex items-center gap-2 w-72 sm:w-96">
          <input
            ref={barcodeInputRef}
            type="text"
            placeholder="Scan barcode or type SKU..."
            className="w-full rounded-md border border-[#1F2633] bg-[#12161E] px-3 py-1.5 text-xs text-[#F4F6F9] placeholder-[#8B95A5] focus:border-[#00E599] focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value) {
                handleBarcodeScanned(e.currentTarget.value);
              }
            }}
          />
        </div>

        {/* Right Status Indicators & Printer Controls */}
        <div className="flex items-center gap-3">
          {/* Online / Offline status */}
          <div className="flex items-center gap-1.5 rounded-full border border-[#1F2633] bg-[#12161E] px-2.5 py-1 text-[11px] font-mono">
            <span
              className={`h-2 w-2 rounded-full ${
                isOnline ? 'bg-[#00E599]' : 'bg-[#F59E0B] animate-pulse'
              }`}
            />
            <span className={isOnline ? 'text-[#00E599]' : 'text-[#F59E0B]'}>
              {isOnline ? 'Online Sync' : 'Offline Mode'}
            </span>
            {pendingSyncCount > 0 && (
              <span className="rounded-full bg-[#F59E0B]/20 px-1.5 text-[10px] text-[#F59E0B]">
                {pendingSyncCount} queued
              </span>
            )}
          </div>

          {/* Hardware ESC/POS WebSerial Button */}
          <button
            type="button"
            onClick={printerConnected ? handleKickDrawer : handleConnectPrinter}
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-mono transition-colors ${
              printerConnected
                ? 'border-[#00E599]/40 bg-[#00E599]/10 text-[#00E599] hover:bg-[#00E599]/20'
                : 'border-[#1F2633] bg-[#12161E] text-[#8B95A5] hover:border-[#8B95A5]'
            }`}
          >
            <span>🖨️</span>
            <span>{printerConnected ? 'Drawer Pulse (0x1B 0x70)' : 'Connect USB Printer'}</span>
          </button>
        </div>
      </header>

      {/* Main Terminal Grid: Catalog (60%) + Cart Ticket (40%) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Catalog & Categories */}
        <section className="flex flex-col flex-1 border-r border-[#1F2633] bg-[#090B0E] p-4 overflow-hidden">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#00E599] text-[#090B0E] font-bold shadow-[0_0_12px_rgba(0,229,153,0.3)]'
                    : 'bg-[#12161E] border border-[#1F2633] text-[#8B95A5] hover:text-[#F4F6F9]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto flex-1 pr-1 pos-ticket-scroll">
            {filteredCatalog.map((item) => (
              <div
                key={item.sku}
                onClick={() => addToCart(item)}
                className="group flex flex-col justify-between rounded-xl border border-[#1F2633] bg-[#12161E] p-3.5 transition-all hover:border-[#00E599]/60 hover:bg-[#1A202C] active:scale-[0.98] cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-[#8B95A5]">{item.sku}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        item.stockOnHand > 15
                          ? 'bg-[#00E599]/10 text-[#00E599]'
                          : 'bg-[#F59E0B]/10 text-[#F59E0B]'
                      }`}
                    >
                      {item.stockOnHand} on hand
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#F4F6F9] line-clamp-2 leading-tight group-hover:text-[#00E599]">
                    {item.title}
                  </h4>
                </div>

                <div className="mt-3 flex items-baseline justify-between border-t border-[#1F2633] pt-2">
                  <span className="font-mono text-sm font-extrabold text-[#F4F6F9]">
                    ₹{(item.pricePaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="font-mono text-[10px] text-[#8B95A5]">
                    GST {item.gstSlabPercent}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right Column: Active Cart Ticket & Settlement */}
        <section className="flex flex-col w-[420px] bg-[#0C0F14] border-l border-[#1F2633] p-4 overflow-hidden">
          {/* Ticket Header & Tax Regime Switch */}
          <div className="flex items-center justify-between border-b border-[#1F2633] pb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#F4F6F9]">
                Active Register Ticket
              </span>
              <span className="block text-[10px] font-mono text-[#8B95A5]">
                {cart.length} item(s) in cart
              </span>
            </div>

            <div className="flex items-center gap-1 rounded-md border border-[#1F2633] bg-[#12161E] p-0.5 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setIsInterState(false)}
                className={`rounded px-2 py-0.5 ${
                  !isInterState ? 'bg-[#00E599] text-[#090B0E] font-bold' : 'text-[#8B95A5]'
                }`}
              >
                Intra (CGST+SGST)
              </button>
              <button
                type="button"
                onClick={() => setIsInterState(true)}
                className={`rounded px-2 py-0.5 ${
                  isInterState ? 'bg-[#00E599] text-[#090B0E] font-bold' : 'text-[#8B95A5]'
                }`}
              >
                Inter (IGST)
              </button>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto space-y-2 py-3 pos-ticket-scroll">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-[#8B95A5] space-y-2">
                <span className="text-3xl">🛒</span>
                <p className="text-xs font-mono">Register ticket empty.</p>
                <p className="text-[11px] text-[#8B95A5]/70">
                  Scan barcode with hardware scanner or tap catalog cards.
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.sku}
                  className="flex items-center justify-between rounded-lg border border-[#1F2633] bg-[#12161E] p-2.5"
                >
                  <div className="space-y-0.5 max-w-[200px]">
                    <h5 className="text-xs font-semibold text-[#F4F6F9] truncate">{item.title}</h5>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-[#8B95A5]">
                      <span>{item.sku}</span>
                      <span>•</span>
                      <span>₹{(item.unitPricePaise / 100).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded border border-[#1F2633] bg-[#090B0E]">
                      <button
                        type="button"
                        onClick={() => updateQty(item.sku, -1)}
                        className="px-2 py-0.5 text-xs text-[#8B95A5] hover:text-[#F4F6F9]"
                      >
                        -
                      </button>
                      <span className="px-2 font-mono text-xs font-bold text-[#F4F6F9]">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(item.sku, 1)}
                        className="px-2 py-0.5 text-xs text-[#8B95A5] hover:text-[#F4F6F9]"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.sku)}
                      className="text-xs text-[#8B95A5] hover:text-[#EF4444] px-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Ticket Financial Summary */}
          <div className="space-y-2 border-t border-[#1F2633] pt-3 text-xs">
            <div className="flex justify-between text-[#8B95A5]">
              <span>Subtotal</span>
              <span className="font-mono text-[#F4F6F9]">
                ₹{(totals.subtotalPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {!isInterState ? (
              <>
                <div className="flex justify-between text-[#8B95A5] text-[11px]">
                  <span>CGST</span>
                  <span className="font-mono text-[#F4F6F9]">
                    ₹{(totals.cgstPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-[#8B95A5] text-[11px]">
                  <span>SGST</span>
                  <span className="font-mono text-[#F4F6F9]">
                    ₹{(totals.sgstPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-[#8B95A5] text-[11px]">
                <span>IGST (Inter-State)</span>
                <span className="font-mono text-[#F4F6F9]">
                  ₹{(totals.igstPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="flex justify-between text-[11px] text-[#00E599]">
              <span>Platform Fee (0% Ziro Guarantee)</span>
              <span className="font-mono">₹0.00</span>
            </div>

            <div className="flex items-baseline justify-between border-t border-[#1F2633] pt-2">
              <span className="text-sm font-bold text-[#F4F6F9]">TOTAL DUE</span>
              <span className="font-mono text-2xl font-black text-[#00E599]">
                ₹{(totals.totalPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Payment Mode Selector */}
            <div className="grid grid-cols-4 gap-1.5 pt-2">
              {(['CASH', 'UPI', 'CARD', 'B2B_CREDIT'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={`rounded py-2 text-[10px] font-mono font-bold transition-all ${
                    paymentMode === mode
                      ? 'bg-[#00E599] text-[#090B0E] shadow-[0_0_8px_rgba(0,229,153,0.3)]'
                      : 'border border-[#1F2633] bg-[#12161E] text-[#8B95A5] hover:text-[#F4F6F9]'
                  }`}
                >
                  {mode.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Big Charge Button */}
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={handleSettleOrder}
              className={`w-full rounded-xl py-3.5 text-sm font-extrabold uppercase tracking-wider transition-all pos-touch-btn ${
                cart.length > 0
                  ? 'bg-gradient-to-r from-[#00E599] to-[#00C280] text-[#090B0E] shadow-[0_0_20px_rgba(0,229,153,0.35)] hover:opacity-95'
                  : 'bg-[#1F2633] text-[#8B95A5] cursor-not-allowed'
              }`}
            >
              {cart.length > 0
                ? `CHARGE ₹${(totals.totalPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })} [${paymentMode}]`
                : 'REGISTER READY'}
            </button>
          </div>
        </section>
      </div>

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="absolute bottom-6 left-6 z-50 rounded-lg border border-[#00E599]/40 bg-[#090B0E]/95 px-4 py-2.5 font-mono text-xs text-[#00E599] shadow-2xl backdrop-blur-md">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
