# Ziro Commerce OS — Stage 4 System Specification
### *Production Hardening, PostgreSQL 17 RLS, Flash-Sale Concurrency, HIL & 1-Click Migration Engine (`@ziro/migrator`)*

**Author:** Google DeepMind Assistant (Antigravity) & Hybrid StudioZ  
**Date:** 2026-11-27  
**Status:** Approved  
**Branch:** `feat/ziro-stage-4`  
**License:** Permissive Open Source (`MIT`, `Apache 2.0`, `BSD-3-Clause`)  

---

## 1. Intent & Context

Stages 1 through 3 established Ziro Commerce OS as a full-stack, local-first commerce engine with a Dark Precision UI, a high-conversion editorial storefront, a local-first PWA POS terminal, and protocol-native shopping agent endpoints. All 87 Vitest unit/integration tests and 9 Pytest AI test suites pass with 0% GMV fee strictly maintained and 100% permissive licensing.

**Stage 4** transitions Ziro from a verified local monorepo into a **multi-tenant, flash-sale-hardened, hardware-validated production SaaS** ready for live counter operations, multi-merchant onboarding, and high-velocity catalog migrations.

---

## 2. Invariants & Guardrails

1. **0% GMV Platform Fee:** `ZIRO_PLATFORM_FEE_BPS = 0` is strictly enforced. Migrated products, billing endpoints, and catalog sync records must verify zero revenue-share deductions.
2. **Strict Multi-Tenant PostgreSQL 17 Row-Level Security (RLS):** Every commerce query, catalog mutation, and vector similarity search must execute within an active transaction configured with `SELECT set_config('app.current_tenant_id', $1, true)`.
3. **100% Permissive Open Source Licensing:** Only `MIT`, `Apache-2.0`, `BSD-3-Clause`, `PostgreSQL`, or `ISC` licenses are permitted. Zero `GPL`, `AGPL`, or proprietary dependencies.
4. **Non-Negative Integer Currency Units:** All financial data (prices, tax components, discounts) are strictly stored and computed in integer minor units (`paise` or `cents`).
5. **Idempotent Catalog Migrations:** Shopify CSV and WooCommerce REST migrations must generate deterministic idempotency keys (`ziro_mig_<sha256>`) ensuring zero duplicate variants or tax profiles upon repeated imports.
6. **SSRF Protection:** Migration endpoints must block loopback (`127.0.0.1`, `localhost`), link-local (`169.254.169.254`), and private IPv4 ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).

---

## 3. Five Architectural Tracks

### Track 4A: Multi-Tenant Security, PostgreSQL 17 RLS & Caddy Hardening
- **PostgreSQL 17 RLS SQL Scripts:**
  - `docker/postgres/02-tenant-rls.sql`: Applies `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` and `FORCE ROW LEVEL SECURITY` across `product`, `product_variant`, `inventory_level`, `order`, `customer`, `b2b_credit_ledger`, `pos_sync_log`, and `pulse_product_embeddings`.
  - `docker/postgres/03-migration-tables-rls.sql`: Defines `ziro_product_tax_profile`, `ziro_vehicle_fitment`, and `ziro_migration_log` with RLS policies bound to `current_setting('app.current_tenant_id', true)`.
- **Hardened Caddy Configuration:**
  - `docker/caddy/Caddyfile`: Configures On-Demand TLS with internal shared secret verification (`?secret={$CADDY_INTERNAL_SECRET}`), 2-minute rate limiting (burst 5), HSTS, and reverse proxy routes for pulse-ai (`8000`), commerce-engine (`9000`), and storefront (`3000`).
  - `apps/cloud-portal/src/app/api/caddy/check-domain/route.ts`: Validates `CADDY_INTERNAL_SECRET` query param.
- **Automated Offsite Backup Script:**
  - `scripts/backup-pg-r2.sh`: Dumps PostgreSQL, compresses with zstandard, encrypts with AES-256-CBC, computes SHA-256 checksum, and uploads to Cloudflare R2 via AWS CLI S3 API.

### Track 4B: `@ziro/migrator` Package (`packages/ziro-migrator`)
- **Package Foundation:**
  - `package.json`, `tsconfig.json`, `vitest.config.ts`.
  - Permissive `MIT` license, shared across the Turborepo workspace.
- **Core Types & Invariants (`src/types.ts`):**
  - `ZIRO_PLATFORM_FEE_BPS = 0`.
  - `GstSlabPercent`: `0 | 5 | 12 | 18 | 28`.
  - `FitmentEntry`, `ZiroMigratedVariant`, `ZiroMigratedProduct`, `ZiroCatalogSink`, `MigrationBatchReport`.
