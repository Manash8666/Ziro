# Ziro Commerce OS (`ziro-commerce-os`) — Architectural Design Specification (`/spec`)

**Date:** 2026-11-25  
**Owner:** Hybrid StudioZ  
**Status:** Ready for `/spec` Approval & `/plan` Handoff  
**Target Branch:** `feat/ziro-phase-1`

---

## 1. Intent, Product Identity & Why

**Ziro** (`ziro-commerce-os`) is Hybrid StudioZ's proprietary, zero-GMV-tax Commerce Operating System engineered for:
1. **0% GMV Platform Fee (`ZIRO_PLATFORM_FEE_BPS=0`)** — flat-tier multi-tenant SaaS (`Ziro Cloud`) or self-hosted Docker deployment with zero revenue-sharing tax.
2. **Zero-Downtime Offline POS (`@ziro/pos`)** — local-first IndexedDB (`Dexie.js`) + Serwist PWA counter billing and barcode warehouse auditing reconciling via idempotent delta queues with PostgreSQL 17.
3. **Zero-Middleware Agentic Commerce (`@ziro/pulse`)** — native **UCP** (`/.well-known/ucp`), **ACP** (`/api/agent/acp/v1/*`), and **WebMCP** (`/.well-known/webmcp.json`) endpoints protected by cryptographic **Know Your Agent (KYA)** verification and merchant margin guardrails.
4. **Native Complex Catalogs (`@ziro/rails` + `@ziro/3d`)** — relational Year/Make/Model fitment matrices, dynamic Bill-of-Materials (BOM) component stock deduction with optional 3D configurator add-ons, B2B wholesale price tiers + Net-30 credit ledgers, and interactive Three.js / React Three Fiber 3D configurators.
5. **Dual-Hemisphere Commerce Rails (`@ziro/rails`)** — India-native Razorpay/UPI Intent, multi-slab GST (`CGST + SGST` vs `IGST`), HSN lookup, B2B GSTIN validation, e-Way bills, AI COD-RTO Shield, and ONDC Beckn Seller-Node protocol + adapter alongside global Stripe multi-currency payments and VAT/DDP landed-cost calculation.

### Goals
- Build all **7** monorepo workspaces currently scaffolded on disk:
  - `packages/shared-types` (`@ziro/shared-types`)
  - `packages/ui-kit` (`@ziro/ui-kit`, including `@ziro/3d`)
  - `packages/ziro-rails` (`@ziro/rails`)
  - `apps/pulse-ai` (`@ziro/pulse`)
  - `apps/commerce-engine` (`@ziro/core`)
  - `apps/pos-terminal` (`@ziro/pos`)
  - `apps/storefront` (`@ziro/storefront`, including embedded Payload CMS v3, GSAP + Lenis, Zustand cart, R3F 3D configurator)
- Support **both** single-tenant dedicated deployments (`TENANCY_MODE=single`) and shared-database multi-tenant SaaS (`TENANCY_MODE=multi`) cleanly from one codebase.
- Deliver complete Docker Compose + multi-stage `Dockerfile.*` infrastructure configs, `.env.example`, and `.github/workflows/ci.yml`.
- Verify locally via `pnpm typecheck`, `pnpm build`, `vitest`, and `pytest` using clean repository/adapter interfaces with isolated in-memory doubles where Docker/Postgres/Valkey/Meilisearch are absent on the Windows host.

### Non-Goals (Phase 1)
- No live network calls to external payment, courier, NIC e-Way, or ONDC registry servers during automated tests (all gateways and ONDC adapters use official SDK/crypto signing + deterministic sandbox/test doubles).
- No multi-gigabyte forced weight downloads of `BAAI/bge-m3` during automated unit tests (handled via pluggable `EmbeddingProvider`).
- No live database migration execution on a host lacking Docker/PostgreSQL 17 (`db:migrate` scripts and SQL migrations are delivered and syntax/unit-tested, ready for Docker runtime).

### Anti-Goals
- **Zero `GPL` / `AGPL` dependencies** — only permissive OSI licenses (`MIT`, `Apache 2.0`, `BSD-3-Clause`, `ISC`, `PostgreSQL`).
- **Zero `TODO` stubs in critical paths** — payment signature checks, GST/DDP math, KYA HMAC/JWT validation, RTO scoring, BOM deduction, B2B credit rollback workflows, and POS delta-sync deduplication must be complete, deterministic, and tested.
- **Zero floating-point currency math** — all TypeScript money values use integer minor units (`paise` / `cents`); PostgreSQL money/ledger values use `BIGINT` minor units or `NUMERIC`.

