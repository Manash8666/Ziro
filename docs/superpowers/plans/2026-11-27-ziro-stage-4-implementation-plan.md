# Ziro Commerce OS — Stage 4 Implementation Plan
### *Production Hardening, PostgreSQL 17 RLS, Flash-Sale Concurrency, HIL & 1-Click Migration Engine (`@ziro/migrator`)*

- **Branch:** `feat/ziro-stage-4`
- **Spec:** `docs/superpowers/specs/2026-11-27-ziro-stage-4-design.md`
- **Approach:** Test-Driven Development (TDD) + Autonomous Verification + Direct Merge to `main`

---

## Proposed Tasks

### Task 1: Package Foundation & Types (`@ziro/migrator`)
- [ ] Create `packages/ziro-migrator/package.json` with permissive `MIT` license and scripts.
- [ ] Create `packages/ziro-migrator/tsconfig.json` and `vitest.config.ts`.
- [ ] Implement `packages/ziro-migrator/src/types.ts`: `ZIRO_PLATFORM_FEE_BPS = 0`, `GstSlabPercent`, `FitmentEntry`, `ZiroMigratedVariant`, `ZiroMigratedProduct`, `ZiroCatalogSink`, `MigrationBatchReport`.
- [ ] Implement `packages/ziro-migrator/src/hsn-fitment.ts`: HSN/GST inference rules, fitment tag parser, SHA-256 idempotency key generator.
- [ ] Implement `packages/ziro-migrator/src/csv-parser.ts`: RFC-4180 zero-dependency parser.
- [ ] Implement `packages/ziro-migrator/src/shopify-csv-mapper.ts`: Shopify export -> Ziro data model.
- [ ] Implement `packages/ziro-migrator/src/woo-rest-importer.ts`: Paginated WooCommerce REST client.
- [ ] Implement `packages/ziro-migrator/src/index.ts`: Barrel exports.
- [ ] Create and pass unit tests: `packages/ziro-migrator/tests/migrator.test.ts`.

### Task 2: PostgreSQL 17 RLS Policies & Caddy Hardening
- [ ] Create `docker/postgres/02-tenant-rls.sql`: RLS policies across core tables.
- [ ] Create `docker/postgres/03-migration-tables-rls.sql`: Tables `ziro_product_tax_profile`, `ziro_vehicle_fitment`, `ziro_migration_log` with RLS.
- [ ] Create `docker/caddy/Caddyfile`: Hardened On-Demand TLS with shared secret query check and reverse proxies.
- [ ] Update `apps/cloud-portal/src/app/api/caddy/check-domain/route.ts`: Validate `CADDY_INTERNAL_SECRET`.
- [ ] Create `scripts/backup-pg-r2.sh`: Compressed, encrypted backup script with SHA-256 check.

### Task 3: Commerce Engine Admin Migration Endpoint & RLS
- [ ] Add `@ziro/migrator: workspace:*` to `apps/commerce-engine/package.json`.
- [ ] Implement `apps/commerce-engine/src/lib/rls-transaction.ts`: Transaction-scoped `set_config('app.current_tenant_id', $1, true)`.
- [ ] Implement `apps/commerce-engine/src/services/product-migration-upsert.ts`: Idempotent upsert logic with 0% fee check.
- [ ] Implement `apps/commerce-engine/src/api/middlewares.ts`: Internal service token bearer auth guard.
- [ ] Implement `apps/commerce-engine/src/api/admin/migrations/products/route.ts`: Admin migration POST route.
- [ ] Implement `apps/commerce-engine/src/subscribers/product-migrated-indexer.ts`: Listens for `ziro.product.migrated` and indexes to Meilisearch + Pulse AI.
- [ ] Create and pass tests: `apps/commerce-engine/tests/admin-migrations-products.test.ts` and `apps/commerce-engine/tests/product-migrated-subscriber.test.ts`.

### Task 4: Cloud Portal Migration Studio
- [ ] Add `@ziro/migrator: workspace:*` to `apps/cloud-portal/package.json`.
- [ ] Implement `apps/cloud-portal/src/lib/ziro-core-sink.ts`: HTTP implementation of `ZiroCatalogSink`.
- [ ] Implement `apps/cloud-portal/src/app/api/v1/migrations/route.ts`: Multipart & JSON handler with SSRF protection.
- [ ] Implement `apps/cloud-portal/src/components/MigrationStudio.tsx`: Dark Precision CSV/REST UI.
- [ ] Implement `apps/cloud-portal/src/app/migrate/page.tsx`: Page hosting `MigrationStudio`.
- [ ] Create and pass tests: `apps/cloud-portal/tests/migrations-route.test.ts`.

### Task 5: Flash-Sale Load Testing, Hardware-in-the-Loop & CI/CD
- [ ] Implement `scripts/verify-webhooks-and-hil.ts`: ESC/POS, HID barcode, Razorpay webhook, and Pulse AI scoring simulation.
- [ ] Implement `tests/load/flash-sale-pos-sync.k6.js`: k6 stress testing script for flash sale concurrency.
- [ ] Implement `.github/workflows/stage4-hardening.yml`: CI pipeline.

### Task 6: Full Monorepo Verification & Merge to `main`
- [ ] Run `pnpm install`.
- [ ] Run `turbo run typecheck`.
- [ ] Run `turbo run test`.
- [ ] Run `python -m pytest apps/pulse-ai/tests -v`.
- [ ] Execute `scripts/verify-webhooks-and-hil.ts`.
- [ ] Run `turbo run build`.
- [ ] Run `pnpm licenses list`.
- [ ] Merge `feat/ziro-stage-4` into `main` and push `main` to `origin/main`.
