/**
 * Ziro Migrator Core Types
 * Enforces 0% GMV platform fee, integer minor currency units, and deterministic data contracts.
 */

export const ZIRO_PLATFORM_FEE_BPS = 0 as const;

export type GstSlabPercent = 0 | 5 | 12 | 18 | 28;

export interface FitmentEntry {
  make: string;
  model: string;
  yearStart: number;
  yearEnd: number;
}

export interface ZiroMigratedVariant {
  idempotencyKey: string;
  sku: string;
  title: string;
  pricePaise: number;
  compareAtPricePaise?: number;
  inventoryQuantity: number;
  barcode?: string;
  options: Record<string, string>;
}

export interface ZiroMigratedProduct {
  idempotencyKey: string;
  handle: string;
  title: string;
  bodyHtml?: string;
  vendor?: string;
  category?: string;
  tags: string[];
  hsnCode: string;
  gstSlab: GstSlabPercent;
  fitments: FitmentEntry[];
  variants: ZiroMigratedVariant[];
  images: string[];
  platformFeeBps: 0; // Strictly 0% GMV fee
}

export interface MigrationBatchReport {
  totalProcessed: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: Array<{ handle: string; message: string }>;
}

export interface ZiroCatalogSink {
  upsertProducts(tenantId: string, products: ZiroMigratedProduct[]): Promise<MigrationBatchReport>;
}
