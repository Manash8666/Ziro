import {
  inferHsnAndGst,
  extractFitmentFromTags,
  generateMigrationIdempotencyKey,
} from './hsn-fitment.js';
import type {
  ZiroMigratedProduct,
  ZiroMigratedVariant,
  ZiroCatalogSink,
  MigrationBatchReport,
} from './types.js';

export class SSRFValidationError extends Error {
  constructor(message: string) {
    super(`SSRF Protection Error: ${message}`);
    this.name = 'SSRFValidationError';
  }
}

export interface WooRestImporterConfig {
  tenantId: string;
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  sink?: ZiroCatalogSink;
}

export class WooRestImporter {
  readonly tenantId: string;
  readonly storeUrl: string;
  readonly consumerKey: string;
  readonly consumerSecret: string;
  readonly sink?: ZiroCatalogSink;

  constructor(config: WooRestImporterConfig) {
    this.tenantId = config.tenantId;
    this.storeUrl = this.validateAndNormalizeUrl(config.storeUrl);
    this.consumerKey = config.consumerKey;
    this.consumerSecret = config.consumerSecret;
    this.sink = config.sink;
  }

  /**
   * SSRF Guard: validates that the remote store URL is not pointing to private,
   * loopback, link-local, or cloud metadata endpoints.
   */
  private validateAndNormalizeUrl(urlStr: string): string {
    let parsed: URL;
    try {
      parsed = new URL(urlStr);
    } catch {
      throw new SSRFValidationError(`Invalid URL: ${urlStr}`);
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new SSRFValidationError(`Disallowed protocol: ${parsed.protocol}`);
    }

    const host = parsed.hostname.toLowerCase();

    // Check loopback / localhost
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host === '[::1]' ||
      host.endsWith('.localhost')
    ) {
      throw new SSRFValidationError(`Loopback addresses are strictly forbidden: ${host}`);
    }

    // Check Cloud Metadata (AWS/GCP/Azure link-local)
    if (host === '169.254.169.254' || host.startsWith('169.254.')) {
      throw new SSRFValidationError(`Cloud metadata endpoints are forbidden: ${host}`);
    }

    // Check IPv4 private subnets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8)
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = host.match(ipv4Regex);
    if (ipMatch) {
      const p1 = parseInt(ipMatch[1], 10);
      const p2 = parseInt(ipMatch[2], 10);

      if (p1 === 10) {
        throw new SSRFValidationError(`Private Class A subnet 10.0.0.0/8 is forbidden: ${host}`);
      }
      if (p1 === 172 && p2 >= 16 && p2 <= 31) {
        throw new SSRFValidationError(`Private Class B subnet 172.16.0.0/12 is forbidden: ${host}`);
      }
      if (p1 === 192 && p2 === 168) {
        throw new SSRFValidationError(`Private Class C subnet 192.168.0.0/16 is forbidden: ${host}`);
      }
      if (p1 === 127) {
        throw new SSRFValidationError(`Loopback subnet 127.0.0.0/8 is forbidden: ${host}`);
      }
    }

