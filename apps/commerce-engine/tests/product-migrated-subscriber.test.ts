import { describe, expect, it, vi } from 'vitest';
import {
  ProductMigratedIndexerSubscriber,
  type PulseAiClient,
} from '../src/subscribers/product-migrated-indexer.js';
import type { CatalogIndexService } from '../src/services/catalog-index.service.js';
import type { ZiroMigratedProduct } from '@ziro/migrator';

describe('ProductMigratedIndexerSubscriber', () => {
  it('triggers Meilisearch catalog upsert and Pulse AI vector embedding generation', async () => {
    const mockCatalogService: Partial<CatalogIndexService> = {
      upsertProduct: vi.fn().mockResolvedValue({ id: 'sprocket-520', status: 'enqueued' }),
    };

    const mockPulseClient: PulseAiClient = {
      upsertProductEmbedding: vi.fn().mockResolvedValue(undefined),
    };

    const subscriber = new ProductMigratedIndexerSubscriber({
      catalogIndexService: mockCatalogService as CatalogIndexService,
      pulseAiClient: mockPulseClient,
    });

    const sampleProduct: ZiroMigratedProduct = {
      idempotencyKey: 'ziro_mig_spr_001',
      handle: 'sprocket-520-45t',
      title: 'Lightweight Alloy Sprocket 520 45T',
      bodyHtml: '<p>High tensile aerospace alloy</p>',
      category: 'Transmission',
      tags: ['sprocket', 'chain'],
      hsnCode: '8714',
      gstSlab: 28,
      fitments: [{ make: 'Yamaha', model: 'R15', yearStart: 2020, yearEnd: 2024 }],
      variants: [
        {
          idempotencyKey: 'ziro_mig_spr_v1',
          sku: 'SPR-520-45T',
          title: '45 Teeth',
          pricePaise: 320000,
          inventoryQuantity: 40,
          options: {},
        },
      ],
      images: ['https://cdn.example.com/spr.png'],
      platformFeeBps: 0,
    };

    const result = await subscriber.handle({
      tenantId: 'tenant_pro',
      product: sampleProduct,
    });

    expect(result).toEqual({ meilisearch: true, pulseAi: true });
    expect(mockCatalogService.upsertProduct).toHaveBeenCalledWith('tenant_pro', {
      id: 'sprocket-520-45t',
      title: 'Lightweight Alloy Sprocket 520 45T',
      description: '<p>High tensile aerospace alloy</p>',
      category: 'Transmission',
      hsn: '8714',
      gst_slab: 28,
      variants: [
        {
          sku: 'SPR-520-45T',
          title: '45 Teeth',
          price_minor: 320000,
          stock: 40,
        },
      ],
    });
    expect(mockPulseClient.upsertProductEmbedding).toHaveBeenCalledWith('tenant_pro', sampleProduct);
  });
});
