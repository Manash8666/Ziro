# Ziro Commerce OS

> **The Zero-Tax Commerce Operating System for D2C Brands, B2B Wholesale & Offline Retail.**  
> One unified ledger for your online storefront, counter POS, warehouse barcode scanners, and autonomous AI shopping agents — with **0% GMV fee**.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform Tax](https://img.shields.io/badge/Platform%20Fee-0%25%20GMV-00E599.svg)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-v2-EF4444.svg)](https://turbo.build/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![Medusa.js](https://img.shields.io/badge/Medusa.js-v2-8B5CF6.svg)](https://medusajs.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688.svg)](https://fastapi.tiangolo.com/)

---

## The Four Architectural Moats

| Moat | Capability | Implementation |
| :--- | :--- | :--- |
| **1. 0% GMV Platform Fee** | Zero transaction revenue-share tax (`ZIRO_PLATFORM_FEE_BPS = 0`). Transparent flat hosting or self-hosted freedom. | `@ziro/shared-types`, `@ziro/rails`, `apps/cloud-portal` |
| **2. Protocol-Native Agentic Commerce** | Autonomous buyer agent discovery, KYA cryptographic verification, margin guardrails, and tokenized checkout. | `apps/pulse-ai` (UCP, ACP & WebMCP) |
| **3. Local-First POS & Warehouse Sync** | Zero-downtime counter billing and barcode stock audits. Works completely offline with automatic delta sync. | `apps/pos-terminal` (Dexie.js / IndexedDB + Serwist PWA) |
| **4. Dual-Hemisphere Financials & Logistics** | India GST 38+1 slabs, automated e-Way bills, UPI Intent, Delhivery/Shiprocket alongside Stripe, multi-currency & global DDP. | `@ziro/rails` |

---

## Monorepo Architecture

The entire platform lives inside a single **Turborepo** workspace so storefronts, offline POS clients, cloud portals, and shared Zod schemas remain strictly typed and versioned together:

```text
ziro-commerce-os/
├── apps/
│   ├── storefront/          # Next.js 16 App Router + Tailwind v4 + Three.js 3D + Semantic Fitment Search
│   ├── pos-terminal/        # Offline-first Serwist PWA + Dexie IndexedDB + Sub-30ms HID Scanner + ESC/POS WebSerial
│   ├── cloud-portal/        # Next.js 16 Multi-Tenant SaaS Portal + Shopify Polaris Admin Shell + Automated Billing
│   ├── commerce-engine/     # Ziro Core (Medusa.js v2) + PostgreSQL 17 RLS + POS Sync & Double-Entry Accounting
│   └── pulse-ai/            # Ziro Pulse (FastAPI: 1024-dim BAAI/bge-m3 pgvector, TimescaleDB Telemetry, UCP/ACP)
├── packages/
│   ├── migrator/            # 1-Click Shopify CSV & WooCommerce REST catalog importer with HSN/GST inference
│   ├── shared-types/        # Shared Zod schemas, TypeScript interfaces, GST 38+1 & DDP calculators
│   ├── ui-kit/              # Dark Precision design tokens, Programmatic SVGs, ZiroNavigationHeader, 3D Studio
│   └── ziro-rails/          # Multi-tenant resolver, Valkey cart locks, Razorpay, Stripe, ONDC adapters
├── docker/
│   ├── caddy/Caddyfile      # Hardened On-Demand TLS with shared secret gate & strict security headers
│   ├── postgres/            # PostgreSQL 17 RLS policies, vector tables & Stage 5 migrations (01 through 08)
│   ├── Dockerfile.engine    # Multi-stage production container for Commerce Engine
│   ├── Dockerfile.pulse     # Multi-stage container for Python 3.12 FastAPI Pulse AI
│   ├── Dockerfile.web       # Multi-stage container for Next.js 16 web applications
│   └── docker-compose.prod.yml # Production 9-service stack with isolated internal data network
├── scripts/
│   ├── bootstrap-vps.sh     # Idempotent Ubuntu 22.04/24.04 VPS provisioning with zero-trust UFW firewall
│   ├── seed-public-sandbox.ts # Deterministic public sandbox tenants seeder & 0% fee verification
│   ├── backup-pg-r2.sh      # Encrypted zstd AES-256-CBC backup to Cloudflare R2 with SHA-256 integrity
│   └── verify-webhooks-and-hil.ts # Hardware-in-the-Loop (ESC/POS, HID burst) & HMAC webhook replay
└── tests/
    └── load/                # k6 400-VU flash-sale race condition & 100-VU POS delta-sync stress suite
```

---

## Getting Started

### Prerequisites

- **Node.js**: `>= 22.22.0`
- **pnpm**: `>= 12.15.0`
- **Python**: `>= 3.11` (for `pulse-ai`)
- **Docker & Docker Compose**

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Manash8666/Ziro.git
cd Ziro/ziro-commerce-os
pnpm install
```

### 2. Start Infrastructure (PostgreSQL 17, Valkey, Meilisearch)

```bash
docker compose up -d
```

### 3. Build All Packages & Applications

```bash
pnpm build
```

### 4. Run Development Servers

```bash
pnpm dev
```

- **Storefront:** [http://localhost:3000](http://localhost:3000)
- **POS Terminal:** [http://localhost:3001](http://localhost:3001)
- **Merchant Admin Shell:** [http://localhost:3002/admin](http://localhost:3002/admin)
- **SaaS Billing Portal:** [http://localhost:3002/billing](http://localhost:3002/billing)
- **Commerce Engine (Medusa v2):** [http://localhost:9000](http://localhost:9000)
- **Pulse AI Service:** [http://localhost:8000](http://localhost:8000)

---

## Verification & Testing

Ziro enforces test-driven development (TDD) across all packages with isolated unit and integration suites:

```bash
# Run all TypeScript / React test suites (172+ tests across 37 files)
pnpm test

# Run Python AI test suite (17 tests: TimescaleDB Telemetry, 1024-dim BAAI/bge-m3 embeddings, RTO, KYA, UCP, ACP)
python -m pytest apps/pulse-ai/tests -v

# Run Hardware-in-the-Loop & Signed Webhook Verification (9/9 assertions)
pnpm verify:hil

# Verify public sandbox tenants & 0% GMV fee invariant
node --experimental-strip-types scripts/seed-public-sandbox.ts --verify-only

# Typecheck all workspace packages
pnpm typecheck

# Verify 100% permissive open-source licenses (zero GPL/AGPL)
pnpm licenses list
```

---

## License

This repository is licensed under the permissive **MIT License**. All dependencies are strictly verified to use permissive open-source licenses (`MIT`, `Apache 2.0`, `BSD-3-Clause`, `PostgreSQL`, `ISC`, `BlueOak-1.0.0`).
