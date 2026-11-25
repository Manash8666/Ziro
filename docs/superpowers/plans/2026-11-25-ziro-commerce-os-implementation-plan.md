# Ziro Commerce OS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and locally verify all 7 workspaces of `ziro-commerce-os` (`@ziro/shared-types`, `@ziro/ui-kit` + `@ziro/3d`, `@ziro/rails`, `@ziro/pulse`, `@ziro/core`, `@ziro/pos`, `@ziro/storefront`), complete Docker/Postgres 17/CI infrastructure, and run full TypeScript, Next.js, and FastAPI test/build verification.

**Architecture:** `pnpm` + `Turborepo` TypeScript monorepo sharing `@ziro/shared-types` Zod contracts and `@ziro/ui-kit` Dark Precision components across Medusa v2 (`@ziro/core`), Next.js 16 Storefront + embedded Payload CMS v3 (`@ziro/storefront`), offline-first Serwist/Dexie POS (`@ziro/pos`), and dual-hemisphere rails (`@ziro/rails`), paired with a FastAPI AI/agentic service (`@ziro/pulse`) delegating authoritative pricing/order execution back to `@ziro/core`. All database, cache, and search clients sit behind clean repository/adapter interfaces with isolated in-memory doubles so every package builds and passes tests cleanly even when Docker/Postgres/Valkey/Meilisearch are absent locally.

**Tech Stack:** Node.js `v25.9.0`, `pnpm@12.15.0`, TypeScript `5.7+`, `zod@^4.6.7`, `@medusajs/*@2.23.0`, `next@16.4.6`, `react@19.3.1`, `@payloadcms/*@3.94.2`, `tailwindcss@4.3.5`, `zustand@5.1.0`, `gsap@3.15.1`, `lenis@1.3.28`, `three@0.187.0`, `@react-three/fiber@9.8.2`, `@serwist/next@9.6.0`, `dexie@4.4.7`, `razorpay@2.9.8`, `stripe@23.2.0`, `meilisearch@0.63.0`, `vitest@5.1.1`, Python `3.14` (`fastapi`, `pydantic`, `asyncpg`, `pgvector`, `httpx`, `python-jose`, `numpy`, `pytest`, `pytest-asyncio`).

**Spec:** `docs/superpowers/specs/2026-11-25-ziro-commerce-os-design.md`

## Global Constraints

- **Permissive licenses only:** `MIT`, `Apache 2.0`, `BSD-3-Clause`, `ISC`, `PostgreSQL` only; zero `GPL` or `AGPL` packages.
- **Zero GMV tax:** `ZIRO_PLATFORM_FEE_BPS = 0` enforced across payment providers, ACP manifests, and config defaults.
- **Integer minor units only:** All TypeScript currency values use integer minor units (`paise` / `cents`, `Number.isSafeInteger`); PostgreSQL money/ledger columns use `BIGINT` minor units or `NUMERIC`.
- **No `TODO` stubs in critical paths:** Payment HMAC checks, GSTIN checksums, remainder-safe GST splits, DDP duty math, KYA HMAC/JWT + margin guardrails, RTO scoring, BOM cycle detection, B2B credit rollback workflows, and POS delta-sync deduplication must be complete and tested.
- **Strict TypeScript & Visual Design System:** `strict: true` everywhere; UI uses `#090B0E` Deep Obsidian, `#12161E` Slate Graphite, `1px solid #1F2633`, `#00E599` Electric Mint, `#F59E0B` Warm Amber, `#F4F6F9` Crisp Alabaster, `Plus Jakarta Sans`, and `JetBrains Mono` (`tabular-nums`).
- **Dual-mode & local testability:** Support `TENANCY_MODE=single | multi` and `pos_conflict_policy=FORCE_SALE_WITH_ALERT | STRICT_REJECT`; every app runs `vitest` / `pytest` without live external network or Docker DB daemons.

## Review Focus

1. **Corrupted or invalid Mod-36 GSTIN / odd-paise CGST+SGST remainder split:** `validateGstin` must reject bad checksums (`15th` character mismatch) and `calculateGstBreakup` must ensure `cgstMinor + sgstMinor === totalTaxMinor` without losing 1 paisa on odd totals (pinned in Task 3).
2. **Webhook raw-body signature tampering & duplicate delivery:** Payment webhook handlers must reject tampered bodies or wrong HMACs with `401` and treat repeated `external_event_id` deliveries idempotently without double-processing (pinned in Task 6).
3. **Cyclic BOM graph & rollback compensation on B2B Net-30 failure:** `FitmentBomService` must reject `A -> B -> A` cycles instead of recursing infinitely, and `approveB2bQuoteWorkflow` must release reserved credit and restore allocated stock if order emission fails (pinned in Task 7).
4. **KYA replay window expiry & gross margin floor breach:** `kya.py` must reject timestamps older than `300s` (`401`) and `acp_service.py` must return `403` when an agent discount pushes gross margin `(net_price - cogs_minor) / net_price` below `min_margin_bps` (pinned in Task 10).
5. **POS offline duplicate mutation ID & stale version conflict modes:** `POST /store/pos/sync` must return `DUPLICATE` without re-deducting inventory on retried `(tenant_id, device_id, client_mutation_id)`, apply stale `POS_SALE` with `APPLIED_WITH_ALERT` under `FORCE_SALE_WITH_ALERT`, and reject stale mutations as `CONFLICT` under `STRICT_REJECT` (pinned in Task 11).

---

### Task 1: Root Workspace, Docker Compose, PostgreSQL Schema Extensions & CI

**Files:**
- Modify: `package.json`, `turbo.json`, `.env.example`, `.env`, `docker/docker-compose.yml`
- Create: `docker/Dockerfile.engine`, `docker/Dockerfile.pulse`, `docker/Dockerfile.web`, `docker/postgres/001_ziro_extensions.sql`, `.github/workflows/ci.yml`
- Test: `scripts/verify-infra.mjs` (or root `vitest` check run via node) — let's use `tests/infra.test.mjs` run with `node --test tests/infra.test.mjs` so Task 1 verifies immediately before workspace `pnpm install` completes!

**Interfaces:**
- Produces: Root scripts (`build`, `dev`, `lint`, `typecheck`, `test`), `packageManager: "pnpm@12.15.0"`, complete `docker/postgres/001_ziro_extensions.sql` DDL for all 19 Ziro extension tables, `docker/docker-compose.yml` services (`postgres`, `valkey`, `meilisearch`, `pulse-ai`, `commerce-engine`, `storefront`, `pos-terminal`), `.env.example` keys, `.github/workflows/ci.yml`.

- [ ] **Step 1: Write the failing infrastructure verification test**

