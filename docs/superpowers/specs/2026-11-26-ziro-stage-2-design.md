# Ziro Commerce OS (`ziro-commerce-os`) — Stage 2 Architectural Specification (`/spec`)

**Date:** 2026-11-26  
**Owner:** Hybrid StudioZ  
**Status:** Approved for Implementation  
**Target Branch:** `feat/ziro-stage-2`  
**Base Commit:** `183ad05` on `feat/ziro-phase-1`

---

## 1. Intent, Architecture & Stage 2 Scope

**Ziro** is Hybrid StudioZ's zero-GMV-tax (`ZIRO_PLATFORM_FEE_BPS = 0`) Commerce Operating System. In **Phase 1**, all 7 foundation workspaces were established, type-checked, and unit-tested with 100% test pass rates across TypeScript and Python.

**Stage 2** delivers the production multi-tenant SaaS layer, live database/cache event infrastructure, merchant catalog & B2B studio, and hardware-accelerated retail POS operations.

### Non-Negotiable Invariants
1. **0% GMV Platform Tax:** `ZIRO_PLATFORM_FEE_BPS = 0` across all gateways, UCP manifests, ACP tokens, and billing endpoints.
2. **Permissive Open-Source Licensing:** Strictly `MIT`, `Apache 2.0`, `BSD-3-Clause`, `PostgreSQL`, or `ISC`. Zero `GPL` / `AGPL`.
3. **Integer Minor Units:** All monetary amounts represented in non-negative integer minor units (`paise` / `cents`). Zero floating-point money math.
4. **Dual Tenancy Mode:** Clean runtime switching between single-tenant enterprise instances (`TENANCY_MODE=single`) and multi-tenant SaaS (`TENANCY_MODE=multi`).
5. **Deterministic Testing:** Local unit and integration tests must run without mandatory external cloud credentials or live network calls, using clean adapter interfaces and test doubles.

---

## 2. Four Pillars of Stage 2 Architecture

### Pillar 1: Ziro Cloud Multi-Tenant SaaS Portal (`apps/cloud-portal`)
- **Tenant Provisioning:** Self-service registration flow that allocates a unique `tenant_id`, subdomain slug (`<slug>.ziro.dev`), admin credentials, and default store/sales-channel IDs.
- **Custom Domain & Automated SSL:** Integration with Caddy On-Demand TLS (`ask` endpoint) or Cloudflare Custom Hostnames to verify custom domains (`parts.dealer.com`) against registered active tenants.
- **Flat-Tier Subscription Billing:** Implementation of flat subscription tiers (Starter, Growth, Enterprise) using Stripe / Razorpay Subscriptions with zero GMV transaction take-rate.
- **Tenant Control Center UI:** Next.js 16 App Router dashboard for SaaS admins to inspect active tenants, API key quotas, connected POS fleets, and billing statuses.

### Pillar 2: Live Relational & Event Infrastructure
- **Deterministic Production Catalog Seeds:** Rich catalog datasets representing real automotive, industrial, and retail commerce: 100+ SKUs with valid Mod-36 GSTINs, 6-digit HSN codes, multi-level BOM trees, and Year/Make/Model vehicle fitments.
- **Valkey Cart Reservation Lock Manager:** Distributed lock implementation (`Redlock` pattern) preventing inventory overselling during concurrent flash sales, POS counter billing, and AI shopping agent checkouts.
- **BullMQ Background Event Workers:** Asynchronous job queues for catalog embedding updates, e-Way bill submission payloads, and webhook event processing.
- **Meilisearch Live Sync & Faceting:** Real-time event subscriber indexing catalog updates with faceted filtering on vehicle Make/Model/Year, HSN slab, price range, and in-stock availability.
- **TimescaleDB Continuous Aggregates:** SQL hypertable views for real-time GMV velocity, cashier transaction rates, agent checkout conversion, and RTO risk distributions.

### Pillar 3: Merchant Operations & Catalog Studio (`apps/commerce-engine/src/admin`)
- **Visual BOM & Kit Assembly Editor:** UI for defining parent kits, setting stock modes (`VIRTUAL`, `HYBRID`, `PHYSICAL`), managing component consumption ratios, and assigning optional add-on prices.
- **Vehicle Fitment Matrix Studio:** Search and manage Year/Make/Model compatibility matrices; support bulk CSV/JSON import with validation.
- **B2B Wholesale Portal & Net-Terms Ledger:** Merchant UI for onboarding B2B corporate buyers, validating GSTIN tax credentials, setting Net-15/30/60 credit limits, and reviewing/approving wholesale quotes with one-click credit reservation.
- **KYA Agent Governance & Margin Monitor:** Live telemetry dashboard showing incoming autonomous buyer agents (Gemini, ChatGPT, WebMCP), verifying cryptographic signatures, and logging margin guardrail interventions.
- **POS Fleet & Offline Sync Manager:** Real-time status of connected counter terminals, conflict audit log for `FORCE_SALE_WITH_ALERT` instances, and manual catalog cache push triggers.

