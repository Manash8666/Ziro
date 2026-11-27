import type {
  ZiroMigratedProduct,
  MigrationBatchReport,
} from '@ziro/migrator';
import { ZIRO_PLATFORM_FEE_BPS } from '@ziro/migrator';

export interface MigrationLogRecord {
  tenantId: string;
  idempotencyKey: string;
  handle: string;
  migratedAt: string;
}

export interface TaxProfileRecord {
  tenantId: string;
  handle: string;
  hsnCode: string;
  gstSlab: number;
}

export interface VehicleFitmentRecord {
  tenantId: string;
  handle: string;
  make: string;
  model: string;
  yearStart: number;
  yearEnd: number;
}

export interface MigrationEventEmitter {
  emit(event: string, payload: any): void | Promise<void>;
}

export class ProductMigrationUpsertService {
  private migrationLogs = new Set<string>(); // tenantId:idempotencyKey
  private products = new Map<string, ZiroMigratedProduct>(); // tenantId:handle
  private taxProfiles = new Map<string, TaxProfileRecord>(); // tenantId:handle
  private fitments = new Map<string, VehicleFitmentRecord[]>(); // tenantId:handle -> records
  private eventEmitter?: MigrationEventEmitter;

  constructor(options?: { eventEmitter?: MigrationEventEmitter }) {
    this.eventEmitter = options?.eventEmitter;
  }

  async upsertBatch(tenantId: string, products: ZiroMigratedProduct[]): Promise<MigrationBatchReport> {
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ handle: string; message: string }> = [];

    for (const product of products) {
      try {
        // Enforce 0% GMV fee invariant strictly
        if (product.platformFeeBps !== ZIRO_PLATFORM_FEE_BPS) {
          throw new Error(`Violation: platformFeeBps must be 0, received ${product.platformFeeBps}`);
        }

        const logKey = `${tenantId}:${product.idempotencyKey}`;
        if (this.migrationLogs.has(logKey)) {
          skippedCount++;
          continue;
        }

        const productKey = `${tenantId}:${product.handle}`;
        const isExisting = this.products.has(productKey);

        // Store product & variants
        this.products.set(productKey, product);

        // Store tax profile
        this.taxProfiles.set(productKey, {
          tenantId,
          handle: product.handle,
          hsnCode: product.hsnCode,
          gstSlab: product.gstSlab,
        });

        // Store fitment entries
        if (product.fitments && product.fitments.length > 0) {
          const fitmentRecords = product.fitments.map((f) => ({
            tenantId,
            handle: product.handle,
            make: f.make,
            model: f.model,
            yearStart: f.yearStart,
            yearEnd: f.yearEnd,
          }));
          this.fitments.set(productKey, fitmentRecords);
        }

        // Record migration log
        this.migrationLogs.add(logKey);

        if (isExisting) {
          updatedCount++;
        } else {
          insertedCount++;
        }

        // Emit event for Meilisearch & Pulse AI vector indexing
        if (this.eventEmitter) {
          await this.eventEmitter.emit('ziro.product.migrated', {
            tenantId,
            product,
          });
        }
      } catch (err: any) {
        errors.push({
          handle: product.handle,
          message: err.message || 'Unknown upsert error',
        });
      }
    }

    return {
      totalProcessed: products.length,
      insertedCount,
      updatedCount,
      skippedCount,
      errors,
    };
  }

  getProduct(tenantId: string, handle: string): ZiroMigratedProduct | undefined {
    return this.products.get(`${tenantId}:${handle}`);
  }

  getTaxProfile(tenantId: string, handle: string): TaxProfileRecord | undefined {
    return this.taxProfiles.get(`${tenantId}:${handle}`);
  }

  getFitments(tenantId: string, handle: string): VehicleFitmentRecord[] {
    return this.fitments.get(`${tenantId}:${handle}`) || [];
  }
}
