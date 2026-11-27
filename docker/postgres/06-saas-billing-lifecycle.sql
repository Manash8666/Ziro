-- docker/postgres/06-saas-billing-lifecycle.sql
-- Stage 5: Automated SaaS Subscription Billing, Tenant Registry, Dunning Lifecycle & Webhook Deduplication

BEGIN;

-- 0. Ensure base ziro_tenant_registry exists before applying billing & lifecycle extensions
CREATE TABLE IF NOT EXISTS ziro_tenant_registry (
  tenant_id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  custom_domain TEXT UNIQUE,
  plan_tier VARCHAR(32) NOT NULL DEFAULT 'starter'
    CHECK (plan_tier IN ('starter', 'growth', 'scale', 'enterprise')),
  is_demo_sandbox BOOLEAN NOT NULL DEFAULT FALSE,
  read_only_catalog BOOLEAN NOT NULL DEFAULT FALSE,
  platform_fee_bps SMALLINT NOT NULL DEFAULT 0 CHECK (platform_fee_bps = 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed interactive demo sandbox registry records if missing
INSERT INTO ziro_tenant_registry (
  tenant_id,
  slug,
  display_name,
  custom_domain,
  plan_tier,
  is_demo_sandbox,
  read_only_catalog,
  platform_fee_bps
)
VALUES
  ('tenant_demo_motors', 'demo-motors', 'Apex MotoWorks Demo', 'demo.ziro.build', 'scale', TRUE, TRUE, 0),
  ('tenant_demo_nutrition', 'demo-nutrition', 'Prana Clean Nutrition Demo', 'nutrition-demo.ziro.build', 'growth', TRUE, TRUE, 0)
ON CONFLICT (tenant_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  custom_domain = EXCLUDED.custom_domain,
  is_demo_sandbox = TRUE,
  read_only_catalog = TRUE,
  platform_fee_bps = 0,
  updated_at = NOW();

-- 1. Extend ziro_tenant_registry with SaaS Subscription & Dunning State
ALTER TABLE ziro_tenant_registry
  ADD COLUMN IF NOT EXISTS billing_status VARCHAR(32) NOT NULL DEFAULT 'trialing'
    CHECK (billing_status IN ('trialing', 'active', 'past_due', 'canceled', 'suspended')),
  ADD COLUMN IF NOT EXISTS billing_provider VARCHAR(24)
    CHECK (billing_provider IS NULL OR billing_provider IN ('razorpay', 'stripe', 'manual_enterprise')),
  ADD COLUMN IF NOT EXISTS external_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS external_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ziro_tenant_external_sub_id
  ON ziro_tenant_registry (billing_provider, external_subscription_id)
  WHERE external_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ziro_tenant_billing_status
  ON ziro_tenant_registry (billing_status, grace_period_ends_at);

-- 2. Idempotent Webhook Event Ledger (At-Most-Once Processing + 0% GMV Fee Audit)
CREATE TABLE IF NOT EXISTS ziro_billing_webhook_events (
  provider VARCHAR(24) NOT NULL CHECK (provider IN ('razorpay', 'stripe')),
  event_id VARCHAR(128) NOT NULL,
  event_type VARCHAR(96) NOT NULL,
  tenant_id TEXT NOT NULL,
  external_subscription_id TEXT,
  plan_tier VARCHAR(32) CHECK (plan_tier IS NULL OR plan_tier IN ('starter', 'growth', 'scale', 'enterprise')),
  resulting_status VARCHAR(32) NOT NULL CHECK (resulting_status IN ('trialing', 'active', 'past_due', 'canceled', 'suspended')),
  payload_sha256 CHAR(64) NOT NULL,
  platform_fee_bps SMALLINT NOT NULL DEFAULT 0 CHECK (platform_fee_bps = 0),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_ziro_billing_events_tenant
  ON ziro_billing_webhook_events (tenant_id, processed_at DESC);

COMMIT;