---

## 2. Global Technical Constraints & Tooling Alignment

| Item | Specification |
| --- | --- |
| **Runtime & Package Manager** | Node.js `v25.9.0` (`engines: >=22.22.0`), `pnpm@12.15.0` (align root `packageManager`), Python `3.12+` (verified locally on `3.14.4`) |
| **TypeScript** | `5.7+`, `strict: true` across all TS packages; `zod@^4.6.7` aligned with `@medusajs/deps@2.23.0` |
| **Commerce Core** | `@medusajs/medusa@2.23.0`, `@medusajs/framework@2.23.0`, `@medusajs/workflows-sdk@2.23.0`, `meilisearch@0.63.0`, `razorpay@2.9.8`, `stripe@23.2.0` |
| **Web Apps & CMS** | `next@16.4.6`, `react@19.3.1`, `react-dom@19.3.1`, `tailwindcss@4.3.5`, `zustand@5.1.0`, `react-hook-form`, `@hookform/resolvers` |
| **CMS & Motion & 3D** | `payload@3.94.2`, `@payloadcms/next@3.94.2`, `@payloadcms/db-postgres@3.94.2`, `@payloadcms/richtext-lexical@3.94.2`, `gsap@3.15.1`, `lenis@1.3.28`, `three@0.187.0`, `@react-three/fiber@9.8.2`, `@react-three/drei@10.7.9` |
| **Offline POS** | `@serwist/next@9.6.0`, `serwist@9.6.0`, `dexie@4.4.7` (Next.js 16 Serwist build runs `next build --webpack`) |
| **Pulse AI** | `fastapi>=0.141`, `pydantic>=2.12`, `pydantic-settings>=2.16`, `asyncpg>=0.32`, `pgvector>=0.5`, `httpx>=0.27`, `python-jose>=3.5`, `numpy>=2.5`, `pytest>=8.3`, `pytest-asyncio>=1.0`, optional `[embeddings]` extra (`sentence-transformers`) |
| **Visual System** | Canvas `#090B0E`, Surface `#12161E`, Border `#1F2633`, Primary Mint `#00E599`, Operational Amber `#F59E0B`, Text `#F4F6F9`; `Plus Jakarta Sans` + `JetBrains Mono` (`tabular-nums`) |

---

## 3. Exact Monorepo File Tree

