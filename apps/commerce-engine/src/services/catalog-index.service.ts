export interface MeilisearchIndexLike {
  addDocuments(docs: Array<Record<string, unknown>>): Promise<unknown>;
}

export interface ProductMutationPayload {
  tenant_id: string;
  product_id: string;
  title: string;
  description?: string;
  sku: string;
  price_minor: number;
  currency?: string;
  stock_qty?: number;
}

export class CatalogIndexService {
  private meiliIndex?: MeilisearchIndexLike;
  private pulseUrl: string;
  private fetchImpl: typeof fetch;

  constructor(options?: {
    meilisearchIndex?: MeilisearchIndexLike;
    pulseUrl?: string;
    fetchImpl?: typeof fetch;
  }) {
    this.meiliIndex = options?.meilisearchIndex;
    this.pulseUrl = (options?.pulseUrl ?? process.env.PULSE_AI_URL ?? 'http://localhost:8000').replace(
      /\/$/,
      '',
    );
    this.fetchImpl = options?.fetchImpl ?? fetch;
  }

  async syncProductMutation(payload: ProductMutationPayload): Promise<void> {
    if (this.meiliIndex) {
      await this.meiliIndex.addDocuments([
        {
          id: `${payload.tenant_id}_${payload.product_id}`,
          tenant_id: payload.tenant_id,
          product_id: payload.product_id,
          title: payload.title,
          description: payload.description ?? '',
          sku: payload.sku,
          price_minor: payload.price_minor,
          currency: payload.currency ?? 'INR',
          stock_qty: payload.stock_qty ?? 0,
        },
      ]);
    }

    await this.fetchImpl(`${this.pulseUrl}/v1/embeddings/index`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tenant_id: payload.tenant_id,
        items: [
          {
            product_id: payload.product_id,
            title: payload.title,
            description: payload.description ?? '',
            sku: payload.sku,
            price_minor: payload.price_minor,
            currency: payload.currency ?? 'INR',
            stock_qty: payload.stock_qty ?? 0,
          },
        ],
      }),
    });
  }

  async upsertProduct(
    tenantId: string,
    product: {
      id: string;
      title: string;
      description?: string;
      category?: string;
      hsn?: string;
      gst_slab?: number;
      variants: Array<{
        sku: string;
        title: string;
        price_minor: number;
        stock: number;
      }>;
    }
  ): Promise<void> {
    if (this.meiliIndex) {
      const docs = product.variants.map((v) => ({
        id: `${tenantId}_${product.id}_${v.sku}`,
        tenant_id: tenantId,
        product_id: product.id,
        title: `${product.title} - ${v.title}`,
        description: product.description ?? '',
        sku: v.sku,
        category: product.category,
        hsn: product.hsn,
        gst_slab: product.gst_slab,
        price_minor: v.price_minor,
        currency: 'INR',
        stock_qty: v.stock,
      }));
      await this.meiliIndex.addDocuments(docs);
    }

    await this.fetchImpl(`${this.pulseUrl}/v1/embeddings/index`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tenant_id: tenantId,
        items: product.variants.map((v) => ({
          product_id: product.id,
          title: `${product.title} - ${v.title}`,
          description: product.description ?? '',
          sku: v.sku,
          price_minor: v.price_minor,
          currency: 'INR',
          stock_qty: v.stock,
        })),
      }),
    }).catch(() => {});
  }
}
