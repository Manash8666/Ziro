-- Ziro Commerce OS — PostgreSQL 17 Schema Extensions
-- Conventions: snake_case, TIMESTAMPTZ, BIGINT minor units / NUMERIC,
-- TEXT + CHECK constraints, explicit FK indexes, GIN for JSONB,
-- vector(1024) + HNSW cosine index, TimescaleDB hypertable.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE SCHEMA IF NOT EXISTS payload;

-- =============================================================================
-- 1. Tenancy & Gateway Isolation
-- =============================================================================

CREATE TABLE IF NOT EXISTS tenants (
    tenant_id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    primary_domain TEXT UNIQUE,
    medusa_store_id TEXT NOT NULL,
    medusa_sales_channel_id TEXT NOT NULL,
    pos_conflict_policy TEXT NOT NULL DEFAULT 'FORCE_SALE_WITH_ALERT'
        CHECK (pos_conflict_policy IN ('FORCE_SALE_WITH_ALERT', 'STRICT_REJECT')),
    origin_state_code TEXT NOT NULL DEFAULT '27',
    min_margin_bps INTEGER NOT NULL DEFAULT 1500
        CHECK (min_margin_bps >= 0 AND min_margin_bps <= 10000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_gateway_configs (
    config_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('razorpay', 'stripe', 'ondc')),
    key_id TEXT NOT NULL,
    secret_ciphertext TEXT NOT NULL,
    webhook_secret_ciphertext TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (tenant_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_tenant_gateway_configs_tenant_id
    ON tenant_gateway_configs (tenant_id);

CREATE TABLE IF NOT EXISTS webhook_events (
    event_pk BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    external_event_id TEXT NOT NULL,
    payload_hash TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, provider, external_event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_tenant_processed
    ON webhook_events (tenant_id, processed_at DESC);

-- =============================================================================
-- 2. Fitment & Compatibility
-- =============================================================================

CREATE TABLE IF NOT EXISTS fitment_vehicles (
    vehicle_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year_from INTEGER NOT NULL CHECK (year_from >= 1950),
    year_to INTEGER NOT NULL CHECK (year_to >= year_from),
    variant TEXT NOT NULL DEFAULT '',
    fuel_type TEXT NOT NULL DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (tenant_id, make, model, year_from, year_to, variant)
);

CREATE INDEX IF NOT EXISTS idx_fitment_vehicles_lookup
    ON fitment_vehicles (tenant_id, make, model, year_from, year_to);

CREATE INDEX IF NOT EXISTS idx_fitment_vehicles_metadata_gin
    ON fitment_vehicles USING gin (metadata);

CREATE TABLE IF NOT EXISTS product_fitments (
    fitment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    sku TEXT NOT NULL,
    vehicle_id BIGINT NOT NULL REFERENCES fitment_vehicles(vehicle_id) ON DELETE CASCADE,
    position TEXT NOT NULL DEFAULT 'universal',
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, sku, vehicle_id, position)
);

CREATE INDEX IF NOT EXISTS idx_product_fitments_vehicle_id
    ON product_fitments (vehicle_id);

CREATE INDEX IF NOT EXISTS idx_product_fitments_tenant_sku
    ON product_fitments (tenant_id, sku);

-- =============================================================================
-- 3. Bill-of-Materials (BOM) & SKU Economics
-- =============================================================================

CREATE TABLE IF NOT EXISTS sku_economics (
    tenant_id TEXT NOT NULL,
    sku TEXT NOT NULL,
    title TEXT NOT NULL,
    hsn_code TEXT NOT NULL DEFAULT '8708',
    gst_slab_bps INTEGER NOT NULL DEFAULT 1800 CHECK (gst_slab_bps >= 0),
    unit_price_minor BIGINT NOT NULL CHECK (unit_price_minor >= 0),
    cogs_minor BIGINT CHECK (cogs_minor >= 0),
    min_margin_bps INTEGER CHECK (min_margin_bps IS NULL OR (min_margin_bps >= 0 AND min_margin_bps <= 10000)),
    currency_code TEXT NOT NULL DEFAULT 'INR',
    PRIMARY KEY (tenant_id, sku)
);

CREATE TABLE IF NOT EXISTS bom_bundles (
    bundle_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    parent_sku TEXT NOT NULL,
    name TEXT NOT NULL,
    stock_mode TEXT NOT NULL DEFAULT 'VIRTUAL'
        CHECK (stock_mode IN ('VIRTUAL', 'HYBRID', 'PHYSICAL')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, parent_sku)
);

CREATE TABLE IF NOT EXISTS bom_components (
    component_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bundle_id BIGINT NOT NULL REFERENCES bom_bundles(bundle_id) ON DELETE CASCADE,
    child_sku TEXT NOT NULL,
    qty_per_unit INTEGER NOT NULL CHECK (qty_per_unit > 0),
    is_optional BOOLEAN NOT NULL DEFAULT FALSE,
    price_delta_minor BIGINT NOT NULL DEFAULT 0,
    option_group TEXT NOT NULL DEFAULT 'core'
);

CREATE INDEX IF NOT EXISTS idx_bom_components_bundle_id
    ON bom_components (bundle_id);

CREATE INDEX IF NOT EXISTS idx_bom_components_child_sku
    ON bom_components (child_sku);

-- =============================================================================
-- 4. B2B Wholesale & Credit Ledger
-- =============================================================================

CREATE TABLE IF NOT EXISTS b2b_accounts (
    account_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    company_name TEXT NOT NULL,
    tax_id TEXT NOT NULL,
    tax_id_type TEXT NOT NULL CHECK (tax_id_type IN ('GSTIN', 'EIN', 'VAT')),
    credit_limit_minor BIGINT NOT NULL CHECK (credit_limit_minor >= 0),
    credit_used_minor BIGINT NOT NULL DEFAULT 0 CHECK (credit_used_minor >= 0),
    net_terms_days INTEGER NOT NULL DEFAULT 30 CHECK (net_terms_days >= 0),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ON_HOLD', 'SUSPENDED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, tax_id)
);

CREATE INDEX IF NOT EXISTS idx_b2b_accounts_tenant_status
    ON b2b_accounts (tenant_id, status);

CREATE TABLE IF NOT EXISTS b2b_price_tiers (
    tier_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    customer_group TEXT NOT NULL,
    sku TEXT NOT NULL,
    min_qty INTEGER NOT NULL CHECK (min_qty >= 1),
    unit_price_minor BIGINT NOT NULL CHECK (unit_price_minor >= 0),
    currency_code TEXT NOT NULL DEFAULT 'INR',
    UNIQUE (tenant_id, customer_group, sku, min_qty, currency_code)
);

CREATE INDEX IF NOT EXISTS idx_b2b_price_tiers_lookup
    ON b2b_price_tiers (tenant_id, customer_group, sku, min_qty);

CREATE TABLE IF NOT EXISTS b2b_credit_ledger (
    entry_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES b2b_accounts(account_id) ON DELETE RESTRICT,
    reference_id TEXT NOT NULL,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('RESERVE', 'DEBIT', 'RELEASE', 'PAYMENT')),
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (account_id, reference_id, entry_type)
);

CREATE INDEX IF NOT EXISTS idx_b2b_credit_ledger_account_id
    ON b2b_credit_ledger (account_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS b2b_quotes (
    quote_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    account_id UUID NOT NULL REFERENCES b2b_accounts(account_id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ROLLED_BACK')),
    currency_code TEXT NOT NULL DEFAULT 'INR',
    subtotal_minor BIGINT NOT NULL DEFAULT 0 CHECK (subtotal_minor >= 0),
    tax_minor BIGINT NOT NULL DEFAULT 0 CHECK (tax_minor >= 0),
    total_minor BIGINT NOT NULL DEFAULT 0 CHECK (total_minor >= 0),
    approver_id TEXT,
    approver_role TEXT CHECK (approver_role IS NULL OR approver_role IN ('MERCHANT_ADMIN', 'B2B_COMPANY_APPROVER')),
    external_order_id TEXT,
    notes TEXT NOT NULL DEFAULT '',
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_b2b_quotes_account_id
    ON b2b_quotes (account_id);

CREATE INDEX IF NOT EXISTS idx_b2b_quotes_tenant_status
    ON b2b_quotes (tenant_id, status);

CREATE TABLE IF NOT EXISTS b2b_quote_items (
    quote_item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    quote_id UUID NOT NULL REFERENCES b2b_quotes(quote_id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    sku TEXT NOT NULL,
    qty INTEGER NOT NULL CHECK (qty > 0),
    unit_price_minor BIGINT NOT NULL CHECK (unit_price_minor >= 0),
    line_total_minor BIGINT NOT NULL CHECK (line_total_minor >= 0),
    gst_slab_bps INTEGER NOT NULL DEFAULT 1800 CHECK (gst_slab_bps >= 0),
    UNIQUE (quote_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_b2b_quote_items_quote_id
    ON b2b_quote_items (quote_id);

-- =============================================================================
-- 5. Inventory Versioning, Offline POS Sync & Discrepancy Telemetry
-- =============================================================================

CREATE TABLE IF NOT EXISTS inventory_balances (
    tenant_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    sku TEXT NOT NULL,
    on_hand INTEGER NOT NULL,
    reserved INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0),
    version BIGINT NOT NULL DEFAULT 1 CHECK (version >= 1),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, location_id, sku)
);

CREATE TABLE IF NOT EXISTS pos_sync_mutations (
    mutation_pk BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    client_mutation_id UUID NOT NULL,
    mutation_type TEXT NOT NULL CHECK (mutation_type IN ('POS_SALE', 'STOCK_AUDIT', 'RETURN')),
    expected_version BIGINT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('APPLIED', 'APPLIED_WITH_ALERT', 'DUPLICATE', 'CONFLICT')),
    payload JSONB NOT NULL,
    reconciled_deltas JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, device_id, client_mutation_id)
);

CREATE INDEX IF NOT EXISTS idx_pos_sync_mutations_lookup
    ON pos_sync_mutations (tenant_id, location_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pos_sync_mutations_payload_gin
    ON pos_sync_mutations USING gin (payload);

CREATE INDEX IF NOT EXISTS idx_pos_sync_mutations_deltas_gin
    ON pos_sync_mutations USING gin (reconciled_deltas);

CREATE TABLE IF NOT EXISTS pos_reconciliation_alerts (
    alert_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    sku TEXT NOT NULL,
    device_id TEXT NOT NULL,
    client_mutation_id UUID NOT NULL,
    expected_version BIGINT NOT NULL,
    actual_version BIGINT NOT NULL,
    balance_after INTEGER NOT NULL,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pos_reconciliation_alerts_open
    ON pos_reconciliation_alerts (tenant_id, resolved, created_at DESC);

CREATE TABLE IF NOT EXISTS inventory_ledger_events (
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    tenant_id TEXT NOT NULL,
    sku TEXT NOT NULL,
    location_id TEXT NOT NULL,
    delta INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('ONLINE', 'POS', 'B2B', 'BOM_COMPONENT', 'ADJUSTMENT', 'ACP')),
    reference_id TEXT NOT NULL
);

SELECT create_hypertable('inventory_ledger_events', 'occurred_at', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_inventory_ledger_events_tenant_sku_time
    ON inventory_ledger_events (tenant_id, sku, occurred_at DESC);

-- =============================================================================
-- 6. Agentic Commerce (KYA, ACP, Semantic Search, RTO Shield)
-- =============================================================================

CREATE TABLE IF NOT EXISTS kya_agents (
    agent_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    hmac_secret_hash TEXT NOT NULL,
    allowed_protocols TEXT[] NOT NULL DEFAULT ARRAY['UCP', 'ACP', 'WEBMCP'],
    max_discount_bps INTEGER NOT NULL DEFAULT 500 CHECK (max_discount_bps >= 0 AND max_discount_bps <= 10000),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kya_agents_tenant_status
    ON kya_agents (tenant_id, status);

CREATE TABLE IF NOT EXISTS acp_checkout_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    currency TEXT NOT NULL,
    line_items JSONB NOT NULL,
    subtotal_minor BIGINT NOT NULL CHECK (subtotal_minor >= 0),
    discount_minor BIGINT NOT NULL CHECK (discount_minor >= 0),
    tax_minor BIGINT NOT NULL CHECK (tax_minor >= 0),
    total_minor BIGINT NOT NULL CHECK (total_minor >= 0),
    status TEXT NOT NULL CHECK (status IN ('OPEN', 'COMPLETED', 'EXPIRED', 'CANCELLED')),
    external_order_id TEXT,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acp_checkout_sessions_tenant_agent
    ON acp_checkout_sessions (tenant_id, agent_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_acp_checkout_sessions_idempotency
    ON acp_checkout_sessions (tenant_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_acp_checkout_sessions_line_items_gin
    ON acp_checkout_sessions USING gin (line_items);

CREATE TABLE IF NOT EXISTS catalog_embeddings (
    product_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    content_hash TEXT NOT NULL,
    embedding vector(1024) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_catalog_embeddings_hnsw
    ON catalog_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_catalog_embeddings_metadata_gin
    ON catalog_embeddings USING gin (metadata);

CREATE TABLE IF NOT EXISTS rto_assessments (
    assessment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    pincode TEXT NOT NULL,
    cart_value_minor BIGINT NOT NULL CHECK (cart_value_minor >= 0),
    risk_score NUMERIC(4,3) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
    risk_tier TEXT NOT NULL CHECK (risk_tier IN ('LOW', 'MEDIUM', 'HIGH')),
    upi_nudge_discount_inr INTEGER NOT NULL DEFAULT 0 CHECK (upi_nudge_discount_inr >= 0),
    signals JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rto_assessments_tenant_pincode
    ON rto_assessments (tenant_id, pincode, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rto_assessments_signals_gin
    ON rto_assessments USING gin (signals);

CREATE TABLE IF NOT EXISTS agent_audit_log (
    audit_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    protocol TEXT NOT NULL CHECK (protocol IN ('UCP', 'ACP', 'WEBMCP')),
    action TEXT NOT NULL,
    allowed BOOLEAN NOT NULL,
    reason TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_audit_log_tenant_agent
    ON agent_audit_log (tenant_id, agent_id, created_at DESC);