```text
ziro-commerce-os/
├── .env.example
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── turbo.json
├── .github/
│   └── workflows/
│       └── ci.yml
├── docker/
│   ├── docker-compose.yml
│   ├── Dockerfile.engine
│   ├── Dockerfile.pulse
│   ├── Dockerfile.web
│   └── postgres/
│       ├── init-extensions.sql
│       └── 001_ziro_extensions.sql
├── docs/
│   └── superpowers/
│       ├── specs/
│       │   └── 2026-11-25-ziro-commerce-os-design.md
│       └── plans/
├── packages/
│   ├── shared-types/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── index.ts
│   │       ├── schemas/
│   │       │   ├── commerce.ts        # Money, Product, Fitment, BOM, B2B, POS Sync, Tenant schemas
│   │       │   └── index.ts
│   │       ├── gst/
│   │       │   ├── calculator.ts      # State codes, GSTIN checksum, HSN registry, CGST/SGST/IGST, e-Way, DDP
│   │       │   └── index.ts
│   │       └── agent/
│   │           ├── contracts.ts       # UCP, ACP, WebMCP, KYA claims, RTO Shield, ONDC Beckn schemas
│   │           └── index.ts
│   ├── ui-kit/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── index.ts
│   │       ├── tokens.css             # Dark Architectural Precision Tailwind v4 @theme tokens
│   │       ├── components/
│   │       │   ├── ZiroWordmark.tsx   # Slashed-zero precision geometric logo SVG
│   │       │   ├── StatusBadge.tsx    # Live sync (#00E599), Offline queue (#F59E0B), 0% GMV
│   │       │   ├── MetricCard.tsx
│   │       │   ├── MonoCell.tsx       # tabular-nums SKU/HSN/GSTIN/Currency display
│   │       │   └── ZiroButton.tsx
│   │       └── 3d/
│   │           ├── index.ts
│   │           └── ProductConfigurator3D.tsx  # R3F interactive material/BOM configurator + WebGL fallback
│   └── ziro-rails/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       └── src/
│           ├── index.ts
│           ├── tenancy/
│           │   ├── tenant-context.ts  # Dual-mode (single & multi-tenant) resolver + gateway secret lookup
│           │   └── index.ts
│           ├── providers/
│           │   ├── razorpay-provider.ts
│           │   ├── stripe-provider.ts
│           │   ├── net30-provider.ts  # Medusa AbstractPaymentProvider for B2B Net-30 credit ledger
│           │   ├── webhook-verifier.ts
│           │   └── index.ts
│           ├── tax/
│           │   ├── ziro-tax-provider.ts
│           │   └── index.ts
│           ├── fitment/
│           │   ├── fitment-bom.service.ts
│           │   └── index.ts
│           ├── b2b/
│           │   ├── b2b-wholesale.service.ts
│           │   ├── quote-approval.workflow.ts
│           │   └── index.ts
│           └── logistics/
│               ├── fulfillment.adapters.ts    # Shiprocket, Delhivery, Shippo
│               ├── ondc-adapter.ts            # Beckn catalog/order translator + Ed25519 BLAKE-512 signer
│               └── index.ts
├── apps/
│   ├── pulse-ai/
│   │   ├── pyproject.toml
│   │   ├── app/
│   │   │   ├── __init__.py
│   │   │   ├── main.py
│   │   │   ├── config.py
│   │   │   ├── db.py                  # asyncpg + pgvector pool + InMemoryPulseRepository
│   │   │   ├── models/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── agent.py           # UCP, ACP, WebMCP, KYA Pydantic models
│   │   │   │   ├── rto.py             # COD-RTO Shield models
│   │   │   │   └── search.py          # Embedding & semantic search models
│   │   │   ├── services/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── commerce_client.py # Delegated @ziro/core HTTP client + InMemory test adapter
│   │   │   │   ├── embeddings.py      # Pluggable EmbeddingProvider (bge-m3, remote, local_hash)
│   │   │   │   ├── kya.py             # HMAC/JWT KYA verification & gross-margin / discount guardrail
│   │   │   │   ├── rto_scorer.py      # AI COD-RTO Shield scoring & UPI nudge engine
│   │   │   │   └── acp_service.py     # ACP checkout session state machine
│   │   │   └── routers/
│   │   │       ├── __init__.py
│   │   │       ├── health.py
│   │   │       ├── agent.py           # /.well-known/ucp, /.well-known/webmcp.json, /api/agent/acp/v1/*
│   │   │       ├── rto.py             # /v1/rto/score
│   │   │       └── search.py          # /v1/embeddings/index, /v1/search/semantic
│   │   └── tests/
│   │       ├── conftest.py
│   │       ├── test_rto.py
│   │       ├── test_ucp_acp_kya.py
│   │       └── test_search.py
│   ├── commerce-engine/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   ├── medusa-config.ts
│   │   └── src/
│   │       ├── index.ts
│   │       ├── services/
│   │       │   ├── pos-sync.service.ts        # Idempotent delta-sync, optimistic concurrency & conflict modes
│   │       │   ├── catalog-index.service.ts   # Meilisearch + Pulse AI vector sync
│   │       │   └── engine-container.ts        # Shared singleton/DI container for routes & tests
│   │       ├── subscribers/
│   │       │   └── product-mutated.ts         # Medusa subscriber for real-time Meilisearch/Pulse sync
│   │       └── api/
│   │           ├── health/route.ts
│   │           ├── internal/acp/
│   │           │   ├── price-and-reserve/route.ts
│   │           │   └── complete-order/route.ts
│   │           ├── ondc/
│   │           │   ├── search/route.ts
│   │           │   ├── select/route.ts
│   │           │   ├── init/route.ts
│   │           │   ├── confirm/route.ts
│   │           │   ├── status/route.ts
│   │           │   └── cancel/route.ts
│   │           ├── webhooks/
│   │           │   ├── razorpay/route.ts
│   │           │   ├── stripe/route.ts
│   │           │   └── [provider]/[tenantId]/route.ts
│   │           └── store/
│   │               ├── pos/
│   │               │   ├── catalog/route.ts   # Dexie catalog + per-(location,sku) version pull
│   │               │   └── sync/route.ts      # Batch delta-sync endpoint
│   │               ├── fitment/search/route.ts
│   │               ├── bom/resolve/route.ts
│   │               └── b2b/
│   │                   ├── quotes/route.ts
│   │                   └── quotes/[id]/approve/route.ts
│   ├── pos-terminal/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── next.config.ts
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── lib/
│   │       │   ├── db.ts              # Dexie.js IndexedDB schema (catalog, cart, mutationQueue, conflicts)
│   │       │   └── sync-engine.ts     # Delta-sync worker, offline queuing, conflict resolution queue
│   │       └── app/
│   │           ├── globals.css
│   │           ├── layout.tsx
│   │           ├── manifest.ts
│   │           ├── sw.ts              # Serwist offline PWA service worker
│   │           ├── page.tsx           # Counter POS (barcode input, GST receipt, queue & conflict drawer)
│   │           ├── warehouse/page.tsx # Barcode stock audit scanner
│   │           └── b2b/page.tsx       # Bulk CSV / SKU quick-order grid
│   └── storefront/
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.ts
│       ├── vitest.config.ts
│       └── src/
│           ├── payload.config.ts      # Embedded Payload CMS v3 sharing Postgres 17 (schema: "payload", tenantId scoped)
│           ├── collections/
│           │   ├── Pages.ts
│           │   └── Media.ts
│           ├── store/
│           │   └── cart.ts            # Zustand persistent storefront cart + BOM options + GSTIN/B2B state
│           ├── components/
│           │   ├── SmoothScroll.tsx   # Lenis + GSAP ScrollTrigger wrapper
│           │   ├── FitmentFinder.tsx  # Year/Make/Model compatibility filter
│           │   └── CheckoutForm.tsx   # React Hook Form + Zod + COD-RTO Shield UPI nudge
│           └── app/
│               ├── globals.css
│               ├── layout.tsx
│               ├── page.tsx           # Editorial SSR/ISR storefront powered by Payload + Ziro Core
│               ├── configure/page.tsx # Interactive 3D configurator (@ziro/3d)
│               ├── checkout/page.tsx
│               └── (payload)/
│                   └── admin/[[...segments]]/page.tsx
```

