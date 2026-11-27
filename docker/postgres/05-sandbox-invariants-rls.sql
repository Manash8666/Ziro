-- docker/postgres/05-sandbox-invariants-rls.sql
-- Stage 4: Public Sandbox Tenants, Read-Only Protection & Invariants

BEGIN;

CREATE TABLE IF NOT EXISTS ziro_sandbox_tenants (
  tenant_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  vertical VARCHAR(64) NOT NULL,
  is_read_only BOOLEAN NOT NULL DEFAULT TRUE,
  platform_fee_bps SMALLINT NOT NULL DEFAULT 0 CHECK (platform_fee_bps = 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default public sandbox tenants
INSERT INTO ziro_sandbox_tenants (tenant_id, name, subdomain, vertical, is_read_only, platform_fee_bps)
VALUES
  ('sandbox-auto-parts', 'Apex Automotive Performance', 'auto.sandbox', 'automotive', TRUE, 0),
  ('sandbox-industrial-hydraulics', 'Kavach Heavy Hydraulics', 'hydraulics.sandbox', 'b2b-industrial', TRUE, 0),
  ('sandbox-d2c-apparel', 'Vayu Activewear', 'vayu.sandbox', 'fashion', TRUE, 0)
ON CONFLICT (tenant_id) DO UPDATE SET
  name = EXCLUDED.name,
  subdomain = EXCLUDED.subdomain,
  vertical = EXCLUDED.vertical,
  is_read_only = TRUE,
  platform_fee_bps = 0;

-- Trigger function to prevent writes against read-only sandbox tenants
CREATE OR REPLACE FUNCTION check_sandbox_write_protection()
RETURNS TRIGGER AS $$
DECLARE
  current_tid TEXT;
  is_sandbox BOOLEAN;
  maintenance_mode TEXT;
BEGIN
  current_tid := current_setting('app.current_tenant_id', true);
  maintenance_mode := current_setting('app.sandbox_maintenance', true);

  -- Allow writes during administrative seed or reset operations
  IF maintenance_mode = 'true' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF current_tid IS NOT NULL THEN
    SELECT is_read_only INTO is_sandbox
    FROM ziro_sandbox_tenants
    WHERE tenant_id = current_tid;

    IF is_sandbox IS TRUE THEN
      RAISE EXCEPTION 'SANDBOX_READ_ONLY_VIOLATION: Tenant % is a public sandbox demo tenant and cannot be modified.', current_tid
        USING ERRCODE = 'ZRO01';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Enforce read-only trigger on order placement in sandbox mode
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order') THEN
    DROP TRIGGER IF EXISTS trg_sandbox_order_guard ON "order";
    CREATE TRIGGER trg_sandbox_order_guard
      BEFORE INSERT OR UPDATE OR DELETE ON "order"
      FOR EACH ROW EXECUTE FUNCTION check_sandbox_write_protection();
  END IF;
END $$;

COMMIT;