- **Deterministic HSN & Fitment Extraction (`src/hsn-fitment.ts`):**
  - Infers HSN codes and GST slabs (8714: 28% brakes/clutches/chains, 8507: 28% batteries, 4011: 28% tyres, 2710: 18% lubricants, 6506: 18% helmets, 2106: 18% whey/protein, 6109: 5% apparel). Defaults to 18% HSN 8708.
  - Parses vehicle fitment tags (e.g. `fitment:Yamaha:YZF-R15:2018-2024`).
  - Generates deterministic SHA-256 idempotency keys (`ziro_mig_<hash>`).
- **RFC-4180 CSV Engine (`src/csv-parser.ts`):**
  - Zero-dependency streaming/buffered CSV parser handling UTF-8 BOM, multiline HTML descriptions, and escaped quotes.
- **Shopify CSV Mapper (`src/shopify-csv-mapper.ts`):**
  - Converts Shopify product exports into structured `ZiroMigratedProduct` arrays with variants, prices in minor units, HSN codes, and fitment metadata.
- **WooCommerce REST Importer (`src/woo-rest-importer.ts`):**
  - Paginated client consuming `/wp-json/wc/v3/products` with `X-WP-TotalPages`, handling variable product variant expansion and exponential backoff retry on HTTP 429/503.

### Track 4C: Commerce Engine Integration & Event Subscriber (`apps/commerce-engine`)
- **Workspace Dependency:** Add `@ziro/migrator` to `apps/commerce-engine/package.json`.
- **RLS Transaction Wrapper (`src/lib/rls-transaction.ts`):**
  - Executes queries with PostgreSQL `set_config('app.current_tenant_id', $1, true)`.
- **Product Migration Upsert Service (`src/services/product-migration-upsert.ts`):**
  - Idempotently upserts products, variants, tax profiles, and fitment matrices while asserting `ZIRO_PLATFORM_FEE_BPS === 0`.
- **Internal Service Auth Middleware (`src/api/middlewares.ts`):**
  - Validates `Authorization: Bearer <ZIRO_INTERNAL_SERVICE_TOKEN>`.
- **Medusa v2 Admin Migration Endpoint (`src/api/admin/migrations/products/route.ts`):**
  - Accepts batch payload, applies RLS transaction, executes upsert, logs idempotency, and emits `ziro.product.migrated` event.
- **Background Indexer Subscriber (`src/subscribers/product-migrated-indexer.ts`):**
  - Listens to `ziro.product.migrated`, hydrates product under RLS, and indexes concurrently into Meilisearch and `pulse-ai` (`POST /v1/embeddings/products/upsert`).

### Track 4D: Cloud Portal Migration Studio (`apps/cloud-portal`)
- **Workspace Dependency:** Add `@ziro/migrator` to `apps/cloud-portal/package.json`.
- **Core HTTP Sink (`src/lib/ziro-core-sink.ts`):**
  - Implements `ZiroCatalogSink` via HTTP POST to `/admin/migrations/products` with tenant headers and internal bearer tokens.
- **Migration API Route (`src/app/api/v1/migrations/route.ts`):**
  - Handles multipart/form-data (Shopify CSV with dryRun preview toggle) and JSON (WooCommerce credentials). Validates remote URLs against SSRF blacklist.
- **Migration Studio Component (`src/components/MigrationStudio.tsx`):**
  - Interactive Dark Precision UI: CSV drag-and-drop, real-time HSN/GST inference table, WooCommerce REST sync form, and migration progress telemetry.
- **App Route (`src/app/migrate/page.tsx`):**
  - Cloud Portal page integrating `MigrationStudio`.

### Track 4E: Flash-Sale Load Testing, Hardware-in-the-Loop & CI/CD
- **HIL & Webhook Verification Script (`scripts/verify-webhooks-and-hil.ts`):**
  - Tests ESC/POS binary receipt generation, 30ms HID barcode buffer coalescing, signed HMAC Razorpay webhook replay, and Pulse AI COD-RTO scoring.
- **k6 Load Testing Suite (`tests/load/flash-sale-pos-sync.k6.js`):**
  - 400-VU BOM kit flash sale race condition and 100-VU duplicate POS burst sync stress test under Valkey cart locks.
- **GitHub Actions Hardening Workflow (`.github/workflows/stage4-hardening.yml`):**
  - Automated CI gate running license audit, typecheck, Vitest, Pytest, and build.

---

## 4. Verification Protocol

- **License Check:** `pnpm licenses list` -> 100% permissive (`MIT`, `Apache-2.0`, `BSD-3-Clause`).
- **TypeScript:** `turbo run typecheck` -> 10/10 tasks successful.
- **Unit/Integration Tests:** `turbo run test` -> 100% pass across all packages including `@ziro/migrator`.
- **Python AI Suite:** `pytest apps/pulse-ai/tests -v` -> 9/9 tests pass.
- **Hardware & Webhook Simulation:** `scripts/verify-webhooks-and-hil.ts` -> 4/4 assertions pass.
- **Production Build:** `turbo run build` -> all Next.js apps, Serwist PWA, and libraries build cleanly.
- **Git Merge:** Clean fast-forward/squash merge into `main` and push to remote `origin/main`.