---

## 4. Database Schema Extensions (`docker/postgres/001_ziro_extensions.sql`)

All custom tables follow strict PostgreSQL 17 conventions: `snake_case`, `TIMESTAMPTZ`, `BIGINT` minor units (`paise`/`cents`) or `NUMERIC`, `TEXT + CHECK` constraints, explicit FK indexes, `GIN` for `JSONB`, `vector(1024)` for `BAAI/bge-m3`, and **TimescaleDB** hypertables for append-only telemetry.

1. **Tenancy & Gateway Isolation**
   - `tenants`: `tenant_id TEXT PRIMARY KEY`, `slug TEXT NOT NULL UNIQUE`, `primary_domain TEXT UNIQUE`, `medusa_store_id TEXT NOT NULL`, `medusa_sales_channel_id TEXT NOT NULL`, `pos_conflict_policy TEXT NOT NULL DEFAULT 'FORCE_SALE_WITH_ALERT' CHECK (pos_conflict_policy IN ('FORCE_SALE_WITH_ALERT','STRICT_REJECT'))`, `origin_state_code TEXT NOT NULL DEFAULT '27'`, `min_margin_bps INTEGER NOT NULL DEFAULT 1500`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - `tenant_gateway_configs`: `config_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`, `tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE`, `provider TEXT NOT NULL CHECK (provider IN ('razorpay','stripe','ondc'))`, `key_id TEXT NOT NULL`, `secret_ciphertext TEXT NOT NULL`, `webhook_secret_ciphertext TEXT NOT NULL`, `is_active BOOLEAN NOT NULL DEFAULT TRUE`, `UNIQUE (tenant_id, provider)`
   - `webhook_events`: `event_pk BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`, `tenant_id TEXT NOT NULL`, `provider TEXT NOT NULL`, `external_event_id TEXT NOT NULL`, `payload_hash TEXT NOT NULL`, `processed_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `UNIQUE (tenant_id, provider, external_event_id)`
2. **Fitment & Compatibility**
   - `fitment_vehicles`: `vehicle_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`, `tenant_id TEXT NOT NULL`, `make TEXT NOT NULL`, `model TEXT NOT NULL`, `year_from INTEGER NOT NULL CHECK (year_from >= 1950)`, `year_to INTEGER NOT NULL CHECK (year_to >= year_from)`, `variant TEXT NOT NULL DEFAULT ''`, `fuel_type TEXT NOT NULL DEFAULT ''`, `metadata JSONB NOT NULL DEFAULT '{}'`, `UNIQUE (tenant_id, make, model, year_from, year_to, variant)`
   - `product_fitments`: `fitment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`, `tenant_id TEXT NOT NULL`, `product_id TEXT NOT NULL`, `sku TEXT NOT NULL`, `vehicle_id BIGINT NOT NULL REFERENCES fitment_vehicles(vehicle_id) ON DELETE CASCADE`, `position TEXT NOT NULL DEFAULT 'universal'`, `notes TEXT NOT NULL DEFAULT ''`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `UNIQUE (tenant_id, sku, vehicle_id, position)` (indexed on `(vehicle_id)` and `(tenant_id, sku)`)
3. **Bill-of-Materials (BOM) & SKU Economics**
   - `sku_economics`: `tenant_id TEXT NOT NULL`, `sku TEXT NOT NULL`, `title TEXT NOT NULL`, `hsn_code TEXT NOT NULL DEFAULT '8708'`, `gst_slab_bps INTEGER NOT NULL DEFAULT 1800`, `unit_price_minor BIGINT NOT NULL CHECK (unit_price_minor >= 0)`, `cogs_minor BIGINT CHECK (cogs_minor >= 0)`, `min_margin_bps INTEGER`, `currency_code TEXT NOT NULL DEFAULT 'INR'`, `PRIMARY KEY (tenant_id, sku)`
   - `bom_bundles`: `bundle_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`, `tenant_id TEXT NOT NULL`, `parent_sku TEXT NOT NULL`, `name TEXT NOT NULL`, `stock_mode TEXT NOT NULL DEFAULT 'VIRTUAL' CHECK (stock_mode IN ('VIRTUAL','HYBRID','PHYSICAL'))`, `is_active BOOLEAN NOT NULL DEFAULT TRUE`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `UNIQUE (tenant_id, parent_sku)`
   - `bom_components`: `component_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`, `bundle_id BIGINT NOT NULL REFERENCES bom_bundles(bundle_id) ON DELETE CASCADE`, `child_sku TEXT NOT NULL`, `qty_per_unit INTEGER NOT NULL CHECK (qty_per_unit > 0)`, `is_optional BOOLEAN NOT NULL DEFAULT FALSE`, `price_delta_minor BIGINT NOT NULL DEFAULT 0`, `option_group TEXT NOT NULL DEFAULT 'core'` (indexed on `(bundle_id)` and `(child_sku)`)
4. **B2B Wholesale & Credit Ledger**
   - `b2b_accounts`: `account_id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`, `tenant_id TEXT NOT NULL`, `company_name TEXT NOT NULL`, `tax_id TEXT NOT NULL`, `tax_id_type TEXT NOT NULL CHECK (tax_id_type IN ('GSTIN','EIN','VAT'))`, `credit_limit_minor BIGINT NOT NULL CHECK (credit_limit_minor >= 0)`, `credit_used_minor BIGINT NOT NULL DEFAULT 0 CHECK (credit_used_minor >= 0)`, `net_terms_days INTEGER NOT NULL DEFAULT 30 CHECK (net_terms_days >= 0)`, `status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ON_HOLD','SUSPENDED'))`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `UNIQUE (tenant_id, tax_id)`
   - `b2b_price_tiers`: `tier_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`, `tenant_id TEXT NOT NULL`, `customer_group TEXT NOT NULL`, `sku TEXT NOT NULL`, `min_qty INTEGER NOT NULL CHECK (min_qty >= 1)`, `unit_price_minor BIGINT NOT NULL CHECK (unit_price_minor >= 0)`, `currency_code TEXT NOT NULL DEFAULT 'INR'`
   - `b2b_credit_ledger`: `entry_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`, `account_id UUID NOT NULL REFERENCES b2b_accounts(account_id) ON DELETE RESTRICT`, `reference_id TEXT NOT NULL`, `entry_type TEXT NOT NULL CHECK (entry_type IN ('RESERVE','DEBIT','RELEASE','PAYMENT'))`, `amount_minor BIGINT NOT NULL CHECK (amount_minor > 0)`, `occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `UNIQUE (account_id, reference_id, entry_type)`
   - `b2b_quotes` & `b2b_quote_items`: quote header (`DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `ROLLED_BACK`) + line items with FK indexes.
