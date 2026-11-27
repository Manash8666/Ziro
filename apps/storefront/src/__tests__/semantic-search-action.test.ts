import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { searchProductsSemantic } from '../app/actions/semantic-search';

describe('Storefront Semantic Search Server Action', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('fetches and maps results from Pulse AI with 0% platform fee invariant', async () => {
    const mockPulseResponse = {
      success: true,
      tenant_id: 'tenant-auto-parts',
      query: 'brake kit',
      count: 1,
      results: [
        {
          product_id: 'prod_mock_01',
          handle: 'mock-brake-kit',
          title: 'Mock Carbon Brake Kit',
          semantic_text: 'High performance track pads',
          hsn_code: '87083000',
          gst_slab_percent: 18,
          min_price_paise: 500000,
          total_stock: 12,
          fitment_matrix: [{ make: 'Porsche', model: '911 GT3' }],
          platform_fee_bps: 0,
          similarity_score: 0.96,
        },
      ],
      platform_fee_bps: 0,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPulseResponse,
    } as any);

    const res = await searchProductsSemantic('brake kit', undefined, 'tenant-auto-parts');

    expect(res.success).toBe(true);
    expect(res.source).toBe('pulse-ai');
    expect(res.count).toBe(1);
    expect(res.platformFeeBps).toBe(0);
    expect(res.results[0].handle).toBe('mock-brake-kit');
    expect(res.results[0].similarityScore).toBe(0.96);
    expect(res.results[0].platformFeeBps).toBe(0);
  });

  it('gracefully falls back to local catalog when Pulse AI endpoint fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Pulse AI Connection Refused'));

    const res = await searchProductsSemantic('brake pad');

    expect(res.success).toBe(true);
    expect(res.source).toBe('fallback');
    expect(res.results.length).toBeGreaterThan(0);
    expect(res.platformFeeBps).toBe(0);
    expect(res.results[0].handle).toContain('brake');
    expect(res.results.every((r) => r.platformFeeBps === 0)).toBe(true);
  });

  it('applies vehicle fitment filtering in fallback mode', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Offline'));

    const res = await searchProductsSemantic('', { make: 'Toyota', model: 'Fortuner' });

    expect(res.success).toBe(true);
    expect(res.source).toBe('fallback');
    expect(res.results.length).toBe(1);
    expect(res.results[0].handle).toBe('nitrogen-charged-shock-absorbers');
    expect(res.results[0].fitmentMatrix[0].make).toBe('Toyota');
  });

  it('returns empty result for empty query with no fitment filter', async () => {
    const res = await searchProductsSemantic('');
    expect(res.success).toBe(true);
    expect(res.count).toBe(0);
    expect(res.results).toEqual([]);
    expect(res.platformFeeBps).toBe(0);
  });
});
