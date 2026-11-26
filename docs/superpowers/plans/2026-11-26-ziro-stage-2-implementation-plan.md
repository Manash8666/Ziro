# Ziro Commerce OS — Stage 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and integrate Ziro Stage 2 — Ziro Cloud Multi-Tenant SaaS Portal, Live Database & Valkey Event Pipeline, Merchant Catalog & B2B Studio, and Retail POS/Storefront Hardware Hardening.

**Architecture:** Composable multi-tenant SaaS portal with Caddy On-Demand TLS and flat-tier billing (0% GMV fee), paired with Valkey distributed cart locks, Medusa v2 admin UI extensions, ESC/POS hardware thermal receipt generation, and rich automotive catalog seeds.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, Medusa.js v2, Valkey (ioredis), Caddy, Dexie.js, Serwist, WebHID, Python FastAPI.

**Spec:** `docs/superpowers/specs/2026-11-26-ziro-stage-2-design.md`

---

## Global Constraints & Invariants

- **0% GMV Platform Tax:** `ZIRO_PLATFORM_FEE_BPS = 0` strictly enforced across all gateways, billing modules, and UCP/ACP manifests.
- **Integer Minor Units:** All monetary values in paise or cents. No floats.
- **Permissive Licenses Only:** `MIT`, `Apache 2.0`, `BSD-3-Clause`, `PostgreSQL`, `ISC`. Zero `GPL` / `AGPL`.
- **Dual Tenancy Mode:** Works seamlessly in `single` and `multi` tenancy modes.
- **Isolated Deterministic Tests:** All automated tests must run reliably without live external network dependencies.

---

## Tasks

### Task 1: `@ziro/shared-types` — Stage 2 Contracts & Hardware Schemas

**Files:**
- Modify: `packages/shared-types/src/schemas/commerce.ts`, `packages/shared-types/src/index.ts`
- Create: `packages/shared-types/src/schemas/stage2.ts`, `packages/shared-types/src/__tests__/stage2.test.ts`

**Interfaces:**
- Produces:
  - `SaaSPlanTierSchema` (`'STARTER'`, `'GROWTH'`, `'ENTERPRISE'`)
  - `TenantProvisionRequestSchema`, `TenantProvisionResponseSchema`
  - `CaddyDomainCheckResponseSchema`
  - `EscPosReceiptRequestSchema`, `EscPosPaperWidthSchema` (`58` | `80`)
  - `BarcodeScannerScanEventSchema`
  - `AgentTelemetryMetricSchema`

- [ ] **Step 1: Write failing schema tests in `packages/shared-types/src/__tests__/stage2.test.ts`**
- [ ] **Step 2: Run test to verify it fails (`pnpm --filter @ziro/shared-types test`)**
- [ ] **Step 3: Implement Zod schemas in `packages/shared-types/src/schemas/stage2.ts` and export from index**
- [ ] **Step 4: Verify tests pass and build package (`pnpm --filter @ziro/shared-types test && pnpm --filter @ziro/shared-types build`)**
- [ ] **Step 5: Commit and push**

---

### Task 2: `@ziro/rails` — Distributed Cart Locks & Deterministic Catalog Seeds

**Files:**
- Create: `packages/ziro-rails/src/lock/cart-lock.manager.ts`, `packages/ziro-rails/src/lock/index.ts`, `packages/ziro-rails/src/__tests__/cart-lock.test.ts`
- Create: `apps/commerce-engine/src/seeds/catalog-seed.ts`
- Modify: `packages/ziro-rails/src/index.ts`

**Interfaces:**
- Produces:
  - `ValkeyCartLockManager` (supports atomic `acquireLock(tenantId, cartId, items, ttlMs)` and `releaseLock`, with deterministic `InMemoryLockStore` and Valkey/Redis adapter)
  - `seedRealisticCatalog()` generating 100+ automotive SKUs with valid HSN, GST rates, fitments, and BOM kits.

- [ ] **Step 1: Write failing cart lock tests in `packages/ziro-rails/src/__tests__/cart-lock.test.ts`**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement `ValkeyCartLockManager` and `catalog-seed.ts`**
- [ ] **Step 4: Verify tests pass and build package (`pnpm --filter @ziro/rails test && pnpm --filter @ziro/rails build`)**
- [ ] **Step 5: Commit and push**

---

### Task 3: `@ziro/pos` — POS Hardware Acceleration (ESC/POS Printer & Barcode Scanner)

**Files:**
- Create: `apps/pos-terminal/src/lib/hardware/escpos-printer.ts`
- Create: `apps/pos-terminal/src/lib/hardware/barcode-scanner.ts`
- Create: `apps/pos-terminal/src/lib/hardware/cash-drawer.ts`
- Create: `apps/pos-terminal/src/lib/hardware/index.ts`
- Test: `apps/pos-terminal/src/__tests__/hardware.test.ts`

