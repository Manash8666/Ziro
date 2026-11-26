# Ziro Commerce OS — Stage 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Stage 3 — Typography, Dark Precision Design System, Programmatic Vector SVGs, Advanced UI Kit Components, Full Storefront Pages (PDP, Catalog, 3D Showcase), Commercial Cloud Portal with Savings Calculator, and POS Hardware UX.

**Architecture:** Monorepo UI extension delivering reusable accessible components in `@ziro/ui-kit`, high-conversion Next.js 16 pages in `apps/storefront` with Payload CMS and 3D R3F components, interactive marketing ROI calculator in `apps/cloud-portal`, and sunlight-readable POS counter layout in `apps/pos-terminal`.

**Tech Stack:** Next.js 16 (App Router / Turbopack), React 19, Tailwind CSS v4, Three.js / React Three Fiber, Lucide icons, Vitest, TypeScript 5.7.

**Spec:** `docs/superpowers/specs/2026-11-26-ziro-stage-3-design.md`

## Global Constraints

- **0% GMV Platform Tax:** `ZIRO_PLATFORM_FEE_BPS = 0` strictly enforced across all gateways, billing modules, and UI copy.
- **Integer Minor Units:** All monetary values in paise or cents. No floating-point math in financial components.
- **Permissive Licenses Only:** `MIT`, `Apache 2.0`, `BSD-3-Clause`, `PostgreSQL`, `ISC`. Zero `GPL` / `AGPL`.
- **Dual Tenancy Mode:** Works seamlessly in `single` and `multi` tenancy modes.
- **Isolated Deterministic Tests:** All automated tests must run reliably without live external network dependencies.

## Review Focus

1. **Numeric Layout Shifts:** Verify that prices, quantities, and barcode data always use tabular numerals (`tabular-nums`) to prevent jitter during live updates.
2. **Accessible Keyboard & Focus Traps:** Verify that drawers and modal dialogs trap focus and close cleanly on `Escape` key without leaking DOM events.
3. **Responsive Mobile Breakpoints:** Ensure that complex data tables and vehicle fitment widgets stack gracefully on small phone viewports (`sm: 640px`).
4. **WebGL Context Cleanliness:** Ensure 3D configurator canvas instances unmount cleanly without leaking GPU WebGL contexts or throwing console errors.
5. **e-Way Bill Consistency:** Verify that PDP and checkout shipping rate estimators enforce the ₹50,000 threshold (`5,000,000` paise) consistently.

---

## Tasks

### Task 1: `@ziro/ui-kit` — Typography Tokens, Web Fonts & Vector SVG Graphic Suite

**Files:**
- Modify: `packages/ui-kit/src/tokens.css`
- Create: `packages/ui-kit/src/graphics/ZiroMark.tsx`
- Create: `packages/ui-kit/src/graphics/ArchitectureDiagram.tsx`
- Create: `packages/ui-kit/src/graphics/TaxComparisonGraphic.tsx`
- Create: `packages/ui-kit/src/graphics/AgenticFlowDiagram.tsx`
- Create: `packages/ui-kit/src/graphics/TrustBadges.tsx`
- Create: `packages/ui-kit/src/graphics/index.ts`
- Modify: `packages/ui-kit/src/index.ts`
- Test: `packages/ui-kit/src/__tests__/graphics.test.ts`

**Interfaces:**
- Produces:
  - Extended CSS variables for elevated surfaces, glass layers, and hairline borders.
  - Slashed-zero `ZiroMark` SVG component with responsive scaling and broken-ring geometry.
  - Code-driven vector SVGs: `ArchitectureDiagram`, `TaxComparisonGraphic`, `AgenticFlowDiagram`, and `TrustBadges`.

- [ ] **Step 1: Write failing graphics tests in `packages/ui-kit/src/__tests__/graphics.test.ts`**
- [ ] **Step 2: Run test to verify it fails (`pnpm --filter @ziro/ui-kit test`)**
- [ ] **Step 3: Implement tokens and vector SVG components**
- [ ] **Step 4: Verify tests pass and build package (`pnpm --filter @ziro/ui-kit test && pnpm --filter @ziro/ui-kit build`)**
- [ ] **Step 5: Commit and push to `origin/feat/ziro-stage-3`**

---

### Task 2: `@ziro/ui-kit` — Advanced Interactive Component Library

**Files:**
- Create: `packages/ui-kit/src/components/ZiroTable.tsx`
- Create: `packages/ui-kit/src/components/ZiroDrawer.tsx`
- Create: `packages/ui-kit/src/components/ZiroModal.tsx`
- Create: `packages/ui-kit/src/components/ZiroToast.tsx`
- Create: `packages/ui-kit/src/components/SavingsCalculator.tsx`
- Modify: `packages/ui-kit/src/components/index.ts` (if exists) or `packages/ui-kit/src/index.ts`
- Test: `packages/ui-kit/src/__tests__/components-stage3.test.tsx`

**Interfaces:**
- Produces:
  - `ZiroTable`: Sortable tabular data view with sticky header and financial number formatting.
  - `ZiroDrawer`: Slide-over accessible drawer component for mobile menus and BOM drawers.
  - `ZiroModal`: Accessible dialog modal with keyboard escape handler and backdrop blur.
  - `ZiroToast`: Floating notification manager with auto-dismiss.
  - `SavingsCalculator`: Interactive GMV tax savings slider ($10k to $10M+) comparing Ziro's 0% GMV fee against Shopify and marketplace take rates.