    return parsed.origin;
  }

  private getAuthHeader(): string {
    const creds = `${this.consumerKey}:${this.consumerSecret}`;
    const encoded = Buffer.from(creds).toString('base64');
    return `Basic ${encoded}`;
  }

  /**
   * Resilient fetch with exponential backoff on HTTP 429 and 503.
   */
  async fetchWithRetry(url: string, init?: RequestInit, maxRetries = 3): Promise<Response> {
    let attempt = 0;
    while (attempt < maxRetries) {
      const res = await fetch(url, {
        ...init,
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(init?.headers || {}),
        },
      });

      if (res.status === 429 || res.status === 503) {
        attempt++;
        if (attempt >= maxRetries) {
          return res;
        }
        const delayMs = 50 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      return res;
    }

    throw new Error(`Fetch failed after ${maxRetries} retries: ${url}`);
  }

  /**
   * Fetches paginated WooCommerce products.
   */
  async fetchProductsPage(page = 1, perPage = 50): Promise<{ products: any[]; totalPages: number }> {
    const url = `${this.storeUrl}/wp-json/wc/v3/products?page=${page}&per_page=${perPage}`;
    const res = await this.fetchWithRetry(url);
    if (!res.ok) {
      throw new Error(`WooCommerce API Error: ${res.status} ${res.statusText}`);
    }

    const totalPagesHeader = res.headers.get('x-wp-totalpages') || res.headers.get('X-WP-TotalPages');
    const totalPages = totalPagesHeader ? parseInt(totalPagesHeader, 10) : 1;
    const products = (await res.json()) as any[];

    return { products, totalPages };
  }

  /**
   * Fetches variations for variable products.
   */
  async fetchVariations(productId: number): Promise<any[]> {
    const url = `${this.storeUrl}/wp-json/wc/v3/products/${productId}/variations?per_page=100`;
    const res = await this.fetchWithRetry(url);
    if (!res.ok) {
      return [];
    }
    return (await res.json()) as any[];
  }

  /**
   * Maps a single WooCommerce product and its variations to canonical ZiroMigratedProduct.
   */
  mapWooProduct(raw: any, variations: any[] = []): ZiroMigratedProduct {
    const handle = (raw.slug || `woo-product-${raw.id}`).trim();
    const title = (raw.name || handle).trim();
    const bodyHtml = raw.description || '';
    const category = raw.categories?.[0]?.name;
    const tags = Array.isArray(raw.tags) ? raw.tags.map((t: any) => (t.name || '').trim()) : [];
    const images = Array.isArray(raw.images) ? raw.images.map((img: any) => img.src).filter(Boolean) : [];

    const { hsnCode, gstSlab } = inferHsnAndGst(title, category, tags);
    const fitments = extractFitmentFromTags(tags);
    const idempotencyKey = generateMigrationIdempotencyKey(this.tenantId, 'woocommerce', raw.id, handle);

    const variants: ZiroMigratedVariant[] = [];

    if (raw.type === 'variable' && variations.length > 0) {
      for (const v of variations) {
        const vSku = (v.sku || `${handle}-var-${v.id}`).trim();
        const pricePaise = Math.round(parseFloat(v.price || v.regular_price || '0') * 100);
        const compareAtPaise = v.regular_price && v.sale_price
          ? Math.round(parseFloat(v.regular_price) * 100)
          : undefined;
        const inventoryQuantity = Math.max(0, parseInt(v.stock_quantity ?? '0', 10) || 0);

        const options: Record<string, string> = {};
        if (Array.isArray(v.attributes)) {
          for (const attr of v.attributes) {
            if (attr.name && attr.option) {
              options[attr.name] = attr.option;
            }
          }
        }

        const vTitle = Object.values(options).join(' / ') || `Variation #${v.id}`;
        const vKey = generateMigrationIdempotencyKey(this.tenantId, 'woocommerce', raw.id, vSku);

        variants.push({
          idempotencyKey: vKey,
          sku: vSku,
          title: vTitle,
          pricePaise,
          compareAtPricePaise: compareAtPaise,
          inventoryQuantity,
          barcode: v.barcode || undefined,
          options,
        });
      }
    } else {
      // Simple product
      const sku = (raw.sku || `${handle}-DEFAULT`).trim();
      const pricePaise = Math.round(parseFloat(raw.price || raw.regular_price || '0') * 100);
      const compareAtPaise = raw.regular_price && raw.sale_price
        ? Math.round(parseFloat(raw.regular_price) * 100)
        : undefined;
      const inventoryQuantity = Math.max(0, parseInt(raw.stock_quantity ?? '0', 10) || 0);
      const vKey = generateMigrationIdempotencyKey(this.tenantId, 'woocommerce', raw.id, sku);

      variants.push({
        idempotencyKey: vKey,
        sku,
        title: 'Default Variant',
        pricePaise,
        compareAtPricePaise: compareAtPaise,
        inventoryQuantity,
        barcode: raw.barcode || undefined,
        options: {},
      });
    }

    return {
      idempotencyKey,
      handle,
      title,
      bodyHtml,
      category,
      tags,
      hsnCode,
      gstSlab,
      fitments,
      variants,
      images,
      platformFeeBps: 0,
    };
  }

  /**
   * Synchronizes the remote WooCommerce catalog into Ziro.
   */
  async syncCatalog(options?: { dryRun?: boolean; maxPages?: number }): Promise<MigrationBatchReport> {
    const isDryRun = options?.dryRun ?? false;
    const maxPages = options?.maxPages ?? 10;
    const allProducts: ZiroMigratedProduct[] = [];
    const errors: Array<{ handle: string; message: string }> = [];

    let currentPage = 1;
    let totalPages = 1;

    while (currentPage <= totalPages && currentPage <= maxPages) {
      try {
        const pageData = await this.fetchProductsPage(currentPage);
        totalPages = pageData.totalPages;

        for (const raw of pageData.products) {
          try {
            let variations: any[] = [];
            if (raw.type === 'variable') {
              variations = await this.fetchVariations(raw.id);
            }
            const mapped = this.mapWooProduct(raw, variations);
            allProducts.push(mapped);
          } catch (err: any) {
            errors.push({ handle: raw.slug || String(raw.id), message: err.message || 'Mapping error' });
          }
        }
      } catch (err: any) {
        errors.push({ handle: `page-${currentPage}`, message: err.message || 'Page fetch failure' });
        break;
      }
      currentPage++;
    }

    if (isDryRun || !this.sink) {
      return {
        totalProcessed: allProducts.length,
        insertedCount: allProducts.length,
        updatedCount: 0,
        skippedCount: 0,
        errors,
      };
    }

    const report = await this.sink.upsertProducts(this.tenantId, allProducts);
    return {
      ...report,
      errors: [...report.errors, ...errors],
    };
  }
}