Create `tests/infra.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('root package.json aligns pnpm@12.15.0 and engine constraints', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.equal(pkg.packageManager, 'pnpm@12.15.0');
  assert.equal(pkg.engines?.node, '>=22.22.0');
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
    'USING hnsw (embedding vector_cosine_ops)'
  ];
  for (const snippet of required) {
    assert.ok(sql.includes(snippet), `Missing SQL snippet: ${snippet}`);
  }
});

test('docker-compose and .env.example define full stack and ZIRO_PLATFORM_FEE_BPS=0', () => {
  const compose = fs.readFileSync('docker/docker-compose.yml', 'utf8');
  for (const svc of ['postgres:', 'valkey:', 'meilisearch:', 'pulse-ai:', 'commerce-engine:', 'storefront:', 'pos-terminal:']) {
    assert.ok(compose.includes(svc), `Missing service ${svc}`);
  }
  const envEx = fs.readFileSync('.env.example', 'utf8');
  assert.ok(envEx.includes('ZIRO_PLATFORM_FEE_BPS=0'));
  assert.ok(envEx.includes('TENANCY_MODE=single'));
  assert.ok(envEx.includes('KYA_SIGNING_SECRET='));
  assert.ok(envEx.includes('PAYLOAD_SECRET='));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/infra.test.mjs`
Expected: FAIL (`packageManager` is `pnpm@9.14.4`, `001_ziro_extensions.sql` missing, compose services missing).

- [ ] **Step 3: Update root config, Docker stack, Postgres schema migration `001_ziro_extensions.sql`, `.env.example`/`.env`, and `.github/workflows/ci.yml`**

Update:
- `package.json`: set `"packageManager": "pnpm@12.15.0"`, `"engines": { "node": ">=22.22.0" }`, keep `turbo` + `typescript` + `rimraf` + `@types/node`.
- `turbo.json`: configure `build` (`dependsOn: ["^build"]`, outputs `[".next/**", "!.next/cache/**", "dist/**", ".medusa/**"]`), `dev`, `lint`, `typecheck`, `test`.
- `.env.example` and `.env`: include all core DB, Valkey, Meilisearch, `ZIRO_PLATFORM_FEE_BPS=0`, `TENANCY_MODE=single`, `JWT_SECRET`, `COOKIE_SECRET`, `PAYLOAD_SECRET`, `KYA_SIGNING_SECRET`, `ZIRO_INTERNAL_SECRET`, `RAZORPAY_*`, `STRIPE_*`, `ONDC_*`, `PULSE_AI_URL`, `EMBEDDING_PROVIDER`, `EMBEDDING_MODEL=BAAI/bge-m3`, `RTO_HIGH_RISK_THRESHOLD=0.72`, `NEXT_PUBLIC_*`.
- `docker/postgres/001_ziro_extensions.sql`: write the exact DDL from Spec Section 4 with FK indexes, `CHECK` constraints, `GIN` indexes, `TimescaleDB` hypertable on `inventory_ledger_events`, and `vector(1024)` HNSW cosine index on `catalog_embeddings`.
- `docker/docker-compose.yml`, `docker/Dockerfile.engine`, `docker/Dockerfile.pulse`, `docker/Dockerfile.web`: multi-stage container builds (`node:22-alpine` / `python:3.12-slim`) and compose healthchecks for all 7 services (`postgres`, `valkey`, `meilisearch`, `pulse-ai`, `commerce-engine`, `storefront`, `pos-terminal`).
- `.github/workflows/ci.yml`: Node 22 + pnpm + Python 3.12 workflow running `pnpm typecheck`, `pnpm build`, `pnpm test`, and `pytest apps/pulse-ai/tests`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/infra.test.mjs`
Expected: PASS (3/3 passing).

- [ ] **Step 5: Commit**

```bash
git add package.json turbo.json .env.example docker/ .github/ tests/infra.test.mjs
git commit -m "chore: configure monorepo root, docker stack, postgres extensions, and CI"
```

---

### Task 2: `@ziro/shared-types` — Core Commerce, Fitment, BOM, B2B & POS Sync Schemas

**Files:**
- Create: `packages/shared-types/package.json`, `packages/shared-types/tsconfig.json`, `packages/shared-types/vitest.config.ts`, `packages/shared-types/src/schemas/commerce.ts`, `packages/shared-types/src/schemas/index.ts`
- Test: `packages/shared-types/src/__tests__/commerce.test.ts`

**Interfaces:**
- Consumes: `zod@^4.6.7`, `tsconfig.base.json`
- Produces (`@ziro/shared-types/schemas`):
  - `MoneyMinorSchema` (integer >= 0), `SignedMoneyMinorSchema` (safe integer), `TenancyModeSchema` (`"single" | "multi"`), `PosConflictPolicySchema` (`"FORCE_SALE_WITH_ALERT" | "STRICT_REJECT"`)
  - `TenantContextSchema`, `FitmentVehicleSchema`, `ProductFitmentSchema`
  - `BomStockModeSchema`, `BomComponentSchema`, `BomResolveItemInputSchema`, `BomResolveRequestSchema`, `BomResolveItemOutputSchema`, `BomResolveResponseSchema`
  - `B2bAccountSchema`, `B2bQuoteCreateSchema`, `B2bQuoteApproveSchema`
  - `PosMutationTypeSchema` (`"POS_SALE" | "STOCK_AUDIT" | "RETURN"`), `PosAuditModeSchema` (`"ABSOLUTE" | "DELTA"`), `PosLineItemSchema`, `PosMutationSchema`, `PosSyncBatchRequestSchema`, `PosSyncMutationResultSchema`, `PosSyncBatchResponseSchema`

- [ ] **Step 1: Write the failing schema tests**

Create `packages/shared-types/src/__tests__/commerce.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import {
  MoneyMinorSchema,
  BomResolveRequestSchema,
  PosSyncBatchRequestSchema,
  B2bQuoteApproveSchema,
} from '../schemas/commerce.js';

