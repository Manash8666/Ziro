'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ZiroWordmark, StatusBadge, ZiroButton, formatMinorCurrency } from '@ziro/ui-kit';
import { DexiePosStorage, ZiroPosDb, type PosCatalogRow, type PosConflictRow } from '../lib/db';
import { PosSyncEngine } from '../lib/sync-engine';

const DEMO_CATALOG: PosCatalogRow[] = [
  { sku: 'BRK-001', title: 'Ceramic Brake Pad Kit', barcode: '890123456001', price_minor: 150000, on_hand: 14, version: 1 },
  { sku: 'OIL-002', title: 'Synthetic Engine Oil 5W30', barcode: '890123456002', price_minor: 95000, on_hand: 22, version: 1 },
  { sku: 'FLT-003', title: 'Air Intake Filter Pro', barcode: '890123456003', price_minor: 45000, on_hand: 19, version: 1 },
];

export default function PosCounterPage() {
  const [online, setOnline] = useState(true);
  const [catalog, setCatalog] = useState<PosCatalogRow[]>(DEMO_CATALOG);
  const [cart, setCart] = useState<Array<{ sku: string; title: string; qty: number; unit_price_minor: number }>>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [conflicts, setConflicts] = useState<PosConflictRow[]>([]);
  const [statusMessage, setStatusMessage] = useState('Local-first IndexedDB ledger ready');
  const [storage, setStorage] = useState<DexiePosStorage | null>(null);
  const [engine, setEngine] = useState<PosSyncEngine | null>(null);

  useEffect(() => {
    const isNowOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    setOnline(isNowOnline);

    const db = new ZiroPosDb();
    const dexieStorage = new DexiePosStorage(db);
    const syncEngine = new PosSyncEngine({
      storage: dexieStorage,
      deviceId: 'pos-counter-01',
      locationId: 'loc_main',
      apiBaseUrl: process.env.NEXT_PUBLIC_COMMERCE_URL ?? 'http://localhost:9000',
    });

    setStorage(dexieStorage);
    setEngine(syncEngine);

    const hydrate = async () => {
      const existing = await dexieStorage.listCatalog();
      if (existing.length === 0) {
        for (const item of DEMO_CATALOG) {
          await dexieStorage.upsertCatalogItem(item);
        }
      }
      setCatalog(await dexieStorage.listCatalog());
      setPendingCount((await dexieStorage.listPendingMutations()).length);
      setConflicts(await dexieStorage.listConflicts());
    };
    void hydrate();

    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const addToCart = (item: PosCatalogRow) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.sku === item.sku);
      if (existing) {
        return prev.map((c) => (c.sku === item.sku ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { sku: item.sku, title: item.title, qty: 1, unit_price_minor: item.price_minor }];
    });
  };

  const handleCheckout = async (method: 'CASH' | 'UPI' | 'CARD') => {
    if (!engine || !storage || cart.length === 0) return;
    await engine.queueSale({ items: cart.map(({ sku, qty, unit_price_minor }) => ({ sku, qty, unit_price_minor })), payment_method: method });
    setCart([]);
    setPendingCount((await storage.listPendingMutations()).length);
    setStatusMessage(`Queued ${method} sale locally (0ms latency)`);
    if (online) {
      try {
        const res = await engine.flushPendingMutations();
        setPendingCount((await storage.listPendingMutations()).length);
        setConflicts(await storage.listConflicts());
        setStatusMessage(`Synced ${res.applied} mutation(s), ${res.conflicts} conflict(s)`);
      } catch {
        setStatusMessage('Saved in offline queue — will auto-sync when backend is reachable');
      }
    }
  };

  const totalMinor = cart.reduce((acc, item) => acc + item.unit_price_minor * item.qty, 0);

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1F2633] pb-4">
        <div className="flex items-center gap-4">
          <ZiroWordmark />
          <span className="text-xs uppercase tracking-widest text-[#8B95A5]">Counter POS</span>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-[#00E599] font-medium">Counter</Link>
          <Link href="/warehouse" className="text-[#8B95A5] hover:text-[#F4F6F9]">Warehouse</Link>
          <Link href="/b2b" className="text-[#8B95A5] hover:text-[#F4F6F9]">B2B Quick Order</Link>
          <StatusBadge
            variant={online && pendingCount === 0 ? 'live-sync' : 'offline-queue'}
            queueCount={pendingCount}
            label={online && pendingCount === 0 ? 'Synced' : `Offline Queue: ${pendingCount}`}
          />
        </nav>
      </header>

      {conflicts.length > 0 && (
        <div className="rounded-lg border border-[#F59E0B]/40 bg-[#12161E] p-4 flex items-center justify-between">
          <span className="text-sm text-[#F59E0B]">
            {conflicts.length} inventory sync conflict(s) require supervisor review.
          </span>
          <ZiroButton
            variant="secondary"
            onClick={async () => {
              if (!engine || !storage) return;
              for (const c of conflicts) {
                await engine.resolveConflict(c.conflict_id, 'accept_server');
              }
              setConflicts(await storage.listConflicts());
            }}
          >
            Accept Server Balances
          </ZiroButton>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-medium text-[#8B95A5] uppercase tracking-wider">Catalog SKUs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {catalog.map((item) => (
              <button
                key={item.sku}
                type="button"
                onClick={() => addToCart(item)}
                className="text-left rounded-lg border border-[#1F2633] bg-[#12161E] p-4 hover:border-[#00E599] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#8B95A5]">{item.sku}</span>
                  <span className="font-mono text-xs text-[#00E599]">Stock: {item.on_hand}</span>
                </div>
                <div className="mt-1 font-medium text-[#F4F6F9]">{item.title}</div>
                <div className="mt-2 font-mono text-sm text-[#F4F6F9]">
                  {formatMinorCurrency(item.price_minor, 'INR')}
                </div>
              </button>
            ))}
          </div>
        </section>

        <aside className="rounded-lg border border-[#1F2633] bg-[#12161E] p-4 space-y-4">
          <h2 className="text-sm font-medium text-[#8B95A5] uppercase tracking-wider">Active Ticket</h2>
          <div className="space-y-2 min-h-[140px]">
            {cart.length === 0 ? (
              <p className="text-sm text-[#8B95A5]">Tap or scan an item to add to counter ticket.</p>
            ) : (
              cart.map((line) => (
                <div key={line.sku} className="flex justify-between text-sm">
                  <span>{line.title} × {line.qty}</span>
                  <span className="font-mono">{formatMinorCurrency(line.unit_price_minor * line.qty, 'INR')}</span>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-[#1F2633] pt-3 flex justify-between font-mono text-base">
            <span>Total</span>
            <span className="text-[#00E599]">{formatMinorCurrency(totalMinor, 'INR')}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <ZiroButton variant="primary" onClick={() => void handleCheckout('UPI')} disabled={cart.length === 0}>
              UPI
            </ZiroButton>
            <ZiroButton variant="secondary" onClick={() => void handleCheckout('CASH')} disabled={cart.length === 0}>
              Cash
            </ZiroButton>
            <ZiroButton variant="secondary" onClick={() => void handleCheckout('CARD')} disabled={cart.length === 0}>
              Card
            </ZiroButton>
          </div>
          <p className="text-xs text-[#8B95A5]">{statusMessage}</p>
        </aside>
      </div>
    </div>
  );
}
