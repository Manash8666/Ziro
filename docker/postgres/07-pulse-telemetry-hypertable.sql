-- docker/postgres/07-pulse-telemetry-hypertable.sql
-- Stage 5: @ziro/pulse TimescaleDB Hypertable for UCP, ACP, WebMCP & COD-RTO Shield Telemetry

BEGIN;

CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS pulse_agent_telemetry_events (
  id BIGSERIAL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  protocol VARCHAR(16) NOT NULL CHECK (protocol IN ('UCP', 'ACP', 'WEBMCP', 'RTO_SHIELD')),
  action VARCHAR(64) NOT NULL,
  query_text TEXT,
  cart_value_paise BIGINT NOT NULL DEFAULT 0 CHECK (cart_value_paise >= 0),
  discount_requested_bps INTEGER NOT NULL DEFAULT 0 CHECK (discount_requested_bps >= 0),
  discount_granted_bps INTEGER NOT NULL DEFAULT 0 CHECK (discount_granted_bps >= 0),
  margin_floor_protected BOOLEAN NOT NULL DEFAULT FALSE,
  rto_risk_score DOUBLE PRECISION CHECK (rto_risk_score IS NULL OR (rto_risk_score >= 0.0 AND rto_risk_score <= 1.0)),
  rto_nudged BOOLEAN NOT NULL DEFAULT FALSE,
  arbitrage_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  converted BOOLEAN NOT NULL DEFAULT FALSE,
  estimated_rto_saved_paise BIGINT NOT NULL DEFAULT 0 CHECK (estimated_rto_saved_paise >= 0),
  platform_fee_bps SMALLINT NOT NULL DEFAULT 0 CHECK (platform_fee_bps = 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (recorded_at, id)
);

-- Partition into 1-day chunks for time-series optimization
SELECT create_hypertable('pulse_agent_telemetry_events', by_range('recorded_at', INTERVAL '1 day'), if_not_exists => TRUE);

-- Create secondary indexes for multi-tenant querying
CREATE INDEX IF NOT EXISTS idx_pulse_telemetry_tenant_time 
  ON pulse_agent_telemetry_events (tenant_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_pulse_telemetry_tenant_protocol 
  ON pulse_agent_telemetry_events (tenant_id, protocol, recorded_at DESC);

-- Enable TimescaleDB columnar compression after 7 days
ALTER TABLE pulse_agent_telemetry_events SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'tenant_id, protocol'
);

SELECT add_compression_policy('pulse_agent_telemetry_events', INTERVAL '7 days', if_not_exists => TRUE);

-- Retention policy: 180 days
SELECT add_retention_policy('pulse_agent_telemetry_events', INTERVAL '180 days', if_not_exists => TRUE);

-- Row-Level Security bound to app.current_tenant_id
ALTER TABLE pulse_agent_telemetry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_agent_telemetry_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON pulse_agent_telemetry_events;
CREATE POLICY tenant_isolation_policy ON pulse_agent_telemetry_events
  USING (tenant_id = current_setting('app.current_tenant_id', true)::text)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::text);

COMMIT;