- [ ] **Step 1: Write failing component tests in `packages/ui-kit/src/__tests__/components-stage3.test.tsx`**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement `ZiroTable`, `ZiroDrawer`, `ZiroModal`, `ZiroToast`, and `SavingsCalculator`**
- [ ] **Step 4: Verify tests pass and build package (`pnpm --filter @ziro/ui-kit test && pnpm --filter @ziro/ui-kit build`)**
- [ ] **Step 5: Commit and push**

---

### Task 3: `apps/storefront` — Product Detail Page (PDP) & Catalog Browser

**Files:**
- Create: `apps/storefront/src/app/products/[handle]/page.tsx`
- Create: `apps/storefront/src/app/catalog/page.tsx`
- Create: `apps/storefront/src/components/BomDrawer.tsx`
- Create: `apps/storefront/src/components/ProductCard.tsx`
- Test: `apps/storefront/src/__tests__/pages.test.ts`

**Interfaces:**
- Produces:
  - Product Detail Page with image gallery, fitment compatibility checker, live shipping rate comparison (Delhivery vs. Shiprocket), and BOM inspection drawer.
  - Catalog Page with instant search, category filters, and price ranges across the 100+ seed catalog items.

- [ ] **Step 1: Write failing storefront pages test in `apps/storefront/src/__tests__/pages.test.ts`**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement PDP, Catalog page, BOM drawer, and Product Card**
- [ ] **Step 4: Verify tests pass and typecheck (`pnpm --filter @ziro/storefront test && pnpm --filter @ziro/storefront typecheck`)**
- [ ] **Step 5: Commit and push**

---

### Task 4: `apps/storefront` — Editorial Homepage & 3D Configurator Enhancement

**Files:**
- Modify: `apps/storefront/src/app/page.tsx`
- Modify: `apps/storefront/src/app/configure/page.tsx`
- Test: `apps/storefront/src/__tests__/homepage.test.ts`

**Interfaces:**
- Produces:
  - Cinematic Homepage featuring HeroSlider, 3D interactive showcase, TaxComparisonGraphic, FitmentFinder, and live trust seals.
  - Enhanced 3D Configurator page with material switchers, live price recalculation, and exploded BOM preview.

- [ ] **Step 1: Write failing homepage and configurator tests in `apps/storefront/src/__tests__/homepage.test.ts`**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Enhance Homepage and 3D Configurator pages**
- [ ] **Step 4: Verify tests pass and build Next.js storefront (`pnpm --filter @ziro/storefront test && pnpm --filter @ziro/storefront build`)**
- [ ] **Step 5: Commit and push**

---

### Task 5: `apps/cloud-portal` — Commercial Marketing Portal & Interactive Playground

**Files:**
- Modify: `apps/cloud-portal/src/app/page.tsx`
- Create: `apps/cloud-portal/src/components/ProtocolPlayground.tsx`
- Test: `apps/cloud-portal/src/__tests__/portal-stage3.test.ts`

**Interfaces:**
- Produces:
  - Commercial SaaS landing page integrating the interactive `SavingsCalculator`.
  - `ProtocolPlayground`: Live sandbox testing `/ucp/manifest.json` discovery and simulated KYA agent authorization.
  - Three-tier plan comparison matrix ($49, $149, $499) with explicit 0% GMV fee callout.

- [ ] **Step 1: Write failing portal stage 3 test in `apps/cloud-portal/src/__tests__/portal-stage3.test.ts`**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement ProtocolPlayground and update Cloud Portal homepage**
- [ ] **Step 4: Verify tests pass and build Next.js portal (`pnpm --filter @ziro/cloud-portal test && pnpm --filter @ziro/cloud-portal build`)**
- [ ] **Step 5: Commit and push**

---

### Task 6: `apps/pos-terminal` — High-Contrast Counter & Tablet UX Hardening

**Files:**
- Modify: `apps/pos-terminal/src/app/page.tsx`
- Create: `apps/pos-terminal/src/components/QuickActionBar.tsx`
- Create: `apps/pos-terminal/src/components/ScanFeedbackBanner.tsx`
- Test: `apps/pos-terminal/src/__tests__/pos-ux.test.ts`

**Interfaces:**
- Produces:
  - Sunlight-readable high-contrast layout mode for tablets.
  - Audio/visual scan indicator triggering mint highlight upon barcode recognition.
  - Quick Action Bar providing single-tap drawer kick, receipt reprint, and offline queue flush.

- [ ] **Step 1: Write failing POS UX tests in `apps/pos-terminal/src/__tests__/pos-ux.test.ts`**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement QuickActionBar, ScanFeedbackBanner, and high-contrast counter layout**
- [ ] **Step 4: Verify tests pass and build POS app (`pnpm --filter @ziro/pos test && pnpm --filter @ziro/pos build`)**
- [ ] **Step 5: Commit and push**

---

### Task 7: Full Monorepo Stage 3 Verification & Push

- [ ] **Step 1: Run complete typecheck across all workspaces (`pnpm typecheck`)**
- [ ] **Step 2: Run complete production build across all workspaces (`pnpm build`)**
- [ ] **Step 3: Run all Vitest and Pytest test suites (`pnpm test` and `pytest apps/pulse-ai/tests -v`)**
- [ ] **Step 4: Run license audit (`pnpm licenses list`)**
- [ ] **Step 5: Commit and push clean tree to `origin/feat/ziro-stage-3`**