5. **Inventory Versioning, Offline POS Sync & Discrepancy Telemetry**
   - `inventory_balances`: `tenant_id TEXT NOT NULL`, `location_id TEXT NOT NULL`, `sku TEXT NOT NULL`, `on_hand INTEGER NOT NULL`, `reserved INTEGER NOT NULL DEFAULT 0`, `version BIGINT NOT NULL DEFAULT 1`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `PRIMARY KEY (tenant_id, location_id, sku)`
   - `pos_sync_mutations`: `mutation_pk BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`, `tenant_id TEXT NOT NULL`, `location_id TEXT NOT NULL`, `device_id TEXT NOT NULL`, `client_mutation_id UUID NOT NULL`, `mutation_type TEXT NOT NULL CHECK (mutation_type IN ('POS_SALE','STOCK_AUDIT','RETURN'))`, `expected_version BIGINT NOT NULL`, `status TEXT NOT NULL CHECK (status IN ('APPLIED','APPLIED_WITH_ALERT','DUPLICATE','CONFLICT'))`, `payload JSONB NOT NULL`, `reconciled_deltas JSONB NOT NULL DEFAULT '[]'`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `UNIQUE (tenant_id, device_id, client_mutation_id)`
   - `pos_reconciliation_alerts`: `alert_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`, `tenant_id TEXT NOT NULL`, `location_id TEXT NOT NULL`, `sku TEXT NOT NULL`, `device_id TEXT NOT NULL`, `client_mutation_id UUID NOT NULL`, `expected_version BIGINT NOT NULL`, `actual_version BIGINT NOT NULL`, `balance_after INTEGER NOT NULL`, `resolved BOOLEAN NOT NULL DEFAULT FALSE`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - `inventory_ledger_events`: `occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `tenant_id TEXT NOT NULL`, `sku TEXT NOT NULL`, `location_id TEXT NOT NULL`, `delta INTEGER NOT NULL`, `balance_after INTEGER NOT NULL`, `source TEXT NOT NULL CHECK (source IN ('ONLINE','POS','B2B','BOM_COMPONENT','ADJUSTMENT','ACP'))`, `reference_id TEXT NOT NULL` — converted via `SELECT create_hypertable('inventory_ledger_events', 'occurred_at', if_not_exists => TRUE);`.
6. **Agentic Commerce (KYA, ACP, Semantic Search, RTO Shield)**
   - `kya_agents`: `agent_id TEXT PRIMARY KEY`, `tenant_id TEXT NOT NULL`, `name TEXT NOT NULL`, `hmac_secret_hash TEXT NOT NULL`, `allowed_protocols TEXT[] NOT NULL DEFAULT ARRAY['UCP','ACP','WEBMCP']`, `max_discount_bps INTEGER NOT NULL DEFAULT 500`, `status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REVOKED'))`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - `acp_checkout_sessions`: `session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`, `tenant_id TEXT NOT NULL`, `agent_id TEXT NOT NULL`, `currency TEXT NOT NULL`, `line_items JSONB NOT NULL`, `subtotal_minor BIGINT NOT NULL`, `discount_minor BIGINT NOT NULL`, `tax_minor BIGINT NOT NULL`, `total_minor BIGINT NOT NULL`, `status TEXT NOT NULL CHECK (status IN ('OPEN','COMPLETED','EXPIRED','CANCELLED'))`, `external_order_id TEXT`, `idempotency_key TEXT`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - `catalog_embeddings`: `product_id TEXT NOT NULL`, `tenant_id TEXT NOT NULL`, `title TEXT NOT NULL`, `description TEXT NOT NULL`, `metadata JSONB NOT NULL DEFAULT '{}'`, `content_hash TEXT NOT NULL`, `embedding vector(1024) NOT NULL`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `PRIMARY KEY (tenant_id, product_id)` + `USING hnsw (embedding vector_cosine_ops)`
   - `rto_assessments`: `assessment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`, `tenant_id TEXT NOT NULL`, `pincode TEXT NOT NULL`, `cart_value_minor BIGINT NOT NULL`, `risk_score NUMERIC(4,3) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1)`, `risk_tier TEXT NOT NULL CHECK (risk_tier IN ('LOW','MEDIUM','HIGH'))`, `upi_nudge_discount_inr INTEGER NOT NULL DEFAULT 0`, `signals JSONB NOT NULL`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - `agent_audit_log`: `audit_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`, `tenant_id TEXT NOT NULL`, `agent_id TEXT NOT NULL`, `protocol TEXT NOT NULL CHECK (protocol IN ('UCP','ACP','WEBMCP'))`, `action TEXT NOT NULL`, `allowed BOOLEAN NOT NULL`, `reason TEXT NOT NULL DEFAULT ''`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