describe('commerce shared Zod schemas', () => {
  it('rejects non-integer fractional float currency values', () => {
    expect(MoneyMinorSchema.safeParse(1999).success).toBe(true);
    expect(MoneyMinorSchema.safeParse(19.99).success).toBe(false);
    expect(MoneyMinorSchema.safeParse(-1).success).toBe(false);
  });

  it('validates BOM resolve request with optional 3D selections', () => {
    const parsed = BomResolveRequestSchema.parse({
      items: [{ sku: 'KIT-BRAKE-01', qty: 2, selected_optional_skus: ['PAD-CERAMIC'], material_variant: 'anodized-black' }],
    });
    expect(parsed.items[0].selected_optional_skus).toEqual(['PAD-CERAMIC']);
  });

  it('validates POS delta-sync batch with location_id and STOCK_AUDIT audit_mode', () => {
    const parsed = PosSyncBatchRequestSchema.parse({
      location_id: 'loc_blr_01',
      device_id: 'pos_tab_01',
      mutations: [
        {
          client_mutation_id: '550e8400-e29b-41d4-a716-446655440000',
          mutation_type: 'STOCK_AUDIT',
          audit_mode: 'ABSOLUTE',
          timestamp: '2026-11-25T10:00:00Z',
          expected_version: 3,
          line_items: [{ sku: 'OIL-5W30', qty: 12, unit_price_minor: 85000 }],
          payment_method: 'CASH',
        },
      ],
    });
    expect(parsed.mutations[0].audit_mode).toBe('ABSOLUTE');
  });

  it('validates B2B quote approver role', () => {
    expect(
      B2bQuoteApproveSchema.safeParse({ approver_id: 'usr_1', approver_role: 'MERCHANT_ADMIN' }).success,
    ).toBe(true);
    expect(
      B2bQuoteApproveSchema.safeParse({ approver_id: 'usr_1', approver_role: 'GUEST' }).success,
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ziro/shared-types test`
Expected: FAIL (package/files do not exist yet).

- [ ] **Step 3: Scaffold `packages/shared-types` config and implement `src/schemas/commerce.ts` + `index.ts`**

Create `packages/shared-types/package.json` (name `@ziro/shared-types`, ESM `type: "module"`, exports `.`, `./schemas`, `./gst`, `./agent`, deps `zod@^4.6.7`, devDeps `vitest@^5.1.1`, `typescript@^5.7.2`), `tsconfig.json` extending `../../tsconfig.base.json`, `vitest.config.ts`, and `src/schemas/commerce.ts` implementing all schemas listed in **Interfaces**.

- [ ] **Step 4: Install workspace deps and verify tests fail/pass in order**

Run: `pnpm install && pnpm --filter @ziro/shared-types test`
Expected: PASS (4/4 in `commerce.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add packages/shared-types/package.json packages/shared-types/tsconfig.json packages/shared-types/vitest.config.ts packages/shared-types/src/schemas/ packages/shared-types/src/__tests__/commerce.test.ts pnpm-lock.yaml
git commit -m "feat(shared-types): add core commerce, BOM, B2B, and POS sync Zod schemas"
```

---

### Task 3: `@ziro/shared-types` — Indian GST, Mod-36 GSTIN, HSN, e-Way Bill & Global DDP Calculators

**Files:**
- Create: `packages/shared-types/src/gst/calculator.ts`, `packages/shared-types/src/gst/index.ts`
- Test: `packages/shared-types/src/__tests__/gst.test.ts`

**Interfaces:**
- Consumes: `packages/shared-types/src/schemas/commerce.ts`
- Produces:
  - `INDIAN_STATE_CODES: Record<string, string>` (38 Indian states/UTs `01`–`38` + `97` Other Territory)
  - `validateGstin(gstin: string): { valid: boolean; stateCode?: string; error?: string }` (15-char format + Mod-36 weighted check-digit)
  - `HSN_SLAB_BPS_REGISTRY: Record<string, number>` + `resolveGstRateBps(hsnCode: string, overrideBps?: number): number`
  - `calculateGstBreakup(input: GstBreakupInput): GstBreakupResult` (intra-state `cgstMinor + sgstMinor === totalTaxMinor` exact remainder split; inter-state `igstMinor === totalTaxMinor`)
  - `buildEwayBillPayload(input: EwayBillInput): EwayBillPayload | null` (mandatory when `isInterState && consignmentValueMinor >= 5_000_000` paise / ₹50,000)
  - `DEFAULT_DDP_CORRIDORS` + `calculateDdpLandedCost(input: DdpInput, provider?: DutyTariffProvider): DdpResult` (`IN`, `US`, `GB`, `EU`, `AE`, `SG`, `AU`, `CA` corridors with de minimis threshold & HS chapter tariff)

- [ ] **Step 1: Write the failing GST/e-Way/DDP tests (covering Review Focus #1)**

Create `packages/shared-types/src/__tests__/gst.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import {
  validateGstin,
  calculateGstBreakup,
  buildEwayBillPayload,
  calculateDdpLandedCost,
} from '../gst/calculator.js';

describe('Indian GST, GSTIN, e-Way & Global DDP', () => {
  it('validates authentic Mod-36 GSTIN and rejects corrupted check digit', () => {
    // 29ABCDE1234F1Z + computed Mod-36 check digit
    const valid = validateGstin('29ABCDE1234F1ZW');
    expect(valid.valid).toBe(true);
    expect(valid.stateCode).toBe('29');
    expect(validateGstin('29ABCDE1234F1ZX').valid).toBe(false);
    expect(validateGstin('99ABCDE1234F1ZW').valid).toBe(false);
  });

  it('splits intra-state GST into CGST+SGST conserving exact integer paise on odd amounts', () => {
    const intra = calculateGstBreakup({
      taxableMinor: 10005, // ₹100.05 -> 5% = 500.25 -> 500 paise -> 250 + 250; try 18% on 101 = 18.18; try 5% on 1020 -> 51 paise!
      hsnCode: '2106',
      gstRateBps: 500,
      originStateCode: '27',
      destinationStateCode: '27',
    });
    expect(intra.isInterState).toBe(false);
    expect(intra.igstMinor).toBe(0);
    expect(intra.cgstMinor + intra.sgstMinor).toBe(intra.totalTaxMinor);
  });

  it('computes odd-paise totalTaxMinor (51 paise -> 26 + 25) with zero leakage', () => {
    const res = calculateGstBreakup({
      taxableMinor: 1020,
      hsnCode: '2106',
      gstRateBps: 500,
      originStateCode: '29',
      destinationStateCode: '29',
    });
    expect(res.totalTaxMinor).toBe(51);
    expect(res.cgstMinor + res.sgstMinor).toBe(51);
  });

  it('applies IGST for inter-state and emits e-Way payload at >= 50000 INR threshold', () => {
    const inter = calculateGstBreakup({
      taxableMinor: 5_000_000,
      hsnCode: '8708',
      originStateCode: '27',
      destinationStateCode: '29',
    });
    expect(inter.isInterState).toBe(true);
    expect(inter.igstMinor).toBe(inter.totalTaxMinor);
    expect(buildEwayBillPayload({ ...inter, taxableMinor: 4_999_999, fromPincode: '400001', toPincode: '560001', hsnCode: '8708', supplierGstin: '27ABCDE1234F1Z0' })).toBeNull();
    const eway = buildEwayBillPayload({ ...inter, taxableMinor: 5_000_000, fromPincode: '400001', toPincode: '560001', hsnCode: '8708', supplierGstin: '27ABCDE1234F1Z0' });
    expect(eway?.supplyType).toBe('OUTWARD');
    expect(eway?.totalValueMinor).toBe(5_000_000 + inter.totalTaxMinor);
  });

  it('calculates deterministic DDP duties and VAT respecting de minimis thresholds', () => {
    const underUs = calculateDdpLandedCost({
      destinationCountry: 'US',
      hsCode: '870899',
      customsValueMinor: 50_000, // $500 < $800 de minimis
      shippingMinor: 2_500,
      insuranceMinor: 500,
    });
    expect(underUs.dutyMinor).toBe(0);

    const ukImport = calculateDdpLandedCost({
      destinationCountry: 'GB',
      hsCode: '870899',
      customsValueMinor: 30_000, // £300 > £135 threshold
      shippingMinor: 2_000,
      insuranceMinor: 0,
    });
    expect(ukImport.dutyMinor).toBeGreaterThan(0);
    expect(ukImport.vatMinor).toBeGreaterThan(0);
    expect(ukImport.landedTotalMinor).toBe(30_000 + 2_000 + ukImport.dutyMinor + ukImport.vatMinor);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ziro/shared-types test`
Expected: FAIL (`../gst/calculator.js` missing).

- [ ] **Step 3: Implement `packages/shared-types/src/gst/calculator.ts` and `index.ts`**

Implement Mod-36 GSTIN validation (`"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"` weighted checksum — double-verify the exact valid test GSTIN string `'29ABCDE1234F1Z5'` check digit against the official Mod-36 formula!), state code map, HSN registry, integer-rounded GST calculation with remainder allocation, NIC e-Way Bill JSON payload builder, and `DutyTariffProvider` + DDP corridor calculations.

- [ ] **Step 4: Run tests and check output**

Run: `pnpm --filter @ziro/shared-types test`
Expected: PASS (all tests in `commerce.test.ts` and `gst.test.ts` passing).

- [ ] **Step 5: Commit**

```bash
git add packages/shared-types/src/gst/ packages/shared-types/src/__tests__/gst.test.ts
git commit -m "feat(shared-types): add Mod-36 GSTIN validation, GST breakup, e-Way bill, and DDP calculator"
```

---

### Task 4: `@ziro/shared-types` — Agentic Commerce (UCP/ACP/WebMCP/KYA), RTO Shield & ONDC Contracts

**Files:**
- Create: `packages/shared-types/src/agent/contracts.ts`, `packages/shared-types/src/agent/index.ts`, `packages/shared-types/src/index.ts`
- Test: `packages/shared-types/src/__tests__/agent.test.ts`

**Interfaces:**
- Consumes: `packages/shared-types/src/schemas/commerce.ts`
- Produces (`@ziro/shared-types` root barrel):
  - `ZIRO_PLATFORM_FEE_BPS = 0`
  - `UcpDiscoveryManifestSchema`, `WebMcpManifestSchema`, `AcpCheckoutCreateSchema`, `AcpCheckoutSessionSchema`, `AcpCheckoutCompleteSchema`, `KyaHeadersSchema`, `RtoScoreRequestSchema`, `RtoScoreResponseSchema`, `OndcBecknContextSchema`, `OndcBecknRequestSchema`
  - Re-exports `./schemas`, `./gst`, `./agent`

- [ ] **Step 1: Write the failing agent & ONDC contract tests**

Create `packages/shared-types/src/__tests__/agent.test.ts` testing `ZIRO_PLATFORM_FEE_BPS === 0`, `UcpDiscoveryManifestSchema`, `AcpCheckoutCreateSchema`, `RtoScoreResponseSchema`, and `OndcBecknRequestSchema`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ziro/shared-types test`
Expected: FAIL (`../agent/contracts.js` missing).

- [ ] **Step 3: Implement `contracts.ts`, `agent/index.ts`, and `src/index.ts`, then build `@ziro/shared-types`**

Implement all schemas and root exports.

- [ ] **Step 4: Run tests, typecheck, and build**

Run: `pnpm --filter @ziro/shared-types typecheck && pnpm --filter @ziro/shared-types build && pnpm --filter @ziro/shared-types test`
Expected: PASS (exit 0, `dist/` emitted, all tests green).

- [ ] **Step 5: Commit**

```bash
git add packages/shared-types/src/agent/ packages/shared-types/src/index.ts packages/shared-types/src/__tests__/agent.test.ts
git commit -m "feat(shared-types): add UCP, ACP, WebMCP, KYA, RTO, and ONDC contracts"
```

---

### Task 5: `@ziro/ui-kit` & `@ziro/3d` — Dark Precision Design System & Interactive 3D Configurator

**Files:**
- Create: `packages/ui-kit/package.json`, `packages/ui-kit/tsconfig.json`, `packages/ui-kit/vitest.config.ts`, `packages/ui-kit/src/tokens.css`, `packages/ui-kit/src/components/{ZiroWordmark.tsx,StatusBadge.tsx,MetricCard.tsx,MonoCell.tsx,ZiroButton.tsx}`, `packages/ui-kit/src/3d/{ProductConfigurator3D.tsx,index.ts}`, `packages/ui-kit/src/index.ts`
- Test: `packages/ui-kit/src/__tests__/ui-kit.test.tsx`

**Interfaces:**
- Consumes: `@ziro/shared-types`, `react@^19.3.1`, `react-dom@^19.3.1`, `three@^0.187.0`, `@react-three/fiber@^9.8.2`, `@react-three/drei@^10.7.9`, `lucide-react`
- Produces:
  - `@ziro/ui-kit/tokens.css` (Deep Obsidian `#090B0E`, Slate Graphite `#12161E`, Border `#1F2633`, Electric Mint `#00E599`, Warm Amber `#F59E0B`, Crisp Alabaster `#F4F6F9`, `Plus Jakarta Sans` + `JetBrains Mono`)
  - `ZiroWordmark`, `StatusBadge` (`variant: "live-sync" | "offline-queue" | "zero-fee"`), `MetricCard`, `MonoCell`, `ZiroButton`
  - `@ziro/ui-kit/3d`: `computeConfiguratorSelection(basePriceMinor, options, selectedIds)`, `ProductConfigurator3D` (Three.js / R3F interactive mesh material finish + BOM add-on toggles + headless WebGL-unavailable graceful fallback)

- [ ] **Step 1: Write the failing UI kit & 3D configurator tests**

Create `packages/ui-kit/src/__tests__/ui-kit.test.tsx` rendering `ZiroWordmark`, `StatusBadge`, `MonoCell`, and testing `computeConfiguratorSelection` + SSR/non-WebGL rendering of `ProductConfigurator3D` via `react-dom/server`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ziro/ui-kit test`
Expected: FAIL (package does not exist).

- [ ] **Step 3: Implement `packages/ui-kit` tokens, components, and `@ziro/3d` configurator**

Include `jsx: "react-jsx"` in `tsconfig.json`, proper `"exports"` (`"."`, `"./3d"`, `"./tokens.css"`), `tsup` or `tsc` build emitting JS + `.d.ts` + copying `tokens.css` cleanly into `dist/`.

- [ ] **Step 4: Install deps, typecheck, build, and test `@ziro/ui-kit`**

Run: `pnpm install && pnpm --filter @ziro/ui-kit typecheck && pnpm --filter @ziro/ui-kit build && pnpm --filter @ziro/ui-kit test`
Expected: PASS (exit 0, tests green).

- [ ] **Step 5: Commit**

```bash
git add packages/ui-kit/ pnpm-lock.yaml
git commit -m "feat(ui-kit): add Dark Precision design tokens, wordmark, components, and @ziro/3d configurator"
```

---

### Task 6: `@ziro/rails` — Tenancy, Razorpay, Stripe, Net-30 Providers & Webhook Verifier

**Files:**
- Create: `packages/ziro-rails/package.json`, `packages/ziro-rails/tsconfig.json`, `packages/ziro-rails/vitest.config.ts`, `packages/ziro-rails/src/tenancy/{tenant-context.ts,index.ts}`, `packages/ziro-rails/src/providers/{webhook-verifier.ts,razorpay-provider.ts,stripe-provider.ts,net30-provider.ts,index.ts}`
- Test: `packages/ziro-rails/src/__tests__/providers.test.ts`

**Interfaces:**
- Consumes: `@ziro/shared-types`, `@medusajs/framework@^2.23.0`, `@medusajs/utils@^2.23.0`, `razorpay@^2.9.8`, `stripe@^23.2.0`
- Produces:
  - `TenantContextResolver` (`resolveFromRequest({ mode, host, authTenantId, headerTenantId, bodyTenantId })`)
  - `verifyRazorpayWebhook(rawBody, signature, secret)`, `verifyStripeWebhook(rawBody, signatureHeader, secret, toleranceSec?)`, `InMemoryWebhookEventStore`
  - `ZiroRazorpayProvider`, `ZiroStripeProvider`, `ZiroNet30Provider` (each enforcing `ZIRO_PLATFORM_FEE_BPS = 0`)

- [ ] **Step 1: Write the failing tenancy, provider & webhook tests (covering Review Focus #2)**

Create `packages/ziro-rails/src/__tests__/providers.test.ts` testing:
1. `TenantContextResolver`: single-tenant fallback vs multi-tenant host/JWT authority (rejecting mismatched `bodyTenantId` spoofing).
2. `verifyRazorpayWebhook` & `verifyStripeWebhook`: valid raw-body HMAC passes, 1-byte tampered raw body fails (`false`), duplicate `external_event_id` returns `{ duplicate: true }` without re-running handler.
3. `ZiroRazorpayProvider`: `initiatePayment` outputs `platform_fee_bps: 0`, `upi_intent` metadata, deterministic sandbox mode when test keys aren't live.
4. `ZiroNet30Provider`: authorizes against `B2bAccount` available credit and rejects when credit limit exceeded.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ziro/rails test`
Expected: FAIL (package/files do not exist).

- [ ] **Step 3: Implement tenancy resolver, webhook verifier, and Razorpay/Stripe/Net-30 providers**

Implement using Node `crypto.timingSafeEqual` + official `razorpay` & `stripe` SDK constructors cleanly typed against `@medusajs/framework`.

- [ ] **Step 4: Install deps and verify tests pass**

Run: `pnpm install && pnpm --filter @ziro/rails test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ziro-rails/package.json packages/ziro-rails/tsconfig.json packages/ziro-rails/vitest.config.ts packages/ziro-rails/src/tenancy/ packages/ziro-rails/src/providers/ packages/ziro-rails/src/__tests__/providers.test.ts pnpm-lock.yaml
git commit -m "feat(ziro-rails): add dual-mode tenancy, webhook HMAC verification, and Razorpay/Stripe/Net-30 providers"
```

---

### Task 7: `@ziro/rails` — Tax Provider, Fitment/BOM, B2B Wholesale Workflow & Logistics/ONDC Adapter

**Files:**
- Create: `packages/ziro-rails/src/tax/{ziro-tax-provider.ts,index.ts}`, `packages/ziro-rails/src/fitment/{fitment-bom.service.ts,index.ts}`, `packages/ziro-rails/src/b2b/{b2b-wholesale.service.ts,quote-approval.workflow.ts,index.ts}`, `packages/ziro-rails/src/logistics/{fulfillment.adapters.ts,ondc-adapter.ts,index.ts}`, `packages/ziro-rails/src/index.ts`
- Test: `packages/ziro-rails/src/__tests__/rails-domain.test.ts`

**Interfaces:**
- Consumes: `@ziro/shared-types`, `@medusajs/workflows-sdk@^2.23.0`, `packages/ziro-rails/src/providers/*`
- Produces (`@ziro/rails`):
  - `ZiroTaxProvider` (`getTaxLines(...)`)
  - `FitmentBomService` (`searchByVehicle`, `resolveBom`, `deductBomStock` with cycle detection)
  - `B2bWholesaleService` + `approveB2bQuoteWorkflow` (uses `createStep` / `createWorkflow` from `@medusajs/workflows-sdk` with compensating rollback steps for credit reserve, inventory allocation, and Net-30 order emission)
  - `ShiprocketAdapter`, `DelhiveryAdapter`, `ShippoAdapter`, `OndcSellerAdapter` (Ed25519 BLAKE-512 signing/verification + Beckn catalog/order translator)

- [ ] **Step 1: Write the failing domain tests (covering Review Focus #3)**

Create `packages/ziro-rails/src/__tests__/rails-domain.test.ts` testing:
1. `ZiroTaxProvider`: returns `CGST` + `SGST` tax lines intra-state, `IGST` inter-state, and `VAT` + `CUSTOMS_DUTY` for cross-border DDP.
2. `FitmentBomService`: Year/Make/Model filtering, virtual kit stock `min(floor(child/qty))`, hybrid pre-assembled + virtual stock, optional add-on `price_delta_minor`, and throwing `CyclicBomError` on `A -> B -> A`.
3. `approveB2bQuoteWorkflow`: happy path approves quote, converts `RESERVE -> DEBIT`, deducts BOM components, and emits order; failure during order emission triggers compensation releasing reserved credit & restoring inventory back to exact prior balances.
4. `OndcSellerAdapter`: generates valid `Signature keyId="...",algorithm="ed25519"` header, verifies authentic Beckn request, rejects tampered body, and translates catalog items into Beckn `on_search` format.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ziro/rails test`
Expected: FAIL (`rails-domain` modules missing).

- [ ] **Step 3: Implement Tax Provider, Fitment/BOM Service, B2B Wholesale + Rollback Workflow, Fulfillment & ONDC Adapter**

Implement all modules and export cleanly from `packages/ziro-rails/src/index.ts`.

- [ ] **Step 4: Run typecheck, build, and tests for `@ziro/rails`**

Run: `pnpm --filter @ziro/rails typecheck && pnpm --filter @ziro/rails build && pnpm --filter @ziro/rails test`
Expected: PASS (exit 0, all tests in `providers.test.ts` and `rails-domain.test.ts` passing).

- [ ] **Step 5: Commit**

```bash
git add packages/ziro-rails/src/tax/ packages/ziro-rails/src/fitment/ packages/ziro-rails/src/b2b/ packages/ziro-rails/src/logistics/ packages/ziro-rails/src/index.ts packages/ziro-rails/src/__tests__/rails-domain.test.ts
git commit -m "feat(ziro-rails): add GST/DDP tax provider, fitment/BOM engine, B2B rollback workflow, and ONDC/logistics adapters"
```

---

### Task 8: `@ziro/pulse` (`apps/pulse-ai`) — App Skeleton, Config, Repository, Pluggable Embeddings & Semantic Search

**Files:**
- Create: `apps/pulse-ai/pyproject.toml`, `apps/pulse-ai/app/__init__.py`, `apps/pulse-ai/app/config.py`, `apps/pulse-ai/app/db.py`, `apps/pulse-ai/app/main.py`, `apps/pulse-ai/app/models/__init__.py`, `apps/pulse-ai/app/models/search.py`, `apps/pulse-ai/app/services/__init__.py`, `apps/pulse-ai/app/services/embeddings.py`, `apps/pulse-ai/app/routers/__init__.py`, `apps/pulse-ai/app/routers/health.py`, `apps/pulse-ai/app/routers/search.py`
- Test: `apps/pulse-ai/tests/conftest.py`, `apps/pulse-ai/tests/test_search.py`

**Interfaces:**
- Consumes: `fastapi`, `pydantic`, `pydantic-settings`, `asyncpg`, `pgvector`, `numpy`, `httpx`, `python-jose`
- Produces:
  - `Settings` (`app/config.py`), `PulseRepository` protocol (`PgVectorPulseRepository` + `InMemoryPulseRepository`)
  - `EmbeddingProvider` (`BgeM3EmbeddingProvider` using `sentence-transformers`, `RemoteHttpEmbeddingProvider`, `LocalHashEmbeddingProvider` 1024-dim L2-normalized)
  - `GET /health`, `POST /v1/embeddings/index`, `POST /v1/search/semantic`

- [ ] **Step 1: Write the failing semantic search & health tests**

Create `apps/pulse-ai/tests/conftest.py` (creating isolated `TestClient` with `InMemoryPulseRepository` & `LocalHashEmbeddingProvider`) and `apps/pulse-ai/tests/test_search.py` testing `/health`, indexing two products (`Ceramic Brake Pad Kit` vs `Cotton Yoga Mat`), and verifying cosine similarity ranks the automotive brake kit highest for `"ceramic brake pad replacement"`.

- [ ] **Step 2: Run pytest to verify it fails**

Run: `python -m pytest apps/pulse-ai/tests/test_search.py -v`
Expected: FAIL (`ModuleNotFoundError: No module named 'app'`).

- [ ] **Step 3: Implement `pyproject.toml`, `config.py`, `db.py`, `embeddings.py`, `health.py`, `search.py`, and `main.py`**

Install Python deps (`asyncpg`, `pgvector`, `pytest-asyncio`, and check `sentence-transformers` availability/install cleanly as optional `[embeddings]` extra) and implement the clean FastAPI app.

- [ ] **Step 4: Run pytest to verify pass**

Run: `python -m pytest apps/pulse-ai/tests/test_search.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/pulse-ai/pyproject.toml apps/pulse-ai/app/__init__.py apps/pulse-ai/app/config.py apps/pulse-ai/app/db.py apps/pulse-ai/app/main.py apps/pulse-ai/app/models/ apps/pulse-ai/app/services/__init__.py apps/pulse-ai/app/services/embeddings.py apps/pulse-ai/app/routers/ apps/pulse-ai/tests/
git commit -m "feat(pulse-ai): scaffold FastAPI service with pgvector/in-memory repo, pluggable embeddings, and semantic search"
```

---

### Task 9: `@ziro/pulse` (`apps/pulse-ai`) — AI COD-RTO Shield (`POST /v1/rto/score`)

**Files:**
- Create: `apps/pulse-ai/app/models/rto.py`, `apps/pulse-ai/app/services/rto_scorer.py`, `apps/pulse-ai/app/routers/rto.py`
- Modify: `apps/pulse-ai/app/main.py`
- Test: `apps/pulse-ai/tests/test_rto.py`

**Interfaces:**
- Consumes: `app/config.py` (`rto_high_risk_threshold = 0.72`), `app/db.py` (`PulseRepository.save_rto_assessment`)
- Produces: `RtoScoreRequest`, `RtoScoreResponse` (`risk_score`, `risk_tier`, `upi_nudge_discount_inr`, `recommended_payment_modes`, `factors`), `POST /v1/rto/score`

- [ ] **Step 1: Write the failing RTO Shield tests**

Create `apps/pulse-ai/tests/test_rto.py` verifying:
- Low-risk repeat buyer (low RTO ratio, clean pincode, complete address, low velocity) scores `< 0.35`, `risk_tier == "LOW"`, `upi_nudge_discount_inr == 0`.
- High-risk buyer (high-RTO pincode, multiple prior RTOs, velocity spike, incomplete address, high COD cart) scores `>= 0.72`, `risk_tier == "HIGH"`, `upi_nudge_discount_inr > 0`, and recommends `UPI_INTENT` first.

- [ ] **Step 2: Run pytest to verify it fails**

Run: `python -m pytest apps/pulse-ai/tests/test_rto.py -v`
Expected: FAIL (404 / module missing).

- [ ] **Step 3: Implement `rto.py` model, `rto_scorer.py`, `routers/rto.py`, and wire into `main.py`**

Implement bounded `[0.0, 1.0]` logistic/weighted feature scorer with deterministic factor attribution and capped UPI conversion incentive.

- [ ] **Step 4: Run pytest to verify pass**

Run: `python -m pytest apps/pulse-ai/tests/test_rto.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/pulse-ai/app/models/rto.py apps/pulse-ai/app/services/rto_scorer.py apps/pulse-ai/app/routers/rto.py apps/pulse-ai/app/main.py apps/pulse-ai/tests/test_rto.py
git commit -m "feat(pulse-ai): add AI COD-RTO Shield scoring engine and /v1/rto/score endpoint"
```

---

### Task 10: `@ziro/pulse` (`apps/pulse-ai`) — UCP, WebMCP, KYA Governance & ACP Checkout Delegation

**Files:**
- Create: `apps/pulse-ai/app/models/agent.py`, `apps/pulse-ai/app/services/{kya.py,commerce_client.py,acp_service.py}`, `apps/pulse-ai/app/routers/agent.py`
- Modify: `apps/pulse-ai/app/main.py`
- Test: `apps/pulse-ai/tests/test_ucp_acp_kya.py`

**Interfaces:**
- Consumes: `app/config.py`, `app/db.py`
- Produces:
  - `GET /.well-known/ucp` (`platform_fee_bps: 0`, `kya_required: true`, `acp_base_url`, `webmcp_manifest_url`)
  - `GET /.well-known/webmcp.json`
  - `verify_kya_request` (HMAC-SHA256 `METHOD\nPATH\nTIMESTAMP\nSHA256(BODY)` within 300s window OR HS256 JWT)
  - `CommerceBackendClient` (`HttpCommerceClient` + `InMemoryCommerceClient`)
  - `POST /api/agent/acp/v1/checkout-sessions`, `GET /api/agent/acp/v1/checkout-sessions/{id}`, `POST /api/agent/acp/v1/checkout-sessions/{id}/complete`

- [ ] **Step 1: Write the failing UCP/WebMCP/KYA/ACP tests (covering Review Focus #4)**

Create `apps/pulse-ai/tests/test_ucp_acp_kya.py` verifying:
1. `GET /.well-known/ucp` returns `platform_fee_bps == 0` and valid ACP/WebMCP endpoints; `GET /.well-known/webmcp.json` lists tool contracts.
2. Unauthenticated or tampered `X-Ziro-Agent-Signature` returns `401`.
3. Expired `X-Ziro-Timestamp` (> 300s old) returns `401`.
4. Valid KYA agent requesting discount that drops gross margin `(net_price - cogs_minor)/net_price` below `min_margin_bps` receives `403` and writes an audit record.
5. Valid KYA request within margin creates ACP checkout session and `/complete` captures idempotently (repeating `idempotency_key` returns same `external_order_id`).

- [ ] **Step 2: Run pytest to verify it fails**

Run: `python -m pytest apps/pulse-ai/tests/test_ucp_acp_kya.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement `models/agent.py`, `kya.py`, `commerce_client.py`, `acp_service.py`, `routers/agent.py`, and wire into `main.py`**

Implement canonical HMAC + JWT verification, margin floor enforcement, audit logging, and idempotent ACP lifecycle.

- [ ] **Step 4: Run full `apps/pulse-ai` pytest suite**

Run: `python -m pytest apps/pulse-ai/tests -v`
Expected: PASS (all RTO, Search, UCP, WebMCP, KYA, and ACP tests green).

- [ ] **Step 5: Commit**

```bash
git add apps/pulse-ai/app/models/agent.py apps/pulse-ai/app/services/ apps/pulse-ai/app/routers/agent.py apps/pulse-ai/app/main.py apps/pulse-ai/tests/test_ucp_acp_kya.py
git commit -m "feat(pulse-ai): add UCP/WebMCP discovery, KYA governance, margin guardrails, and ACP checkout"
```

---

### Task 11: `@ziro/core` (`apps/commerce-engine`) — Medusa v2 Config, Delta-Sync, Subscribers, ONDC & Internal/Store Routes

**Files:**
- Create: `apps/commerce-engine/package.json`, `apps/commerce-engine/tsconfig.json`, `apps/commerce-engine/vitest.config.ts`, `apps/commerce-engine/medusa-config.ts`, `apps/commerce-engine/src/index.ts`, `apps/commerce-engine/src/services/{engine-container.ts,pos-sync.service.ts,catalog-index.service.ts}`, `apps/commerce-engine/src/subscribers/product-mutated.ts`, `apps/commerce-engine/src/api/health/route.ts`, `apps/commerce-engine/src/api/internal/acp/{price-and-reserve/route.ts,complete-order/route.ts}`, `apps/commerce-engine/src/api/ondc/{search,select,init,confirm,status,cancel}/route.ts`, `apps/commerce-engine/src/api/webhooks/{razorpay/route.ts,stripe/route.ts,[provider]/[tenantId]/route.ts}`, `apps/commerce-engine/src/api/store/pos/{catalog/route.ts,sync/route.ts}`, `apps/commerce-engine/src/api/store/fitment/search/route.ts`, `apps/commerce-engine/src/api/store/bom/resolve/route.ts`, `apps/commerce-engine/src/api/store/b2b/quotes/{route.ts,[id]/approve/route.ts}`
- Test: `apps/commerce-engine/src/__tests__/engine.test.ts`

**Interfaces:**
- Consumes: `@ziro/shared-types`, `@ziro/rails`, `@medusajs/medusa@^2.23.0`, `@medusajs/framework@^2.23.0`, `meilisearch@^0.63.0`
- Produces:
  - `medusa-config.ts` registering Valkey (`REDIS_URL`), PostgreSQL (`DATABASE_URL`), Razorpay/Stripe/Net-30 payment providers, and `ZiroTaxProvider`
  - `PosSyncService` (`syncBatch`, `getCatalogDelta`) supporting `FORCE_SALE_WITH_ALERT` vs `STRICT_REJECT`, `ABSOLUTE` vs `DELTA` stock audits, BOM component deduction, and `(tenant_id, device_id, client_mutation_id)` deduplication
  - `CatalogIndexService` + `productMutatedSubscriber` pushing catalog mutations to Meilisearch & `@ziro/pulse`
  - All Medusa/Express-compatible HTTP `route.ts` handlers

- [ ] **Step 1: Write the failing `@ziro/core` integration tests (covering Review Focus #5)**

Create `apps/commerce-engine/src/__tests__/engine.test.ts` covering:
1. `POST /store/pos/sync`: applies normal `POS_SALE` incrementing `(location_id, sku)` version; deduplicates repeated `client_mutation_id` as `DUPLICATE`; resolves `POS_SALE` version mismatch under `FORCE_SALE_WITH_ALERT` as `APPLIED_WITH_ALERT` with reconciliation alert row; rejects stale `POS_SALE` & `STOCK_AUDIT` under `STRICT_REJECT` as `CONFLICT` returning `server_version` and `server_balance`.
2. `STOCK_AUDIT` with `audit_mode: "ABSOLUTE"` computes exact signed delta against current `on_hand`.
3. `POST /store/pos/sync` selling a BOM parent SKU deducts underlying child SKUs atomically.
4. `GET /store/pos/catalog` returns incremental items above `since_version`.
5. `POST /internal/acp/price-and-reserve` + `complete-order` enforces `X-Ziro-Internal-Secret`, computes GST, reserves stock, and emits order.
6. `POST /webhooks/razorpay` and `POST /webhooks/:provider/:tenantId` validate raw-body HMAC in both `single` and `multi` tenancy modes.
7. `POST /ondc/search` verifies Beckn `Authorization` header and dispatches catalog `on_search` payload.
8. `productMutatedSubscriber` invokes Meilisearch index + Pulse AI `/v1/embeddings/index` on catalog mutation.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ziro/core test`
Expected: FAIL.

- [ ] **Step 3: Implement `apps/commerce-engine` config, services, subscriber, and all routes**

Write `package.json` (`@ziro/core`, including `"db:migrate": "medusa db:migrate"`), `medusa-config.ts`, services, subscriber, and route handlers cleanly.

- [ ] **Step 4: Install deps, typecheck, build, and test `@ziro/core`**

Run: `pnpm install && pnpm --filter @ziro/core typecheck && pnpm --filter @ziro/core build && pnpm --filter @ziro/core test`
Expected: PASS (exit 0, all tests green).

- [ ] **Step 5: Commit**

```bash
git add apps/commerce-engine/ pnpm-lock.yaml
git commit -m "feat(commerce-engine): add Medusa v2 config, POS delta-sync, ONDC/ACP/B2B/webhook routes, and catalog sync"
```

---

### Task 12: `@ziro/pos` (`apps/pos-terminal`) — Dexie.js Offline Database, Sync Engine, Serwist PWA & Terminal UI

**Files:**
- Create: `apps/pos-terminal/package.json`, `apps/pos-terminal/tsconfig.json`, `apps/pos-terminal/next.config.ts`, `apps/pos-terminal/vitest.config.ts`, `apps/pos-terminal/src/lib/{db.ts,sync-engine.ts}`, `apps/pos-terminal/src/app/{globals.css,layout.tsx,manifest.ts,sw.ts,page.tsx,warehouse/page.tsx,b2b/page.tsx}`
- Test: `apps/pos-terminal/src/__tests__/sync-engine.test.ts`

**Interfaces:**
- Consumes: `@ziro/shared-types`, `@ziro/ui-kit`, `next@^16.4.6`, `react@^19.3.1`, `@serwist/next@^9.6.0`, `serwist@^9.6.0`, `dexie@^4.4.7`, `tailwindcss@^4.3.5`
- Produces:
  - `ZiroPosDb` (Dexie tables: `catalog`, `cart`, `mutationQueue`, `conflicts`, `syncMeta`)
  - `PosSyncEngine` (`queueSale`, `queueStockAudit`, `flushPendingMutations`, `resolveConflict`)
  - Counter POS (`/`), Barcode Warehouse Audit (`/warehouse`), B2B Quick-Order CSV/SKU Grid (`/b2b`), Serwist service worker (`sw.ts`), Dark Architectural Precision styling (`#00E599` synced / `#F59E0B` offline pending queue)

- [ ] **Step 1: Write the failing offline sync engine tests**

Create `apps/pos-terminal/src/__tests__/sync-engine.test.ts` (using an injectable storage adapter / `fake-indexeddb` or in-memory Dexie-compatible store interface) testing offline sale queuing while `navigator.onLine === false`, batch flushing to mocked `/store/pos/sync`, updating local catalog versions on `APPLIED`, moving `CONFLICT` mutations into the conflict queue, and resolving conflicts (`accept_server`, `force_override`, `void`).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ziro/pos test`
Expected: FAIL.

- [ ] **Step 3: Implement `db.ts`, `sync-engine.ts`, Serwist `next.config.ts` (`next build --webpack`), `sw.ts`, `manifest.ts`, and POS/Warehouse/B2B pages**

Ensure Next.js 16 build uses `next build --webpack` cleanly for `@serwist/next`, and all client/server boundaries (`"use client"`) compile under `next typegen` + `next build --webpack`.

- [ ] **Step 4: Install deps, typecheck, test, and build `@ziro/pos`**

Run: `pnpm install && pnpm --filter @ziro/pos typecheck && pnpm --filter @ziro/pos test && pnpm --filter @ziro/pos build`
Expected: PASS (exit 0, Next.js + Serwist webpack production build succeeds, tests green).

- [ ] **Step 5: Commit**

```bash
git add apps/pos-terminal/ pnpm-lock.yaml
git commit -m "feat(pos-terminal): add local-first Dexie/Serwist POS terminal, warehouse scanner, conflict queue, and B2B quick order"
```

---

### Task 13: `@ziro/storefront` (`apps/storefront`) — Next.js 16, Embedded Payload CMS v3, Zustand Cart, GSAP/Lenis, `@ziro/3d` Configurator & RTO Checkout

**Files:**
- Create: `apps/storefront/package.json`, `apps/storefront/tsconfig.json`, `apps/storefront/next.config.ts`, `apps/storefront/vitest.config.ts`, `apps/storefront/src/payload.config.ts`, `apps/storefront/src/collections/{Pages.ts,Media.ts}`, `apps/storefront/src/store/cart.ts`, `apps/storefront/src/components/{SmoothScroll.tsx,FitmentFinder.tsx,CheckoutForm.tsx}`, `apps/storefront/src/app/{globals.css,layout.tsx,page.tsx,configure/page.tsx,checkout/page.tsx,(payload)/admin/[[...segments]]/page.tsx}`
- Test: `apps/storefront/src/__tests__/storefront.test.ts`

**Interfaces:**
- Consumes: `@ziro/shared-types`, `@ziro/ui-kit`, `@ziro/ui-kit/3d`, `next@^16.4.6`, `react@^19.3.1`, `payload@^3.94.2`, `@payloadcms/next@^3.94.2`, `@payloadcms/db-postgres@^3.94.2`, `@payloadcms/richtext-lexical@^3.94.2`, `zustand@^5.1.0`, `react-hook-form`, `@hookform/resolvers`, `gsap@^3.15.1`, `lenis@^1.3.28`
- Produces:
  - `payload.config.ts` (`schemaName: "payload"`, `Pages` & `Media` collections with `tenantId` field & tenant access control)
  - `useCartStore` (Zustand store supporting regular items, BOM optional add-ons, 3D material variant, B2B `gstin`, and RTO `upiNudgeDiscountInr`)
  - Editorial SSR landing page (`/`), interactive 3D configurator (`/configure`), Fitment Finder, and Checkout with live RTO Shield UPI nudge (`/checkout`)

- [ ] **Step 1: Write the failing storefront cart & checkout schema tests**

Create `apps/storefront/src/__tests__/storefront.test.ts` testing `useCartStore` add/merge/remove/clear with BOM optional SKUs & GSTIN validation, checkout form Zod schema validation (valid vs invalid GSTIN, India vs global country DDP fields), and `payload.config.ts` `schemaName: "payload"` + `tenantId` schema presence.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ziro/storefront test`
Expected: FAIL.

- [ ] **Step 3: Implement Payload CMS v3 config/collections, Zustand cart, GSAP/Lenis wrapper, FitmentFinder, CheckoutForm, and App Router pages**

Note: Configure `apps/storefront/next.config.ts` with `withPayload` and ensure `apps/storefront` builds cleanly even without a live Postgres connection at build time (`page.tsx` uses safe fallback editorial blocks when DB isn't reachable during static build, and `(payload)/admin` uses `force-dynamic`!).

- [ ] **Step 4: Install deps, typecheck, test, and build `@ziro/storefront`**

Run: `pnpm install && pnpm --filter @ziro/storefront typecheck && pnpm --filter @ziro/storefront test && pnpm --filter @ziro/storefront build`
Expected: PASS (exit 0, Next.js 16 production build succeeds, tests green).

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/ pnpm-lock.yaml
git commit -m "feat(storefront): add Next.js 16 storefront, embedded Payload CMS v3, Zustand cart, GSAP/Lenis, 3D configurator, and RTO checkout"
```

---

### Task 14: Full Monorepo Verification, License Audit & End-to-End Parity Check

**Files:**
- Verify: entire `ziro-commerce-os` workspace (`packages/*`, `apps/*`, `docker/*`, `.github/workflows/ci.yml`)

**Interfaces:**
- Runs full monorepo verification gate across TypeScript and Python workspaces.

- [ ] **Step 1: Run full infrastructure, TypeScript typecheck, build, Vitest suite, and Python Pytest suite**

Run:
```bash
node --test tests/infra.test.mjs
pnpm typecheck
pnpm build
pnpm test
python -m pytest apps/pulse-ai/tests -v
```
Expected: ALL commands exit 0 with zero type errors, build failures, or test failures.

- [ ] **Step 2: Run permissive license & secret sanity audit**

Run a check across `pnpm licenses list` (or `node_modules` license check) and Python packages used by `apps/pulse-ai` confirming zero `GPL` or `AGPL` runtime dependencies, and verify `git status` shows no uncommitted files or `.env` leaks.

- [ ] **Step 3: Commit final verification adjustments (if any) and push milestone to `origin`**

```bash
git push -u origin feat/ziro-phase-1
```

---

## Self-Review Results

1. **Spec coverage:** Every file in Spec Section 3, every PostgreSQL table/index/hypertable in Section 4, every API endpoint in Section 5, and all 9 calls in Section 6 map 1:1 to Tasks 1–13.
2. **Step scan:** Every task follows strict RED → Verify RED → GREEN → Verify GREEN → Commit order with explicit test assertions, file paths, interfaces, and commands; zero `TBD`s or raw code-transcript dumps.
3. **Type consistency:** `MoneyMinorSchema`, `BomResolveRequestSchema`, `PosSyncBatchRequestSchema`, `B2bQuoteApproveSchema`, `validateGstin`, `calculateGstBreakup`, `TenantContextResolver`, `FitmentBomService`, `B2bWholesaleService`, `OndcSellerAdapter`, `PosSyncService`, `Pluggable EmbeddingProvider`, and `CommerceBackendClient` use identical names and signatures across producer and consumer tasks.
4. **Review Focus:** All 5 uncovered failure modes (Mod-36 GSTIN/odd-paise split, raw-body webhook tamper/dedup, cyclic BOM & workflow rollback compensation, KYA replay expiry & gross margin 403, POS duplicate ID & conflict policy modes) are pinned to explicit tests in Tasks 3, 6, 7, 10, and 11.
5. **Proportion:** Concise task specifications (~550 lines covering 7 full apps/packages + Docker/CI).
