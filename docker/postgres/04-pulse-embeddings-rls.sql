-- docker/postgres/04-pulse-embeddings-rls.sql
-- Stage 4: @ziro/pulse 1024-dim BAAI/bge-m3 Product Embeddings & Tenant RLS

BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS pulse_product_embeddings (
  tenant_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  handle TEXT NOT NULL,
  title TEXT NOT NULL,
  semantic_text TEXT NOT NULL,
  content_sha256 CHAR(64) NOT NULL,
  embedding VECTOR(1024) NOT NULL,
  embedding_model VARCHAR(64) NOT NULL DEFAULT 'BAAI/bge-m3',
  hsn_code VARCHAR(8) NOT NULL CHECK (hsn_code ~ '^[0-9]{4,8}$'),
  gst_slab_percent SMALLINT NOT NULL CHECK (gst_slab_percent IN (0, 5, 12, 18, 28)),
  min_price_paise BIGINT NOT NULL DEFAULT 0 CHECK (min_price_paise >= 0),
  total_stock INTEGER NOT NULL DEFAULT 0 CHECK (total_stock >= 0),
  fitment_matrix JSONB NOT NULL DEFAULT '[]'::jsonb,
  platform_fee_bps SMALLINT NOT NULL DEFAULT 0 CHECK (platform_fee_bps = 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, product_id)
);

-- HNSW index for low-latency approximate nearest-neighbor search across 1024-dim vectors
CREATE INDEX IF NOT EXISTS idx_pulse_product_embeddings_hnsw_l2
  ON pulse_product_embeddings
  USING hnsw (embedding vector_l2_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_pulse_product_embeddings_tenant_hsn
  ON pulse_product_embeddings (tenant_id, hsn_code);

-- Enforce strict tenant isolation even for table-owner roles
ALTER TABLE pulse_product_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_product_embeddings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON pulse_product_embeddings;
CREATE POLICY tenant_isolation_policy ON pulse_product_embeddings
  USING (tenant_id = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::text);

COMMIT;
