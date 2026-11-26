# Ziro Commerce OS — Stage 3 System Specification
### *UI, UX, Graphic Design, Website Creation, Content, Fonts & Styles*

**Author:** Google DeepMind Assistant (Antigravity) & Hybrid StudioZ  
**Date:** 2026-11-26  
**Status:** Approved  
**Branch:** `feat/ziro-stage-3`  
**License:** Permissive Open Source (`MIT`, `Apache 2.0`, `BSD-3-Clause`)  

---

## 1. Intent & The Why

Ziro Commerce OS has proven its core commerce engine, local-first offline POS sync ledger, and AI protocols in Stages 1 and 2 with 100% test pass rates and zero GPL contamination.

Stage 3 transforms Ziro into an iconic, production-grade visual experience. It establishes a distinctive visual identity ("Dark Precision"), a comprehensive component library in `@ziro/ui-kit`, high-conversion storefront pages with interactive 3D and BOM inspection in `apps/storefront`, a commercial SaaS portal with an interactive GMV savings calculator in `apps/cloud-portal`, and sunlight-readable counter UX in `apps/pos-terminal`.

---

## 2. Goals, Non-Goals & Anti-Goals

### Core Goals
1. **Typography & Styling Foundation:** Deploy Plus Jakarta Sans for geometric brand titles, Geist Mono / JetBrains Mono for tabular financial numbers, and Obsidian/Slate/Mint Dark Precision tokens.
2. **Programmatic SVG Graphics:** Vector SVG logomark with slashed-zero geometry, architectural system flowcharts, 0% tax comparison graphics, and trust seals.
3. **Advanced UI Kit Components:** Build and test `ZiroTable`, `ZiroDrawer`, `ZiroModal`, `ZiroToast`, and `SavingsCalculator` in `@ziro/ui-kit`.
4. **Complete Storefront Web Experience:** Implement high-conversion Homepage, Product Detail Page (PDP) with BOM breakdown drawer, Catalog with faceted search, and interactive 3D Configurator showcase.
5. **Commercial Cloud SaaS Portal:** Deploy an interactive ROI calculator, live protocol playground, and tiered pricing grid in `apps/cloud-portal`.
6. **POS Hardware UX Hardening:** Tablet/counter layout optimization, barcode scan feedback cues, and quick-action hardware controls in `apps/pos-terminal`.

### Non-Goals
- Migrating away from Tailwind CSS v4 or introducing proprietary CSS-in-JS runtimes.
- Replacing Three.js / React Three Fiber with pre-rendered static video renders.
- Introducing paid font licenses (use free open-source fonts: Plus Jakarta Sans and Geist/JetBrains Mono).

### Anti-Goals
- Generic SaaS drag-and-drop themes or pastel palettes that dilute Ziro's industrial, technical authority.
- Compromising the 0% GMV tax invariant anywhere in marketing or UI copy (`ZIRO_PLATFORM_FEE_BPS = 0`).
- Any floating-point arithmetic in UI calculators (minor integer units or exact cents converted only at final string formatting).

---

## 3. Visual Identity & Design System Specifications

### 3.1 Color Architecture & Surfaces
| Token | Hex / Value | Purpose |
| :--- | :--- | :--- |
| `--color-ziro-obsidian` | `#090B0E` | Primary deep canvas background |
| `--color-ziro-slate` | `#12161E` | Card containers and surface panels |
| `--color-ziro-border` | `#1F2633` | 1px hairline card borders |
| `--color-ziro-border-hover`| `#2E384D` | Active / hover card hairline highlight |
| `--color-ziro-mint` | `#00E599` | 0% Fee callouts, live sync, primary CTAs, agent auth |
| `--color-ziro-amber` | `#F59E0B` | Offline queue badges, inventory alerts, B2B credit warning |
| `--color-ziro-alabaster` | `#F4F6F9` | Primary typography |
| `--color-ziro-muted` | `#8B95A5` | Secondary text, table column headers, helper labels |
| `--color-ziro-danger` | `#EF4444` | Payment decline, RTO high-risk alert |

