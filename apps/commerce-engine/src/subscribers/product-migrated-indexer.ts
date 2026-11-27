import type { ZiroMigratedProduct } from '@ziro/migrator';
import type { CatalogIndexService } from '../services/catalog-index.service.js';

export interface ProductMigratedPayload {
  tenantId: string;
  product: ZiroMigratedProduct;
}

export interface PulseAiClient {
  upsertProductEmbedding(tenantId: string, product: ZiroMigratedProduct): Promise<void>;
}

export class ProductMigratedIndexerSubscriber {
  private catalogIndexService?: CatalogIndexService;
  private pulseAiClient?: PulseAiClient;

  constructor(options?: {
    catalogIndexService?: CatalogIndexService;
    pulseAiClient?: PulseAiClient;
  }) {
    this.catalogIndexService = options?.catalogIndexService;
    this.pulseAiClient = options?.pulseAiClient;
  }

  async handle(payload: ProductMigratedPayload): Promise<{ meilisearch: boolean; pulseAi: boolean }> {
    const { tenantId, product } = payload;
    let meilisearchOk = false;
    let pulseAiOk = false;

    const tasks: Promise<any>[] = [];

    // 1. Index into Meilisearch
    if (this.catalogIndexService) {
      tasks.push(
        (async () => {
          await this.catalogIndexService?.upsertProduct(tenantId, {
            id: product.handle,
            title: product.title,
            description: product.bodyHtml || '',
            category: product.category,
            hsn: product.hsnCode,
            gst_slab: product.gstSlab,
            variants: product.variants.map((v) => ({
              sku: v.sku,
              title: v.title,
              price_minor: v.pricePaise,
              stock: v.inventoryQuantity,
            })),
          });
          meilisearchOk = true;
        })()
      );
    }

    // 2. Index into Pulse AI vector store
    if (this.pulseAiClient) {
      tasks.push(
        (async () => {
          await this.pulseAiClient?.upsertProductEmbedding(tenantId, product);
          pulseAiOk = true;
        })()
      );
    }

    await Promise.allSettled(tasks);

    return {
      meilisearch: meilisearchOk,
      pulseAi: pulseAiOk,
    };
  }
}
