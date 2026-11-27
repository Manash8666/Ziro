-- docker/postgres/02-tenant-rls.sql
-- Enforces strict PostgreSQL 17 Row-Level Security (RLS) across relational commerce tables and pgvector embeddings.
-- Invariant: current_setting('app.current_tenant_id', true) must match tenant_id.

DO $$
DECLARE
  target_tables text[] := ARRAY[
    'product',
    'product_variant',
    'inventory_level',
    'order',
    'customer',
    'b2b_credit_ledger',
    'pos_sync_log',
    'pulse_product_embeddings'
  ];
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY target_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', tbl);
      EXECUTE format(
        'CREATE POLICY tenant_isolation_policy ON %I
         USING (tenant_id = current_setting(''app.current_tenant_id'', true)::text)
         WITH CHECK (tenant_id = current_setting(''app.current_tenant_id'', true)::text);',
        tbl
      );
    END IF;
  END LOOP;
END $$;
