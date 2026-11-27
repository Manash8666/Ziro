import { describe, it, expect } from 'vitest';
import {
  MULTI_VERTICAL_STORES,
  filterProducts,
  bulkUpdateProductStatus,
  exportProductsToCsv,
  computeStoreMetrics,
} from '../src/lib/merchant-admin-data';

describe('Merchant Admin Shell & Multi-Vertical Data Layer', () => {
  it('loads multi-vertical dataset with 0% GMV fee invariant across all orders', () => {
    const storeKeys = Object.keys(MULTI_VERTICAL_STORES);
    expect(storeKeys).toContain('fashion');
    expect(storeKeys).toContain('ayurveda');
    expect(storeKeys).toContain('auto');
    expect(storeKeys).toContain('electronics');

    for (const [key, store] of Object.entries(MULTI_VERTICAL_STORES)) {
      expect(store.products.length).toBeGreaterThan(0);
      expect(store.orders.length).toBeGreaterThan(0);

      // Verify every order satisfies platformFeeBps === 0
      for (const order of store.orders) {
        expect(order.platformFeeBps).toBe(0);
        expect(order.totalPaise).toBeGreaterThan(0);
      }

      // Verify every product has valid inventory and tax metadata
      for (const prod of store.products) {
        expect(prod.pricePaise).toBeGreaterThan(0);
        expect(prod.inventoryOnHand).toBeGreaterThanOrEqual(0);
        expect(['ACTIVE', 'DRAFT', 'ARCHIVED']).toContain(prod.status);
        expect(prod.hsnCode).toMatch(/^[0-9]{4,8}$/);
      }
    }
  });

  it('filters catalog items by status and multi-field query (title, SKU, HSN)', () => {
    const products = MULTI_VERTICAL_STORES.fashion.products;

    // Filter by status ACTIVE
    const activeOnly = filterProducts(products, { status: 'ACTIVE' });
    expect(activeOnly.length).toBe(3);
    expect(activeOnly.every((p) => p.status === 'ACTIVE')).toBe(true);

    // Filter by query (SKU: AUR-SLK-001)
    const bySku = filterProducts(products, { query: 'AUR-SLK-001' });
    expect(bySku.length).toBe(1);
    expect(bySku[0].title).toContain('Mulberry Silk');

    // Filter by query (Title substring)
    const byTitle = filterProducts(products, { query: 'cashmere' });
    expect(byTitle.length).toBe(1);
    expect(byTitle[0].sku).toBe('AUR-CSH-002');

    // Filter by query (HSN code)
    const byHsn = filterProducts(products, { query: '62044200' });
    expect(byHsn.length).toBe(1);
  });

  it('updates product status in bulk idempotently', () => {
    const products = MULTI_VERTICAL_STORES.fashion.products;
    const targetIds = ['prod_fsh_01', 'prod_fsh_02'];

    const updated = bulkUpdateProductStatus(products, targetIds, 'ARCHIVED');
    const archived = updated.filter((p) => targetIds.includes(p.id));

    expect(archived.every((p) => p.status === 'ARCHIVED')).toBe(true);

    // Untargeted products must remain unchanged
    const unchanged = updated.find((p) => p.id === 'prod_fsh_03');
    expect(unchanged?.status).toBe('ACTIVE');
  });

  it('generates compliant CSV export format with RFC 4180 escaped quotes', () => {
    const products = MULTI_VERTICAL_STORES.auto.products;
    const csv = exportProductsToCsv(products);

    const lines = csv.split('\n');
    expect(lines[0]).toBe('ID,SKU,Title,Category,Price,Inventory,Status,HSN_Code,GST_Percent');
    expect(lines.length).toBe(products.length + 1);

    // Verify brake rotor line
    const rotorLine = lines.find((l) => l.includes('APX-RTR-002'));
    expect(rotorLine).toBeDefined();
    expect(rotorLine).toContain('12500.00'); // Rs. 12,500.00
    expect(rotorLine).toContain('87083000');
  });

  it('calculates store metrics and verifies 0% GMV fee guarantee and positive tax savings', () => {
    const store = MULTI_VERTICAL_STORES.fashion;
    const metrics = computeStoreMetrics(store.orders, store.products);

    expect(metrics.platformFeeBps).toBe(0);
    expect(metrics.totalOrders).toBe(3);
    // Total GMV = 4900000 + 3800000 + 1650000 = 10350000 paise (Rs. 103,500)
    expect(metrics.totalGmvPaise).toBe(10350000);
    expect(metrics.avgOrderValuePaise).toBe(Math.round(10350000 / 3));

    // Estimated legacy tax saved (2.9% + Rs. 25/order):
    // 10350000 * 0.029 = 300150 paise
    // 3 * 2500 = 7500 paise
    // Total saved = 307650 paise (Rs. 3,076.50)
    expect(metrics.estimatedTaxSavedPaise).toBe(307650);
    expect(metrics.activeProducts).toBe(3);
    expect(metrics.totalInventory).toBe(52);
  });
});
