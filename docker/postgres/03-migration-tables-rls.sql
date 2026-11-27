-- docker/postgres/03-migration-tables-rls.sql
-- Migration engine tables for tax profiles, vehicle fitments, and catalog migration audit logs.
-- Full Row-Level Security enabled and forced.

CREATE TABLE IF NOT EXISTS ziro_product_tax_profile (
  tenant_id text NOT NULL,
  handle text NOT NULL,
  hsn_code text NOT NULL,
  gst_slab integer NOT NULL CHECK (gst_slab IN (0, 5, 12, 18, 28)),
  platform_fee_bps integer NOT NULL DEFAULT 0 CHECK (platform_fee_bps = 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, handle)
);

CREATE TABLE IF NOT EXISTS ziro_vehicle_fitment (
  tenant_id text NOT NULL,
  handle text NOT NULL,
  make text NOT NULL,
  model text NOT NULL,
  year_start integer NOT NULL,
  year_end integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, handle, make, model, year_start, year_end)
);

CREATE TABLE IF NOT EXISTS ziro_migration_log (
  tenant_id text NOT NULL,
  idempotency_key text NOT NULL,
  source text NOT NULL,
  handle text NOT NULL,
  payload jsonb NOT NULL,
  migrated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, idempotency_key)
);

-- Enforce PostgreSQL 17 Row-Level Security
DO $$
DECLARE
  migration_tables text[] := ARRAY[
    'ziro_product_tax_profile',
    'ziro_vehicle_fitment',
    'ziro_migration_log'
  ];
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY migration_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation_policy ON %I
       USING (tenant_id = current_setting(''app.current_tenant_id'', true)::text)
       WITH CHECK (tenant_id = current_setting(''app.current_tenant_id'', true)::text);',
      tbl
    );
  END LOOP;
END $$;
