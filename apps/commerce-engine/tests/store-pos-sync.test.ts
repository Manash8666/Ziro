import { describe, it, expect } from 'vitest';
import {
  reconcileOfflinePosOrderInRlsTx,
  type PosOrderPayload,
} from '../src/services/pos-order-sync.js';
import { POST } from '../src/api/store/pos/sync/route.js';
import type { EngineRequest, EngineResponse } from '../src/services/engine-container.js';

interface ExecutedQuery {
  sql: string;
  params?: any[];
}

class MockDbClient {
  public queries: ExecutedQuery[] = [];
  public ordersTable: Map<string, any> = new Map();
  public ledgerEntries: any[] = [];

  async query(sql: string, params: any[] = []): Promise<{ rows: any[]; rowCount: number }> {
    this.queries.push({ sql, params });

    if (sql.includes('SELECT order_id FROM ziro_pos_orders')) {
      const [tenantId, offlineOrderId] = params;
      const key = `${tenantId}:${offlineOrderId}`;
      const found = this.ordersTable.get(key);
      return {
        rows: found ? [{ order_id: found.order_id }] : [],
        rowCount: found ? 1 : 0,
      };
    }

    if (sql.includes('INSERT INTO ziro_pos_orders')) {
      const [orderId, tenantId, , , offlineOrderId, , , , , , total] = params;
      const key = `${tenantId}:${offlineOrderId}`;
      this.ordersTable.set(key, { order_id: orderId, tenantId, total });
      return { rows: [], rowCount: 1 };
    }

    if (sql.includes('INSERT INTO ziro_accounting_ledger')) {
      const [tenantId, refType, refId, accCode, accName, debit, credit] = params;
      this.ledgerEntries.push({
        tenantId,
        refType,
        refId,
        accCode,
        accName,
        debit: Number(debit),
        credit: Number(credit),
      });
      return { rows: [], rowCount: 1 };
    }

    return { rows: [], rowCount: 1 };
  }
}

describe('Commerce Engine POS Order Sync & Double-Entry Accounting Ledger', () => {
  const sampleOrder: PosOrderPayload = {
    offlineOrderId: 'offline_ticket_001_abc',
    tenantId: 'tenant_fashion_01',
    terminalId: 'POS-01',
    cashierId: 'cashier_vikram',
    items: [
      {
        sku: 'ZR-BRK-001',
        title: 'Brembo Ceramic Front Brake Pads',
        hsnCode: '87083000',
        gstSlabPercent: 18,
        unitPricePaise: 485000,
        qty: 2,
      },
    ],
    subtotalPaise: 970000,
    cgstPaise: 87300,
    sgstPaise: 87300,
    igstPaise: 0,
    totalTaxPaise: 174600,
    totalPaise: 1144600,
    paymentMode: 'CASH',
    platformFeeBps: 0,
    createdAt: '2026-11-27T10:00:00Z',
  };

  it('reconciles offline order and sets app.current_tenant_id under PostgreSQL 17 RLS', async () => {
    const mockClient = new MockDbClient();
    const result = await reconcileOfflinePosOrderInRlsTx(mockClient, 'tenant_fashion_01', sampleOrder);

    expect(result.duplicate).toBe(false);
    expect(result.orderId).toContain('pos_ord_');
    expect(result.platformFeeBps).toBe(0);
    expect(result.ledgerEntriesCreated).toBe(4); // Debit Cash, Credit Sales, Credit CGST, Credit SGST

    // Verify set_config was called with tenant_fashion_01
    const setConfigQuery = mockClient.queries.find((q) => q.sql.includes("set_config('app.current_tenant_id'"));
    expect(setConfigQuery).toBeDefined();
    expect(setConfigQuery?.params?.[0]).toBe('tenant_fashion_01');
  });

  it('enforces idempotency: duplicate sync returns duplicate=true without re-crediting ledger', async () => {
    const mockClient = new MockDbClient();
    const firstSync = await reconcileOfflinePosOrderInRlsTx(mockClient, 'tenant_fashion_01', sampleOrder);
    expect(firstSync.duplicate).toBe(false);

    const secondSync = await reconcileOfflinePosOrderInRlsTx(mockClient, 'tenant_fashion_01', sampleOrder);
    expect(secondSync.duplicate).toBe(true);
    expect(secondSync.orderId).toBe(firstSync.orderId);
    expect(secondSync.ledgerEntriesCreated).toBe(0);
  });

  it('generates strictly balanced double-entry accounting ledger lines (Debits == Credits)', async () => {
    const mockClient = new MockDbClient();
    await reconcileOfflinePosOrderInRlsTx(mockClient, 'tenant_fashion_01', sampleOrder);

    const entries = mockClient.ledgerEntries;
    expect(entries.length).toBe(4);

    const totalDebits = entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredits = entries.reduce((sum, e) => sum + e.credit, 0);

    // Balanced equation: Total Debits must equal Total Credits!
    expect(totalDebits).toBe(1144600); // Cash on Hand
    expect(totalCredits).toBe(1144600); // 970000 (Sales) + 87300 (CGST) + 87300 (SGST)
    expect(totalDebits).toBe(totalCredits);
  });

  it('rejects orders with non-zero platform fees (0% GMV invariant)', async () => {
    const mockClient = new MockDbClient();
    const invalidOrder = {
      ...sampleOrder,
      platformFeeBps: 50 as any, // Violation
    };

    await expect(
      reconcileOfflinePosOrderInRlsTx(mockClient, 'tenant_fashion_01', invalidOrder)
    ).rejects.toThrow('ZIRO_PLATFORM_FEE_BPS invariant violated');
  });

  it('handles direct ticket POST sync route with Medusa v2 container', async () => {
    const mockClient = new MockDbClient();
    let responseCode = 0;
    let responseJson: any = null;

    const req: EngineRequest = {
      headers: {
        'x-tenant-id': 'tenant_fashion_01',
      },
      body: sampleOrder,
      scope: {
        resolve: (key: string) => (key === 'sqlClient' ? mockClient : null),
      },
    };

    const res: EngineResponse = {
      status(code: number) {
        responseCode = code;
        return this;
      },
      json(data: any) {
        responseJson = data;
        return this;
      },
    };

    await POST(req, res);

    expect(responseCode).toBe(200);
    expect(responseJson.success).toBe(true);
    expect(responseJson.duplicate).toBe(false);
    expect(responseJson.platformFeeBps).toBe(0);
  });
});