**Interfaces:**
- Produces:
  - `EscPosPrinterDriver` (generates raw binary ESC/POS buffers with alignment, bold, font scaling, GST tax table, Code128 barcode, QR code, and paper cut)
  - `HardwareBarcodeScannerListener` (filters key events with 25ms threshold buffer to cleanly capture hardware barcode inputs without keyboard interference)
  - `CashDrawerController` (generates drawer kick pulse `0x1B, 0x70, 0x00, 0x19, 0xFA`)

- [ ] **Step 1: Write failing hardware tests in `apps/pos-terminal/src/__tests__/hardware.test.ts`**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement ESC/POS generator, barcode scanner listener, and drawer kicker**
- [ ] **Step 4: Verify tests pass (`pnpm --filter @ziro/pos test`)**
- [ ] **Step 5: Commit and push**

---

### Task 4: `apps/cloud-portal` — Ziro Cloud Multi-Tenant SaaS Portal

**Files:**
- Create: `apps/cloud-portal/package.json`, `apps/cloud-portal/tsconfig.json`, `apps/cloud-portal/next.config.ts`
- Create: `apps/cloud-portal/src/app/api/caddy/check-domain/route.ts`
- Create: `apps/cloud-portal/src/app/api/v1/tenants/provision/route.ts`
- Create: `apps/cloud-portal/src/lib/tenant-provisioner.ts`
- Create: `apps/cloud-portal/src/lib/subscription-billing.ts`
- Create: `apps/cloud-portal/src/app/page.tsx`
- Create: `docker/caddy/Caddyfile`
- Test: `apps/cloud-portal/src/__tests__/portal.test.ts`

**Interfaces:**
- Produces:
  - Caddy On-Demand TLS `check-domain` endpoint verifying active tenant custom domains
  - Self-service tenant provisioning with zero-GMV tax tier billing
  - Caddy reverse proxy config with automated SSL certificates

- [ ] **Step 1: Write failing portal tests in `apps/cloud-portal/src/__tests__/portal.test.ts`**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement Cloud Portal routes, provisioner, billing manager, and Caddyfile**
- [ ] **Step 4: Verify tests pass and run Next.js build (`pnpm --filter @ziro/cloud-portal test && pnpm --filter @ziro/cloud-portal build`)**
- [ ] **Step 5: Commit and push**

---

### Task 5: `@ziro/core` & `@ziro/pulse` — Merchant Catalog Studio & Agent Telemetry

**Files:**
- Create: `apps/commerce-engine/src/api/admin/bom/route.ts`
- Create: `apps/commerce-engine/src/api/admin/fitment/route.ts`
- Create: `apps/commerce-engine/src/api/admin/b2b/route.ts`
- Create: `apps/pulse-ai/app/routers/telemetry.py`
- Test: `apps/commerce-engine/src/__tests__/admin-routes.test.ts`
- Test: `apps/pulse-ai/tests/test_telemetry.py`

**Interfaces:**
- Produces:
  - Admin endpoints for visual BOM assembly, vehicle fitment CSV import, and B2B credit approval
  - Pulse AI telemetry router (`/v1/telemetry/agent-activity`) exposing real-time KYA agent activity, margin protection triggers, and conversion counts

- [ ] **Step 1: Write failing admin routes test and pytest telemetry test**
- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement admin endpoints in Medusa v2 and telemetry router in Pulse AI**
- [ ] **Step 4: Verify tests pass (`pnpm --filter @ziro/core test` and `pytest apps/pulse-ai/tests/test_telemetry.py`)**
- [ ] **Step 5: Commit and push**

---

### Task 6: `@ziro/storefront` — Payload CMS Visual Editorial Blocks & Live Logistics

**Files:**
- Create: `apps/storefront/src/blocks/HeroSlider.tsx`
- Create: `apps/storefront/src/blocks/FitmentWidget.tsx`
- Create: `apps/storefront/src/blocks/ConfiguratorShowcase.tsx`
- Create: `apps/storefront/src/blocks/index.ts`
- Create: `apps/storefront/src/lib/logistics-client.ts`
- Test: `apps/storefront/src/__tests__/blocks.test.ts`

**Interfaces:**
- Produces:
  - Reusable Payload CMS editorial blocks (Hero Slider, Vehicle Fitment selector, 3D Configurator showcase)
  - Logistics client checking live courier rates and e-Way bill consignment thresholds

- [ ] **Step 1: Write failing blocks & logistics client tests in `apps/storefront/src/__tests__/blocks.test.ts`**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement visual blocks and logistics client**
- [ ] **Step 4: Verify tests pass and run Next.js build (`pnpm --filter @ziro/storefront test && pnpm --filter @ziro/storefront build`)**
- [ ] **Step 5: Commit and push**

---

### Task 7: Full Monorepo Stage 2 Verification & Push

- [ ] **Step 1: Run complete typecheck across all workspaces (`pnpm typecheck`)**
- [ ] **Step 2: Run complete production build across all workspaces (`pnpm build`)**
- [ ] **Step 3: Run all Vitest and Pytest test suites (`pnpm test` and `pytest apps/pulse-ai/tests -v`)**
- [ ] **Step 4: Run license audit (`pnpm licenses list`)**
- [ ] **Step 5: Commit and push clean tree to `origin/feat/ziro-stage-2`**
