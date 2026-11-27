import { parseCsv } from './csv-parser.js';
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

interface InternalProductMeta {
  product: ZiroMigratedProduct;
  option1Name: string;
  option2Name: string;
  option3Name: string;
}

/**
 * Maps a Shopify CSV export to Ziro's canonical migration format.
 * Groups consecutive rows sharing the same Handle into a single product with variants & images.
 */
export function mapShopifyCsvToZiro(tenantId: string, csvContent: string): ZiroMigratedProduct[] {
  const rows = parseCsv(csvContent);
  if (rows.length === 0) {
    return [];
  }

  const productsByHandle = new Map<string, InternalProductMeta>();

  for (const row of rows) {
    const handle = (row['Handle'] || '').trim();
    if (!handle) {
      continue;
    }

    let meta = productsByHandle.get(handle);

    if (!meta) {
      const title = (row['Title'] || handle).trim();
      const bodyHtml = row['Body (HTML)'] || '';
      const vendor = (row['Vendor'] || '').trim();
      const category = (row['Type'] || row['Product Category'] || '').trim();
      const tagsRaw = row['Tags'] || '';
      const tags = tagsRaw
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const { hsnCode, gstSlab } = inferHsnAndGst(title, category, tags);
      const fitments = extractFitmentFromTags(tags);
      const idempotencyKey = generateMigrationIdempotencyKey(tenantId, 'shopify', handle, handle);

      const opt1Name = (row['Option1 Name'] || 'Title').trim();
      const opt2Name = (row['Option2 Name'] || 'Option2').trim();
      const opt3Name = (row['Option3 Name'] || 'Option3').trim();

      const product: ZiroMigratedProduct = {
        idempotencyKey,
        handle,
        title,
        bodyHtml,
        vendor: vendor || undefined,
        category: category || undefined,
        tags,
        hsnCode,
        gstSlab,
        fitments,
        variants: [],
        images: [],
        platformFeeBps: 0,
      };

      meta = {
        product,
        option1Name: opt1Name,
        option2Name: opt2Name,
        option3Name: opt3Name,
      };

      productsByHandle.set(handle, meta);
    }

    const { product } = meta;

    // Capture Image Src if present and unique
    const imageSrc = (row['Image Src'] || '').trim();
    if (imageSrc && !product.images.includes(imageSrc)) {
      product.images.push(imageSrc);
    }

    // Capture Variant if present
    const sku = (row['Variant SKU'] || '').trim();
    const opt1Val = (row['Option1 Value'] || '').trim();
    const opt2Val = (row['Option2 Value'] || '').trim();
    const opt3Val = (row['Option3 Value'] || '').trim();

    // Check if row has variant data
    if (sku || opt1Val || row['Variant Price']) {
      const priceStr = row['Variant Price'] || '0';
      const pricePaise = Math.round(parseFloat(priceStr) * 100);

      let compareAtPricePaise: number | undefined;
      const compareStr = row['Variant Compare At Price'];
      if (compareStr && compareStr.trim().length > 0) {
        const parsed = parseFloat(compareStr);
        if (!isNaN(parsed) && parsed > 0) {
          compareAtPricePaise = Math.round(parsed * 100);
        }
      }

      const inventoryStr = row['Variant Inventory Qty'] || '0';
      const inventoryQuantity = Math.max(0, parseInt(inventoryStr, 10) || 0);
      const barcode = (row['Variant Barcode'] || '').trim() || undefined;

      const opt1Name = (row['Option1 Name'] || meta.option1Name).trim();
      const opt2Name = (row['Option2 Name'] || meta.option2Name).trim();
      const opt3Name = (row['Option3 Name'] || meta.option3Name).trim();

      const options: Record<string, string> = {};
      if (opt1Val && opt1Val !== 'Default Title') {
        options[opt1Name] = opt1Val;
      }
      if (opt2Val) {
        options[opt2Name] = opt2Val;
      }
      if (opt3Val) {
        options[opt3Name] = opt3Val;
      }

      const variantIndex = product.variants.length + 1;
      const effectiveSku = sku || `${handle}-v${variantIndex}`;
      const variantTitle = Object.values(options).join(' / ') || 'Default Variant';
      const variantKey = generateMigrationIdempotencyKey(tenantId, 'shopify', handle, effectiveSku);

      // Prevent duplicate variant SKUs inside same product
      if (!product.variants.some((v) => v.sku === effectiveSku)) {
        product.variants.push({
          idempotencyKey: variantKey,
          sku: effectiveSku,
          title: variantTitle,
          pricePaise,
          compareAtPricePaise,
          inventoryQuantity,
          barcode,
          options,
        });
      }
    }
  }

  // Ensure every product has at least one variant
  const result: ZiroMigratedProduct[] = [];
  for (const { product } of productsByHandle.values()) {
    if (product.variants.length === 0) {
      product.variants.push({
        idempotencyKey: generateMigrationIdempotencyKey(tenantId, 'shopify', product.handle, `${product.handle}-default`),
        sku: `${product.handle}-DEFAULT`,
        title: 'Default Variant',
        pricePaise: 0,
        inventoryQuantity: 0,
        options: {},
      });
    }
    result.push(product);
  }

  return result;
}

/**
 * Imports a Shopify CSV directly into the given ZiroCatalogSink.
 */
export async function importShopifyCsvToCatalog(
  tenantId: string,
  csvContent: string,
  sink: ZiroCatalogSink
): Promise<MigrationBatchReport> {
  const products = mapShopifyCsvToZiro(tenantId, csvContent);
  if (products.length === 0) {
    return {
      totalProcessed: 0,
      insertedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errors: [],
    };
  }

  return sink.upsertProducts(tenantId, products);
}