7. **Payload CMS v3 Isolation**: Payload configures `schemaName: 'payload'` in `@payloadcms/db-postgres` and tags `Pages` & `Media` with `tenantId` + read/write access hooks so multi-tenant SaaS & single-tenant deployments stay isolated cleanly.

---

## 5. API Contract Table

| Service | Method & Path | Auth / Security | Request Contract | Response / Side Effect |
| --- | --- | --- | --- | --- |
| `@ziro/core` | `GET /health` | Public | — | `{ status: "ok", service: "ziro-core", platform_fee_bps: 0, tenancy_mode }` |
| `@ziro/core` | `GET /store/pos/catalog` | Store / POS + TenantContext | `?location_id=&since_version=` | Catalog SKUs, prices, HSN/GST slabs, BOM recipes, and per-`(location_id, sku)` `version` & `on_hand` |
| `@ziro/core` | `POST /store/pos/sync` | Store / POS + TenantContext | `{ location_id, device_id, conflict_policy?, mutations: [{ client_mutation_id, mutation_type, audit_mode?, timestamp, expected_version, line_items, payment_method }] }` | Idempotent batch apply; handles `FORCE_SALE_WITH_ALERT` vs `STRICT_REJECT`; returns `{ results, current_inventory }` |
| `@ziro/core` | `GET /store/fitment/search` | Public + TenantContext | `?make=&model=&year=&variant=` | Matching vehicles + compatible SKUs + stock levels scoped by resolved tenant |
| `@ziro/core` | `POST /store/bom/resolve` | Public + TenantContext | `{ items: [{ sku, qty, selected_optional_skus?, material_variant? }] }` | Resolved child component SKUs, optional price deltas, virtual/hybrid availability, cycle-checked deductions |
| `@ziro/core` | `POST /store/b2b/quotes` | B2B Auth + TenantContext | `{ account_id, items: [{ sku, qty }] }` | Draft/submitted B2B quote with volume-tier pricing & GST breakup |
| `@ziro/core` | `POST /store/b2b/quotes/:id/approve` | Merchant Admin or B2B Company Approver | `{ approver_id, approver_role }` | Executes rollback-safe `@medusajs/workflows-sdk` DAG (`RESERVE` credit → BOM/SKU allocate → `ziro-net30` order emit + `DEBIT`; compensates on failure) |
| `@ziro/core` | `POST /internal/acp/price-and-reserve` | `X-Ziro-Internal-Secret` | `{ tenant_id, line_items, currency, requested_discount_bps, shipping_address }` | Authoritative unit price, COGS, GST/DDP breakup, margin check data, and short-TTL reservation |
| `@ziro/core` | `POST /internal/acp/complete-order` | `X-Ziro-Internal-Secret` | `{ tenant_id, session_id, line_items, payment_token, idempotency_key }` | Captures/verifies delegated payment token, finalizes stock deduction, emits order ID |
| `@ziro/core` | `POST /ondc/{search,select,init,confirm,status,cancel}` | Beckn `Authorization` (Ed25519 BLAKE-512) | Beckn `context` + `message` | Translates via `OndcSellerAdapter`, emits synchronous ACK and async `on_*` callback dispatch |
| `@ziro/core` | `POST /webhooks/razorpay`, `POST /webhooks/stripe`, `POST /webhooks/:provider/:tenantId` | HMAC raw-body verification | Raw webhook bytes | Constant-time signature verification (`.env` secret in single mode, per-tenant secret in multi mode) + `webhook_events` dedup + `200` fast ack |
| `@ziro/pulse` | `GET /health` | Public | — | `{ status: "ok", service: "ziro-pulse", embedding_provider, pgvector_ready }` |
| `@ziro/pulse` | `GET /.well-known/ucp` | Public | — | UCP v1 discovery manifest (`capabilities`, `kya_required`, `acp_base_url`, `webmcp_manifest_url`, `platform_fee_bps: 0`) |
| `@ziro/pulse` | `GET /.well-known/webmcp.json` | Public | — | WebMCP tool descriptors (`search_catalog`, `check_fitment`, `score_cod_rto`, `create_acp_checkout`) |
| `@ziro/pulse` | `POST /api/agent/acp/v1/checkout-sessions` | **KYA** (`X-Ziro-Agent-Id`, `X-Ziro-Timestamp`, `X-Ziro-Agent-Signature` or Bearer JWT) | `{ tenant_id, line_items, currency, requested_discount_bps, shipping_address }` | Verifies KYA signature + replay window, fetches `@ziro/core` pricing/COGS/tax, enforces `min_margin_bps` (`403` on violation), stores session |
| `@ziro/pulse` | `GET /api/agent/acp/v1/checkout-sessions/{id}` | **KYA** | — | Returns current session totals, tax/DDP estimate, and status |
| `@ziro/pulse` | `POST /api/agent/acp/v1/checkout-sessions/{id}/complete` | **KYA** | `{ payment_token, idempotency_key }` | Delegates idempotent capture + order creation to `@ziro/core`, returns order reference |
| `@ziro/pulse` | `POST /v1/rto/score` | Service / Store | `{ tenant_id, pincode, cart_value_inr, cod_orders_count, rto_history_count, address_score, velocity_1h }` | Returns `{ risk_score, risk_tier, upi_nudge_discount_inr, recommended_payment_modes, factors }` |
| `@ziro/pulse` | `POST /v1/embeddings/index` & `POST /v1/search/semantic` | Service / Public | Index batch / semantic query | Computes 1024-dim embeddings & executes `pgvector` cosine search (with in-memory cosine fallback) |

