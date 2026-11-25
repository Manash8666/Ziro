import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('root package.json and turbo.json align pnpm@12.15.0, engines, and pipeline tasks', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.equal(pkg.packageManager, 'pnpm@12.15.0');
  assert.equal(pkg.engines?.node, '>=22.22.0');
  for (const script of ['build', 'dev', 'lint', 'typecheck', 'test']) {
    assert.ok(pkg.scripts?.[script], `Missing root script: ${script}`);
  }

  const turbo = JSON.parse(fs.readFileSync('turbo.json', 'utf8'));
  for (const task of ['build', 'dev', 'lint', 'typecheck', 'test']) {
    assert.ok(turbo.tasks?.[task], `Missing turbo task: ${task}`);
  }
  assert.ok(turbo.tasks.build.outputs.includes('!.next/cache/**'));
});

test('001_ziro_extensions.sql defines all Ziro tables, hypertable, and HNSW index', () => {
  const sql = fs.readFileSync('docker/postgres/001_ziro_extensions.sql', 'utf8');
  const required = [
    'CREATE TABLE IF NOT EXISTS tenants',
    'CREATE TABLE IF NOT EXISTS tenant_gateway_configs',
    'CREATE TABLE IF NOT EXISTS webhook_events',
    'CREATE TABLE IF NOT EXISTS fitment_vehicles',
    'CREATE TABLE IF NOT EXISTS product_fitments',
    'CREATE TABLE IF NOT EXISTS sku_economics',
    'CREATE TABLE IF NOT EXISTS bom_bundles',
    'CREATE TABLE IF NOT EXISTS bom_components',
    'CREATE TABLE IF NOT EXISTS b2b_accounts',
    'CREATE TABLE IF NOT EXISTS b2b_price_tiers',
    'CREATE TABLE IF NOT EXISTS b2b_credit_ledger',
    'CREATE TABLE IF NOT EXISTS b2b_quotes',
    'CREATE TABLE IF NOT EXISTS b2b_quote_items',
    'CREATE TABLE IF NOT EXISTS inventory_balances',
    'CREATE TABLE IF NOT EXISTS pos_sync_mutations',
    'CREATE TABLE IF NOT EXISTS pos_reconciliation_alerts',
    'CREATE TABLE IF NOT EXISTS inventory_ledger_events',
    'CREATE TABLE IF NOT EXISTS kya_agents',
    'CREATE TABLE IF NOT EXISTS acp_checkout_sessions',
    'CREATE TABLE IF NOT EXISTS catalog_embeddings',
    'CREATE TABLE IF NOT EXISTS rto_assessments',
    'CREATE TABLE IF NOT EXISTS agent_audit_log',
    "create_hypertable('inventory_ledger_events'",
    'USING hnsw (embedding vector_cosine_ops)',
  ];
  for (const snippet of required) {
    assert.ok(sql.includes(snippet), `Missing SQL snippet: ${snippet}`);
  }
});

test('docker-compose, Dockerfiles, CI, and .env.example define full stack and ZIRO_PLATFORM_FEE_BPS=0', () => {
  const compose = fs.readFileSync('docker/docker-compose.yml', 'utf8');
  for (const svc of ['postgres:', 'valkey:', 'meilisearch:', 'pulse-ai:', 'commerce-engine:', 'storefront:', 'pos-terminal:']) {
    assert.ok(compose.includes(svc), `Missing service ${svc}`);
  }
  assert.ok(compose.includes('healthcheck:'), 'Missing Docker Compose healthchecks');

  for (const dockerfile of ['docker/Dockerfile.engine', 'docker/Dockerfile.pulse', 'docker/Dockerfile.web']) {
    assert.ok(fs.existsSync(dockerfile), `Missing ${dockerfile}`);
  }

  const ci = fs.readFileSync('.github/workflows/ci.yml', 'utf8');
  for (const cmd of ['pnpm typecheck', 'pnpm build', 'pnpm test', 'pytest apps/pulse-ai/tests']) {
    assert.ok(ci.includes(cmd), `Missing CI step: ${cmd}`);
  }

  const envEx = fs.readFileSync('.env.example', 'utf8');
  for (const key of [
    'ZIRO_PLATFORM_FEE_BPS=0',
    'TENANCY_MODE=single',
    'KYA_SIGNING_SECRET=',
    'PAYLOAD_SECRET=',
    'ZIRO_INTERNAL_SECRET=',
    'RTO_HIGH_RISK_THRESHOLD=0.72',
    'EMBEDDING_MODEL=BAAI/bge-m3',
  ]) {
    assert.ok(envEx.includes(key), `Missing .env.example key: ${key}`);
  }
});
