import Dexie, { type Table } from 'dexie';

export interface OfflineCatalogItem {
  sku: string;
  barcode: string;
  title: string;
  category: string;
  hsnCode: string;
  gstSlabPercent: number;
  pricePaise: number;
  stockOnHand: number;
  version: number;
}

export interface PosCartItem {
  sku: string;
  title: string;
  barcode: string;
  hsnCode: string;
  gstSlabPercent: number;
  unitPricePaise: number;
  qty: number;
}

export interface OfflinePosOrder {
  offlineOrderId: string;
  tenantId: string;
  terminalId: string;
  cashierId: string;
  items: PosCartItem[];
  subtotalPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalTaxPaise: number;
  totalPaise: number;
  paymentMode: 'CASH' | 'UPI' | 'CARD' | 'B2B_CREDIT';
  platformFeeBps: 0; // Invariant
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  createdAt: string;
  syncedAt?: string;
  error?: string;
}

export const SEED_OFFLINE_CATALOG: OfflineCatalogItem[] = [
  {
    sku: 'ZR-BRK-001',
    barcode: '8901234001015',
    title: 'Brembo Ceramic Front Brake Pads',
    category: 'Brakes',
    hsnCode: '87083000',
    gstSlabPercent: 18,
    pricePaise: 485000, // Rs. 4,850.00
    stockOnHand: 45,
    version: 1,
  },
  {
    sku: 'ZR-RTR-002',
    barcode: '8901234001022',
    title: 'Slotted Ventilated Rotor Set (Front)',
    category: 'Brakes',
    hsnCode: '87083000',
    gstSlabPercent: 18,
    pricePaise: 1250000, // Rs. 12,500.00
    stockOnHand: 22,
    version: 1,
  },
  {
    sku: 'ZR-OIL-003',
    barcode: '8901234001039',
    title: 'Motul 300V Synthetic 5W-40 4L',
    category: 'Fluids',
    hsnCode: '27101980',
    gstSlabPercent: 18,
    pricePaise: 540000, // Rs. 5,400.00
    stockOnHand: 60,
    version: 1,
  },
  {
    sku: 'ZR-FLT-004',
    barcode: '8901234001046',
    title: 'High-Flow Magnetic Oil Filter',
    category: 'Filters',
    hsnCode: '84212300',
    gstSlabPercent: 18,
    pricePaise: 120000, // Rs. 1,200.00
    stockOnHand: 110,
    version: 1,
  },
  {
    sku: 'ZR-SPK-005',
    barcode: '8901234001053',
    title: 'NGK Laser Iridium Spark Plug (Pack of 4)',
    category: 'Ignition',
    hsnCode: '85111000',
    gstSlabPercent: 18,
    pricePaise: 380000, // Rs. 3,800.00
    stockOnHand: 75,
    version: 1,
  },
  {
    sku: 'ZR-SUS-006',
    barcode: '8901234001060',
    title: 'Bilstein B14 Performance Coilover Kit',
    category: 'Suspension',
    hsnCode: '87088000',
    gstSlabPercent: 28,
    pricePaise: 6800000, // Rs. 68,000.00
    stockOnHand: 8,
    version: 1,
  },
  {
    sku: 'ZR-KIT-007',
    barcode: '8901234001077',
    title: 'Stage 2 Complete Track Brake & Rotor BOM Kit',
    category: 'Kits',
    hsnCode: '87083000',
    gstSlabPercent: 18,
    pricePaise: 1650000, // Rs. 16,500.00
    stockOnHand: 14,
    version: 1,
  },
];

export function calculatePosTicketTotals(
  items: PosCartItem[],
  options?: { isInterState?: boolean; discountBps?: number }
) {
  const isInterState = options?.isInterState ?? false;
  let subtotalPaise = 0;
  let totalCgstPaise = 0;
  let totalSgstPaise = 0;
  let totalIgstPaise = 0;

  for (const item of items) {
    const lineBase = item.unitPricePaise * item.qty;
    subtotalPaise += lineBase;
    const rate = item.gstSlabPercent / 100;
    const lineTax = Math.round(lineBase * rate);

    if (isInterState) {
      totalIgstPaise += lineTax;
    } else {
      const halfTax = Math.floor(lineTax / 2);
      totalCgstPaise += halfTax;
      totalSgstPaise += (lineTax - halfTax);
    }
  }

  const totalTaxPaise = isInterState ? totalIgstPaise : (totalCgstPaise + totalSgstPaise);
  const totalPaise = subtotalPaise + totalTaxPaise;

  return {
    subtotalPaise,
    cgstPaise: totalCgstPaise,
    sgstPaise: totalSgstPaise,
    igstPaise: totalIgstPaise,
    totalTaxPaise,
    totalPaise,
    platformFeeBps: 0 as const, // Invariant: 0% GMV fee
    platformFeePaise: 0,
  };
}

export class ZiroOfflinePosDb extends Dexie {
  catalog!: Table<OfflineCatalogItem, string>;
  cartItems!: Table<PosCartItem, string>;
  pendingOrders!: Table<OfflinePosOrder, string>;

  constructor(dbName = 'ziro_pos_offline_v2') {
    super(dbName);
    this.version(1).stores({
      catalog: 'sku, barcode, category',
      cartItems: 'sku',
      pendingOrders: 'offlineOrderId, createdAt, status',
    });
  }
}

export const posOfflineDb = typeof window !== 'undefined' ? new ZiroOfflinePosDb() : null;

export async function seedOfflineCatalogIfEmpty(db: ZiroOfflinePosDb): Promise<void> {
  const count = await db.catalog.count();
  if (count === 0) {
    await db.catalog.bulkAdd(SEED_OFFLINE_CATALOG);
  }
}

export async function enqueueOfflinePosOrder(
  db: ZiroOfflinePosDb,
  order: OfflinePosOrder
): Promise<void> {
  // Enforce 0% platform fee invariant
  if (order.platformFeeBps !== 0) {
    throw new Error(`ZIRO_PLATFORM_FEE_BPS invariant violated: must be 0`);
  }

  await db.transaction('rw', db.pendingOrders, db.catalog, async () => {
    await db.pendingOrders.put(order);

    // Deduct local on-hand inventory immediately
    for (const item of order.items) {
      const catalogItem = await db.catalog.get(item.sku);
      if (catalogItem) {
        const nextStock = Math.max(0, catalogItem.stockOnHand - item.qty);
        await db.catalog.update(item.sku, { stockOnHand: nextStock });
      }
    }
  });
}

export async function flushPendingOfflineOrders(
  db: ZiroOfflinePosDb,
  apiEndpoint = '/api/store/pos/sync'
): Promise<{ syncedCount: number; failedCount: number }> {
  const pending = await db.pendingOrders.where('status').equals('PENDING').toArray();
  if (pending.length === 0) {
    return { syncedCount: 0, failedCount: 0 };
  }

  let syncedCount = 0;
  let failedCount = 0;

  for (const order of pending) {
    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': order.tenantId,
        },
        body: JSON.stringify(order),
      });

      if (res.ok) {
        await db.pendingOrders.update(order.offlineOrderId, {
          status: 'SYNCED',
          syncedAt: new Date().toISOString(),
        });
        syncedCount++;
      } else {
        const errText = await res.text();
        await db.pendingOrders.update(order.offlineOrderId, {
          status: 'FAILED',
          error: errText,
        });
        failedCount++;
      }
    } catch (e: any) {
      // Network failure, leaves in PENDING state for next retry
      failedCount++;
    }
  }

  return { syncedCount, failedCount };
}
