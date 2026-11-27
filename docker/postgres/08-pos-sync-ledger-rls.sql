-- docker/postgres/08-pos-sync-ledger-rls.sql
-- Stage 5: Ziro POS Order Reconciliation, Inventory Deductions & Double-Entry Accounting Ledger

BEGIN;

CREATE TABLE IF NOT EXISTS ziro_pos_orders (
  order_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  terminal_id TEXT NOT NULL,
  cashier_id TEXT,
  offline_order_id TEXT NOT NULL,
  subtotal_paise BIGINT NOT NULL CHECK (subtotal_paise >= 0),
  cgst_paise BIGINT NOT NULL DEFAULT 0 CHECK (cgst_paise >= 0),
  sgst_paise BIGINT NOT NULL DEFAULT 0 CHECK (sgst_paise >= 0),
  igst_paise BIGINT NOT NULL DEFAULT 0 CHECK (igst_paise >= 0),
  total_tax_paise BIGINT NOT NULL DEFAULT 0 CHECK (total_tax_paise >= 0),
  total_paise BIGINT NOT NULL CHECK (total_paise >= 0),
  payment_mode VARCHAR(32) NOT NULL,
  platform_fee_bps SMALLINT NOT NULL DEFAULT 0 CHECK (platform_fee_bps = 0),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_pos_order_tenant_offline UNIQUE (tenant_id, offline_order_id)
);

CREATE TABLE IF NOT EXISTS ziro_pos_order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES ziro_pos_orders(order_id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  title TEXT NOT NULL,
  hsn_code VARCHAR(8) NOT NULL,
  gst_slab_percent SMALLINT NOT NULL CHECK (gst_slab_percent IN (0, 5, 12, 18, 28)),
  unit_price_paise BIGINT NOT NULL CHECK (unit_price_paise >= 0),
  qty INTEGER NOT NULL CHECK (qty > 0),
  line_total_paise BIGINT NOT NULL CHECK (line_total_paise >= 0)
);

CREATE TABLE IF NOT EXISTS ziro_accounting_ledger (
  entry_id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  reference_type VARCHAR(32) NOT NULL,
  reference_id TEXT NOT NULL,
  account_code VARCHAR(32) NOT NULL,
  account_name VARCHAR(64) NOT NULL,
  debit_paise BIGINT NOT NULL DEFAULT 0 CHECK (debit_paise >= 0),
  credit_paise BIGINT NOT NULL DEFAULT 0 CHECK (credit_paise >= 0),
  platform_fee_bps SMALLINT NOT NULL DEFAULT 0 CHECK (platform_fee_bps = 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pos_sync_log (
  sync_id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  terminal_id TEXT NOT NULL,
  offline_order_id TEXT NOT NULL,
  status VARCHAR(16) NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error_message TEXT
);

-- Secondary Indexes
CREATE INDEX IF NOT EXISTS idx_pos_orders_tenant_terminal ON ziro_pos_orders (tenant_id, terminal_id);
CREATE INDEX IF NOT EXISTS idx_pos_order_items_tenant_sku ON ziro_pos_order_items (tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_ledger_tenant_ref ON ziro_accounting_ledger (tenant_id, reference_type, reference_id);

-- Enforce PostgreSQL 17 FORCE ROW LEVEL SECURITY across all 4 tables
ALTER TABLE ziro_pos_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ziro_pos_orders FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON ziro_pos_orders;
CREATE POLICY tenant_isolation_policy ON ziro_pos_orders
  USING (tenant_id = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::text);

ALTER TABLE ziro_pos_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ziro_pos_order_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON ziro_pos_order_items;
CREATE POLICY tenant_isolation_policy ON ziro_pos_order_items
  USING (tenant_id = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::text);

ALTER TABLE ziro_accounting_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE ziro_accounting_ledger FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON ziro_accounting_ledger;
CREATE POLICY tenant_isolation_policy ON ziro_accounting_ledger
  USING (tenant_id = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::text);

ALTER TABLE pos_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sync_log FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON pos_sync_log;
CREATE POLICY tenant_isolation_policy ON pos_sync_log
  USING (tenant_id = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::text);

COMMIT;
