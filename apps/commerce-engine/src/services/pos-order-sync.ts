import { executeInTenantRls, DbClientWithQuery } from '../lib/rls-transaction.js';

export interface PosOrderPayload {
  offlineOrderId: string;
  tenantId: string;
  terminalId: string;
  cashierId?: string;
  items: Array<{
    sku: string;
    title: string;
    hsnCode: string;
    gstSlabPercent: number;
    unitPricePaise: number;
    qty: number;
  }>;
  subtotalPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalTaxPaise: number;
  totalPaise: number;
  paymentMode: 'CASH' | 'UPI' | 'CARD' | 'B2B_CREDIT';
  platformFeeBps: 0;
  createdAt?: string;
}

export interface ReconcileResult {
  duplicate: boolean;
  orderId: string;
  ledgerEntriesCreated: number;
  platformFeeBps: 0;
}

/**
 * Reconciles an offline POS order inside a PostgreSQL 17 tenant RLS transaction.
 * Performs idempotent deduplication, stores line items, and commits balanced
 * double-entry accounting ledger entries.
 */
export async function reconcileOfflinePosOrderInRlsTx(
  client: DbClientWithQuery,
  tenantId: string,
  payload: PosOrderPayload
): Promise<ReconcileResult> {
  // Hardcoded Invariant: 0% GMV platform fee
  if (payload.platformFeeBps !== 0) {
    throw new Error(`ZIRO_PLATFORM_FEE_BPS invariant violated: received ${payload.platformFeeBps}, must be 0`);
  }

  return await executeInTenantRls(client, tenantId, async () => {
    // 1. Idempotency Check
    const checkRes = await client.query(
      `SELECT order_id FROM ziro_pos_orders WHERE tenant_id = $1 AND offline_order_id = $2;`,
      [tenantId, payload.offlineOrderId]
    );

    if (checkRes.rows && checkRes.rows.length > 0) {
      return {
        duplicate: true,
        orderId: checkRes.rows[0].order_id,
        ledgerEntriesCreated: 0,
        platformFeeBps: 0,
      };
    }

    const orderId = `pos_ord_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const createdAt = payload.createdAt || new Date().toISOString();

    // 2. Insert into ziro_pos_orders
    await client.query(
      `INSERT INTO ziro_pos_orders (
        order_id, tenant_id, terminal_id, cashier_id, offline_order_id,
        subtotal_paise, cgst_paise, sgst_paise, igst_paise, total_tax_paise, total_paise,
        payment_mode, platform_fee_bps, created_at, synced_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0, $13, NOW());`,
      [
        orderId,
        tenantId,
        payload.terminalId,
        payload.cashierId || null,
        payload.offlineOrderId,
        payload.subtotalPaise,
        payload.cgstPaise,
        payload.sgstPaise,
        payload.igstPaise,
        payload.totalTaxPaise,
        payload.totalPaise,
        payload.paymentMode,
        createdAt,
      ]
    );

    // 3. Insert items
    for (const item of payload.items) {
      const lineTotal = item.unitPricePaise * item.qty;
      await client.query(
        `INSERT INTO ziro_pos_order_items (
          order_id, tenant_id, sku, title, hsn_code, gst_slab_percent,
          unit_price_paise, qty, line_total_paise
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
        [
          orderId,
          tenantId,
          item.sku,
          item.title,
          item.hsnCode,
          item.gstSlabPercent,
          item.unitPricePaise,
          item.qty,
          lineTotal,
        ]
      );
    }

    // 4. Double-Entry Accounting Ledger Generation
    // Balanced accounting: Assets (Dr) = Liabilities (Cr) + Equity/Revenue (Cr)
    const assetAccount = payload.paymentMode === 'CASH'
      ? { code: '1010-CASH-ON-HAND', name: 'Cash on Hand' }
      : payload.paymentMode === 'UPI'
      ? { code: '1020-BANK-UPI', name: 'Bank Settlement Account (UPI)' }
      : payload.paymentMode === 'CARD'
      ? { code: '1030-EDC-CLEARING', name: 'Card Clearing Account' }
      : { code: '1100-AR-B2B-CREDIT', name: 'Accounts Receivable (B2B Net-30)' };

    // Record Debit line (Cash/Bank Asset)
    await client.query(
      `INSERT INTO ziro_accounting_ledger (
        tenant_id, reference_type, reference_id, account_code, account_name,
        debit_paise, credit_paise, platform_fee_bps, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, NOW());`,
      [tenantId, 'POS_ORDER', orderId, assetAccount.code, assetAccount.name, payload.totalPaise, 0]
    );

    // Record Credit line for Sales Revenue
    await client.query(
      `INSERT INTO ziro_accounting_ledger (
        tenant_id, reference_type, reference_id, account_code, account_name,
        debit_paise, credit_paise, platform_fee_bps, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, NOW());`,
      [tenantId, 'POS_ORDER', orderId, '4010-RETAIL-SALES', 'Retail Product Sales Revenue', 0, payload.subtotalPaise]
    );

    let entriesCount = 2;

    // Record Credit lines for GST Output Tax Payable
    if (payload.cgstPaise > 0) {
      await client.query(
        `INSERT INTO ziro_accounting_ledger (
          tenant_id, reference_type, reference_id, account_code, account_name,
          debit_paise, credit_paise, platform_fee_bps, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, NOW());`,
        [tenantId, 'POS_ORDER', orderId, '2020-CGST-PAYABLE', 'Central GST Output Tax Payable', 0, payload.cgstPaise]
      );
      entriesCount++;
    }

    if (payload.sgstPaise > 0) {
      await client.query(
        `INSERT INTO ziro_accounting_ledger (
          tenant_id, reference_type, reference_id, account_code, account_name,
          debit_paise, credit_paise, platform_fee_bps, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, NOW());`,
        [tenantId, 'POS_ORDER', orderId, '2021-SGST-PAYABLE', 'State GST Output Tax Payable', 0, payload.sgstPaise]
      );
      entriesCount++;
    }

    if (payload.igstPaise > 0) {
      await client.query(
        `INSERT INTO ziro_accounting_ledger (
          tenant_id, reference_type, reference_id, account_code, account_name,
          debit_paise, credit_paise, platform_fee_bps, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, NOW());`,
        [tenantId, 'POS_ORDER', orderId, '2022-IGST-PAYABLE', 'Integrated GST Output Tax Payable', 0, payload.igstPaise]
      );
      entriesCount++;
    }

    // 5. Log sync event
    await client.query(
      `INSERT INTO pos_sync_log (
        tenant_id, terminal_id, offline_order_id, status, received_at
      ) VALUES ($1, $2, $3, 'SUCCESS', NOW());`,
      [tenantId, payload.terminalId, payload.offlineOrderId]
    );

    return {
      duplicate: false,
      orderId,
      ledgerEntriesCreated: entriesCount,
      platformFeeBps: 0,
    };
  });
}