---

## 6. Calls Made During Spec Authoring (For User Review)

1. **Dual-Mode Tenancy (`TENANCY_MODE=single | multi`):** `TenantContextResolver` supports both zero-config single-tenant `.env` gateway secrets (`/webhooks/:provider`) and multi-tenant SaaS resolution (`Host`/JWT/`X-Ziro-Tenant-Id`, Payload `tenantId` scoping, and `/webhooks/:provider/:tenantId`) without altering core domain contracts.
2. **Configurable POS Conflict Policy + Conflict Queue UI:** `pos-sync.service.ts` supports both `FORCE_SALE_WITH_ALERT` (default: counter sales apply with `pos_reconciliation_alerts`) and `STRICT_REJECT` (returns `CONFLICT` with server version/balance), paired with a conflict-resolution drawer in `@ziro/pos` and `GET /store/pos/catalog` for initial & incremental Dexie hydration.
3. **ACP ↔ Core Delegation Seam:** `@ziro/pulse` owns UCP/ACP/WebMCP discovery, KYA verification, margin guardrails, and session orchestration while delegating authoritative pricing, COGS, GST/DDP math, payment capture, and order emission to `@ziro/core` via `CommerceBackendClient` (`HttpCommerceClient` in prod, `InMemoryCommerceClient` in isolated tests).
4. **KYA Signing & Gross Margin Basis:** `kya.py` verifies canonical HMAC-SHA256 headers (`X-Ziro-Agent-Id`, `X-Ziro-Timestamp`, `X-Ziro-Agent-Signature` with 300s replay window) or HS256 JWT tokens, and evaluates gross margin `(net_price - cogs_minor) / net_price >= min_margin_bps` (falling back to `agent.max_discount_bps` when SKU COGS is unset).
5. **ONDC Adapter + Beckn Endpoints:** `packages/ziro-rails/src/logistics/ondc-adapter.ts` implements Beckn translation and Ed25519/BLAKE-512 header crypto, exposed through `apps/commerce-engine/src/api/ondc/*` routes with async `on_*` callback dispatch.
6. **BOM Optional Add-ons & Virtual/Hybrid Stock:** `bom_components` includes `price_delta_minor` & `option_group` for `@ziro/3d` optional selections; cyclic BOMs are rejected; `VIRTUAL` calculates stock from minimum child availability while `HYBRID` adds pre-assembled parent inventory.
7. **B2B Net-30 Dual-Approver Workflow:** Quote approval accepts `MERCHANT_ADMIN` or `B2B_COMPANY_APPROVER`, reserves credit in `b2b_credit_ledger`, allocates BOM/SKU inventory, and emits orders through a `ziro-net30` `AbstractPaymentProvider` inside a rollback-safe `@medusajs/workflows-sdk` workflow.
8. **Deterministic Offline GST/e-Way & Cross-Border DDP Corridors:** `@ziro/shared-types` includes 38 Indian state/UT codes, Mod-36 GSTIN checksum validation, a curated HSN slab table, NIC e-Way Bill JSON builder (`>= ₹50,000` inter-state), and a configurable multi-corridor VAT/DDP duty rule table (`US`, `GB`, `EU`, `AE`, `SG`, `AU`, `CA`) behind `DutyTariffProvider`.
9. **Toolchain & Packaging Alignments:** Standardized on `zod@^4.6.7`, `@medusajs/*@2.23.0`, `next@16.4.6`, `react@19.3.1`, `@payloadcms/*@3.94.2` (`schemaName: "payload"`), `@serwist/next@9.6.0` (`next build --webpack`), `pnpm@12.15.0`, and pluggable `EmbeddingProvider` (`bge-m3` + `remote_http` + deterministic `local_hash` fallback + optional `[embeddings]` extra).