### 3.2 Typography Rules
- **Display Headings (`h1`, `h2`, `h3`):** `font-sans font-semibold tracking-tight` (Plus Jakarta Sans).
- **Prices, Taxes, SKUs & Quantities:** `font-mono tabular-nums` (Geist Mono / JetBrains Mono) to prevent layout shift during price changes and counter scanning.
- **Micro Badges:** `text-[10px] font-mono uppercase tracking-widest`.

### 3.3 Programmatic Vector SVG Suite
- `ZiroMark`: Precision broken ring slashed zero (`<circle>`, `<path>`, `<line>`).
- `ZiroArchitectureDiagram`: Visual monorepo flow (Storefront/POS → Edge Caddy → Medusa Core → Valkey → Postgres 17 → Pulse AI).
- `ZeroTaxComparisonGraphic`: Bar comparison showing traditional 2.9% + 30¢ vs. Ziro flat $0 fee.
- `AgenticCommerceFlowDiagram`: Flowchart illustrating Gemini/ChatGPT/WebMCP agent KYA verification, margin guardrails, and checkout.
- `TrustBadges`: Zero GMV Tax Seal, KYA Verified Shield, Local-First Loop, GST 38+1 Stamp.

---

## 4. Workspaces & Key Deliverables

### A. `@ziro/ui-kit` (Package)
- Extended `tokens.css` with surface elevations, glass cards, and neon glow effects.
- Vector SVG component exports: `ZiroMark`, `ZiroArchitectureDiagram`, `ZeroTaxComparisonGraphic`, `AgenticCommerceFlowDiagram`, `TrustBadges`.
- New interactive UI components:
  - `ZiroTable` (sortable headers, sticky column, tabular numeric formatting).
  - `ZiroDrawer` (slide-out right/left sheet for BOM and cart).
  - `ZiroModal` (accessible dialog with backdrop blur).
  - `ZiroToast` (floating toast notification queue).
  - `SavingsCalculator` (interactive GMV tax savings slider).

### B. `apps/storefront` (Storefront Application)
- **Homepage (`/`):** Full editorial layout with HeroSlider, 3D configurator showcase, vehicle fitment finder, feature breakdown, and zero-tax trust badges.
- **Product Detail Page (`/products/[handle]`):** Interactive PDP with high-res gallery, SKU details, BOM child components drawer, vehicle fitment check, live shipping comparison (Delhivery vs. Shiprocket), and instant UPI/card checkout.
- **Catalog Page (`/catalog`):** Faceted filtering by category, price, vehicle model, and availability across the 100+ seed catalog items.
- **Configurator (`/configure`):** Enhanced 3D scene with material/finish selectors and real-time BOM roll-up calculation.

### C. `apps/cloud-portal` (Commercial SaaS Marketing Site)
- **Homepage (`/`):** SaaS landing page featuring the interactive `SavingsCalculator`, protocol playground, and tiered pricing grid.
- **Protocol Playground:** Live interactive widget demonstrating `/ucp/manifest.json` and WebMCP agent queries.
- **Custom Domain Simulator:** Interactive tool demonstrating Caddy On-Demand TLS provisioning.

### D. `apps/pos-terminal` (Retail Counter & Warehouse App)
- **High-Contrast Counter View:** Sunlight/harsh-lighting optimized display mode.
- **Audio/Visual Scan Feedback:** Instant green flash and audio cue upon successful hardware barcode scan.
- **Quick Action Bar:** Direct buttons for ESC/POS receipt reprint, cash drawer pulse, and offline queue flush.

---

## 5. Verification Protocol
- All new components must have automated Vitest unit tests in their respective workspace.
- `pnpm typecheck` must pass across all 7 packages.
- `pnpm build` must pass for all Next.js applications and TypeScript libraries.
- All 69 Vitest tests and 9 Pytest tests must pass without regressions.
- Permissive licensing must remain 100% compliant (`MIT`, `Apache 2.0`, `BSD-3-Clause`).
