import { describe, it, expect, vi } from 'vitest';
import {
  ZIRO_PLATFORM_FEE_BPS,
  parseCsv,
  inferHsnAndGst,
  extractFitmentFromTags,
  generateMigrationIdempotencyKey,
  mapShopifyCsvToZiro,
  importShopifyCsvToCatalog,
  WooRestImporter,
  SSRFValidationError,
  type ZiroCatalogSink,
  type MigrationBatchReport,
} from '../src/index.js';

describe('@ziro/migrator', () => {
  describe('Invariants & Types', () => {
    it('enforces 0% GMV platform tax invariant', () => {
      expect(ZIRO_PLATFORM_FEE_BPS).toBe(0);
    });
  });

  describe('parseCsv', () => {
    it('parses basic CSV content', () => {
      const csv = 'Handle,Title,Price\npart-1,Carbon Disc,199.99\npart-2,Ceramic Pad,49.50';
      const parsed = parseCsv(csv);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].Handle).toBe('part-1');
      expect(parsed[0].Title).toBe('Carbon Disc');
      expect(parsed[0].Price).toBe('199.99');
    });

    it('strips UTF-8 BOM and handles escaped quotes and commas inside cells', () => {
      const csv = '\uFEFF"Handle","Title","Body (HTML)"\n"part-1","Race Clutch, Double Pack","<p>Super ""pro"" grip</p>"';
      const parsed = parseCsv(csv);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].Handle).toBe('part-1');
      expect(parsed[0].Title).toBe('Race Clutch, Double Pack');
      expect(parsed[0]['Body (HTML)']).toBe('<p>Super "pro" grip</p>');
    });

    it('handles multiline strings inside quoted fields', () => {
      const csv = 'Handle,Description\nprod-1,"Line 1\nLine 2\nLine 3"';
      const parsed = parseCsv(csv);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].Description).toBe('Line 1\nLine 2\nLine 3');
    });
  });

  describe('inferHsnAndGst', () => {
    it('infers 28% GST and 8714 HSN for brake and clutch systems', () => {
      const res1 = inferHsnAndGst('Sintered Front Brake Pads', 'Motorcycle Spares');
      expect(res1).toEqual({ hsnCode: '8714', gstSlab: 28 });

      const res2 = inferHsnAndGst('Performance Clutch Assembly', 'Transmission');
      expect(res2).toEqual({ hsnCode: '8714', gstSlab: 28 });
    });

    it('infers 28% GST for batteries (8507) and tyres (4011)', () => {
      expect(inferHsnAndGst('12V Lithium Battery 9Ah')).toEqual({ hsnCode: '8507', gstSlab: 28 });
      expect(inferHsnAndGst('Radial Tubeless Tyre 150/60 R17')).toEqual({ hsnCode: '4011', gstSlab: 28 });
    });

    it('infers 18% GST for lubricants (2710) and helmets (6506)', () => {
      expect(inferHsnAndGst('10W-40 Synthetic Engine Oil')).toEqual({ hsnCode: '2710', gstSlab: 18 });
      expect(inferHsnAndGst('ECE 22.06 Full Face Helmet')).toEqual({ hsnCode: '6506', gstSlab: 18 });
    });

    it('infers 5% GST for riding apparel (6109)', () => {
      expect(inferHsnAndGst('Breathable Riding Jersey', 'Apparel')).toEqual({ hsnCode: '6109', gstSlab: 5 });
      expect(inferHsnAndGst('Leather Riding Gloves')).toEqual({ hsnCode: '6109', gstSlab: 5 });
    });

    it('falls back to 18% GST 8708 for general automotive parts', () => {
      expect(inferHsnAndGst('CNC Aluminum Mirror Mount')).toEqual({ hsnCode: '8708', gstSlab: 18 });
    });
  });

  describe('extractFitmentFromTags', () => {
    it('extracts year range fitments', () => {
      const tags = ['d2c', 'fitment:Yamaha:YZF-R15:2018-2024', 'featured', 'fitment:KTM:Duke-390:2017-2023'];
      const fitments = extractFitmentFromTags(tags);
      expect(fitments).toHaveLength(2);
      expect(fitments[0]).toEqual({
        make: 'Yamaha',
        model: 'YZF-R15',
        yearStart: 2018,
        yearEnd: 2024,
      });
      expect(fitments[1]).toEqual({
        make: 'KTM',
        model: 'Duke-390',
        yearStart: 2017,
        yearEnd: 2023,
      });
    });

    it('extracts single year fitments as both start and end year', () => {
      const tags = ['fitment:Honda:CBR-250R:2020'];
      const fitments = extractFitmentFromTags(tags);
      expect(fitments).toHaveLength(1);
      expect(fitments[0]).toEqual({
        make: 'Honda',
        model: 'CBR-250R',
        yearStart: 2020,
        yearEnd: 2020,
      });
    });

    it('ignores non-fitment tags', () => {
      expect(extractFitmentFromTags(['summer-sale', 'racing', 'oem'])).toEqual([]);
    });
  });

  describe('generateMigrationIdempotencyKey', () => {
    it('generates deterministic SHA-256 idempotency key prefixed with ziro_mig_', () => {
      const k1 = generateMigrationIdempotencyKey('tenant_alpha', 'shopify', 'p-123', 'sku-99');
      const k2 = generateMigrationIdempotencyKey('tenant_alpha', 'shopify', 'p-123', 'sku-99');
      const k3 = generateMigrationIdempotencyKey('tenant_beta', 'shopify', 'p-123', 'sku-99');

      expect(k1).toMatch(/^ziro_mig_[0-9a-f]{64}$/);
      expect(k1).toBe(k2);
      expect(k1).not.toBe(k3);
    });
  });

  describe('mapShopifyCsvToZiro', () => {
    it('maps multi-row Shopify product with multiple variants, images, and prices in paise', () => {
      const shopifyCsv = `Handle,Title,Body (HTML),Vendor,Type,Tags,Option1 Name,Option1 Value,Option2 Name,Option2 Value,Variant SKU,Variant Price,Variant Compare At Price,Variant Inventory Qty,Variant Barcode,Image Src
racing-clutch,Brembo Racing Clutch Pack,<p>Heavy duty</p>,Brembo,Clutches,"brakes, fitment:Kawasaki:Ninja-ZX10R:2019-2024",Size,Stage 1,Color,Red,BRM-CL-S1,299.99,349.99,15,8901234567890,https://cdn.example.com/img1.jpg
racing-clutch,,,,,,,Stage 2,,Blue,BRM-CL-S2,399.50,,8,8901234567891,https://cdn.example.com/img2.jpg`;

      const products = mapShopifyCsvToZiro('tenant_m1', shopifyCsv);
      expect(products).toHaveLength(1);

      const p = products[0];
      expect(p.handle).toBe('racing-clutch');
      expect(p.title).toBe('Brembo Racing Clutch Pack');
      expect(p.vendor).toBe('Brembo');
      expect(p.category).toBe('Clutches');
      expect(p.hsnCode).toBe('8714');
      expect(p.gstSlab).toBe(28);
      expect(p.platformFeeBps).toBe(0);
      expect(p.fitments).toEqual([
        { make: 'Kawasaki', model: 'Ninja-ZX10R', yearStart: 2019, yearEnd: 2024 },
      ]);
      expect(p.images).toEqual(['https://cdn.example.com/img1.jpg', 'https://cdn.example.com/img2.jpg']);
      expect(p.variants).toHaveLength(2);

      const v1 = p.variants[0];
      expect(v1.sku).toBe('BRM-CL-S1');
      expect(v1.pricePaise).toBe(29999);
      expect(v1.compareAtPricePaise).toBe(34999);
      expect(v1.inventoryQuantity).toBe(15);
      expect(v1.barcode).toBe('8901234567890');
      expect(v1.options).toEqual({ Size: 'Stage 1', Color: 'Red' });

      const v2 = p.variants[1];
      expect(v2.sku).toBe('BRM-CL-S2');
      expect(v2.pricePaise).toBe(39950);
      expect(v2.compareAtPricePaise).toBeUndefined();
      expect(v2.inventoryQuantity).toBe(8);
      expect(v2.options).toEqual({ Size: 'Stage 2', Color: 'Blue' });
    });

    it('executes importShopifyCsvToCatalog with mock sink', async () => {
      const csv = 'Handle,Title,Variant SKU,Variant Price\ntire-1,City Tyre,TYR-01,150.00';
      const mockSink: ZiroCatalogSink = {
        upsertProducts: vi.fn().mockResolvedValue({
          totalProcessed: 1,
          insertedCount: 1,
          updatedCount: 0,
          skippedCount: 0,
          errors: [],
        } satisfies MigrationBatchReport),
      };

      const report = await importShopifyCsvToCatalog('tenant_m1', csv, mockSink);
      expect(report.insertedCount).toBe(1);
      expect(mockSink.upsertProducts).toHaveBeenCalledWith('tenant_m1', expect.any(Array));
    });
  });

  describe('WooRestImporter & SSRF Protection', () => {
    it('strictly forbids SSRF target addresses (localhost, loopback, metadata, RFC1918 private subnets)', () => {
      const badUrls = [
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://0.0.0.0:9000',
        'http://169.254.169.254/latest/meta-data',
        'http://10.0.0.5/wp-json',
        'http://192.168.1.100',
        'http://172.20.0.2',
        'ftp://example.com',
      ];

      for (const badUrl of badUrls) {
        expect(() => {
          new WooRestImporter({
            tenantId: 'tenant_t1',
            storeUrl: badUrl,
            consumerKey: 'ck_test',
            consumerSecret: 'cs_test',
          });
        }).toThrow(SSRFValidationError);
      }
    });

    it('allows valid public domain store URLs', () => {
      const importer = new WooRestImporter({
        tenantId: 'tenant_t1',
        storeUrl: 'https://store.example.com',
        consumerKey: 'ck_test',
        consumerSecret: 'cs_test',
      });
      expect(importer.storeUrl).toBe('https://store.example.com');
    });

    it('syncCatalog fetches products and variations, mapping correctly with 0% fee', async () => {
      const importer = new WooRestImporter({
        tenantId: 'tenant_m1',
        storeUrl: 'https://parts.example.com',
        consumerKey: 'ck_123',
        consumerSecret: 'cs_456',
      });

      const mockProducts = [
        {
          id: 101,
          slug: 'ceramic-brake-disc',
          name: 'Front Ceramic Brake Disc',
          description: '<p>High thermal stability</p>',
          categories: [{ name: 'Brakes' }],
          tags: [{ name: 'fitment:Yamaha:R15:2020-2023' }],
          images: [{ src: 'https://cdn.example.com/disc.jpg' }],
          type: 'variable',
        },
      ];

      const mockVariations = [
        {
          id: 501,
          sku: 'DISC-300MM',
          price: '89.00',
          regular_price: '99.00',
          sale_price: '89.00',
          stock_quantity: 12,
          attributes: [{ name: 'Diameter', option: '300mm' }],
        },
      ];

      vi.spyOn(importer, 'fetchProductsPage').mockResolvedValue({
        products: mockProducts,
        totalPages: 1,
      });
      vi.spyOn(importer, 'fetchVariations').mockResolvedValue(mockVariations);

      const report = await importer.syncCatalog({ dryRun: true });
      expect(report.totalProcessed).toBe(1);
      expect(report.insertedCount).toBe(1);
      expect(report.errors).toHaveLength(0);

      const mapped = importer.mapWooProduct(mockProducts[0], mockVariations);
      expect(mapped.platformFeeBps).toBe(0);
      expect(mapped.hsnCode).toBe('8714');
      expect(mapped.gstSlab).toBe(28);
      expect(mapped.variants[0].sku).toBe('DISC-300MM');
      expect(mapped.variants[0].pricePaise).toBe(8900);
      expect(mapped.variants[0].compareAtPricePaise).toBe(9900);
      expect(mapped.variants[0].inventoryQuantity).toBe(12);
    });
  });
});