### Pillar 4: POS Hardware & Storefront Hardening
- **WebHID / WebUSB Thermal Receipt Printer Driver:** Raw ESC/POS print payload generator in `@ziro/pos` supporting 80mm and 58mm thermal printers with custom headers, GST tax breakup tables, and barcode/QR rendering without browser print dialogs.
- **Hardware Barcode Scanner HID Wedge Listener:** Keyboard wedge event listener with configurable inter-character timing buffers (15-30ms threshold) for instant item scanning in counter POS and warehouse audit modes.
- **Cash Drawer Kick Signal:** ESC/POS pulse generation (`ESC p m t1 t2`) for automated cash drawer triggers upon cash/split tenders.
- **Payload CMS v3 Visual Editorial Blocks:** Merchandising blocks in `apps/storefront`: Hero Motion Slider, 3D Configurator Showcase, Fitment Vehicle Finder Widget, Featured Collections Grid, and Editorial Lookbook.
- **Live Logistics & e-Way Bill Dispatch:** Live rate quote comparison for Shiprocket, Delhivery, and Shippo; automated generation and signing of NIC e-Way bill JSON payloads for consignments exceeding ₹50,000.

---

## 3. Monorepo Workspaces & Target Files

```
ziro-commerce-os/
├── apps/
│   ├── cloud-portal/                  # NEW in Stage 2: Ziro Cloud Multi-Tenant SaaS Portal
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── next.config.ts
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/...
│   │       │   ├── dashboard/...
│   │       │   └── api/caddy/check-domain/route.ts
│   │       └── lib/
│   │           ├── tenant-provisioner.ts
│   │           └── subscription-billing.ts
│   ├── commerce-engine/               # @ziro/core: Medusa v2 Admin Extensions & Seeders
│   │   └── src/
│   │       ├── admin/
│   │       │   ├── routes/bom/...
│   │       │   ├── routes/fitment/...
│   │       │   ├── routes/b2b/...
│   │       │   └── routes/kya/...
│   │       ├── jobs/
│   │       │   └── meili-sync.ts
│   │       ├── seeds/
│   │       │   └── catalog-seed.ts
│   │       └── lib/
│   │           └── valkey-cart-lock.ts
│   ├── pos-terminal/                  # @ziro/pos: Hardware & Scanner Integration
│   │   └── src/lib/
│   │       ├── escpos-printer.ts
│   │       ├── barcode-scanner.ts
│   │       └── cash-drawer.ts
│   ├── storefront/                    # @ziro/storefront: Payload CMS Blocks & Live Logistics
│   │   └── src/
│   │       ├── blocks/
│   │       │   ├── HeroSlider.tsx
│   │       │   ├── FitmentWidget.tsx
│   │       │   └── ConfiguratorShowcase.tsx
│   │       └── lib/
│   │           └── live-checkout.ts
│   └── pulse-ai/                      # @ziro/pulse: Enhanced Vector Sync & Telemetry
│       └── app/
│           ├── routers/telemetry.py
│           └── services/agent_monitor.py
├── packages/
│   ├── shared-types/                  # Schema additions for SaaS subscriptions, ESC/POS, telemetry
│   ├── ui-kit/                        # UI kit table, drawer, and chart components
│   └── ziro-rails/                    # Lock manager, ESC/POS generator, Courier integrations
└── docker/
    ├── caddy/
    │   └── Caddyfile                  # On-demand TLS reverse proxy configuration
    └── docker-compose.yml             # Added cloud-portal and caddy services
```

---

## 4. API Contracts Table (Stage 2 Extensions)

| Route / RPC | Method | Producer | Consumer | Payload / Response |
| :--- | :--- | :--- | :--- | :--- |
| `/api/caddy/check-domain` | `GET` | `cloud-portal` | Caddy TLS Engine | `?domain=foo.com` → `200 OK` (registered active tenant) or `404 Not Found` |
| `/api/v1/tenants/provision` | `POST` | `cloud-portal` | SaaS Frontend / CLI | `{ slug, name, admin_email, tier }` → `{ tenant_id, domain, api_key }` |
| `/api/v1/tenants/subscription` | `POST` | `cloud-portal` | Stripe / Razorpay | `{ tenant_id, plan_id, payment_method }` → `{ subscription_id, status }` |
| `/admin/b2b/accounts/:id/credit`| `PATCH` | `commerce-engine` | Admin UI / ERP | `{ credit_limit_minor, net_terms_days, status }` → `B2bAccount` |
| `/admin/bom/:parent_sku` | `PUT` | `commerce-engine` | Admin UI / ERP | `BomDefinitionRecord` with component ratios & optional pricing |
| `/admin/fitment/bulk-import` | `POST` | `commerce-engine` | Admin UI / CSV | `{ items: ProductFitment[] }` → `{ imported_count, errors: [] }` |
| `/v1/telemetry/agent-activity` | `GET` | `pulse-ai` | Admin UI | `?tenant_id=...` → List of KYA agent requests, margin events, and conversions |

---

## 5. Test Strategy & Verification Protocol
- **Unit & Domain Tests:** Pure TypeScript / Vitest test suites for ESC/POS byte generators, scanner HID parsers, Valkey lock acquisitions, and Caddy domain verification.
- **Python Telemetry Tests:** Pytest test suites verifying agent monitoring metrics and aggregate counters in `apps/pulse-ai`.
- **Next.js Production Builds:** Both `apps/cloud-portal`, `apps/storefront`, and `apps/pos-terminal` compile cleanly via `next build`.
- **Clean License Audit:** Run `pnpm licenses list` to guarantee all new packages conform to permissive licenses.
