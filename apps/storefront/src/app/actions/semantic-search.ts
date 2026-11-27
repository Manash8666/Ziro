'use server';

export interface SemanticFitmentFilter {
  year?: number | string;
  make?: string;
  model?: string;
}

export interface SemanticSearchResultItem {
  productId: string;
  handle: string;
  title: string;
  semanticText: string;
  hsnCode: string;
  gstSlabPercent: number;
  minPricePaise: number;
  totalStock: number;
  fitmentMatrix: Array<{
    make?: string;
    model?: string;
    yearStart?: number;
    yearEnd?: number;
    engine?: string;
  }>;
  platformFeeBps: number;
  similarityScore: number;
}

export interface SemanticSearchResponse {
  success: boolean;
  tenantId: string;
  query: string;
  count: number;
  results: SemanticSearchResultItem[];
  platformFeeBps: number;
  source: 'pulse-ai' | 'fallback';
}

const LOCAL_FALLBACK_CATALOG: SemanticSearchResultItem[] = [
  {
    productId: 'prod_brk_01',
    handle: 'ceramic-brake-pad-creta',
    title: 'High-Friction Ceramic Front Brake Pad Set',
    semanticText: 'Ceramic front disc brake pads engineered for superior thermal stability and dust reduction',
    hsnCode: '87083000',
    gstSlabPercent: 18,
    minPricePaise: 349900,
    totalStock: 45,
    fitmentMatrix: [{ make: 'Hyundai', model: 'Creta', yearStart: 2020, yearEnd: 2024 }],
    platformFeeBps: 0,
    similarityScore: 0.95,
  },
  {
    productId: 'prod_brk_02',
    handle: 'drilled-disc-rotors-pair',
    title: 'Slotted & Drilled Ventilated Disc Rotors (Pair)',
    semanticText: 'Ventilated performance disc rotors with zinc anti-corrosion plating for heavy SUVs',
    hsnCode: '87083000',
    gstSlabPercent: 18,
    minPricePaise: 899900,
    totalStock: 20,
    fitmentMatrix: [{ make: 'Mahindra', model: 'Thar', yearStart: 2019, yearEnd: 2024 }],
    platformFeeBps: 0,
    similarityScore: 0.92,
  },
  {
    productId: 'prod_sus_01',
    handle: 'nitrogen-charged-shock-absorbers',
    title: 'Heavy-Duty Nitrogen Charged Monotube Dampers',
    semanticText: 'Off-road multi-stage valved nitrogen shock absorbers for 4x4 overland applications',
    hsnCode: '87088000',
    gstSlabPercent: 28,
    minPricePaise: 1450000,
    totalStock: 15,
    fitmentMatrix: [{ make: 'Toyota', model: 'Fortuner', yearStart: 2016, yearEnd: 2024 }],
    platformFeeBps: 0,
    similarityScore: 0.88,
  },
  {
    productId: 'prod_eng_01',
    handle: 'high-flow-cold-air-intake',
    title: 'Carbon-Composite Cold Air Intake System',
    semanticText: 'High flow cold air intake with dry conical filter element for turbo diesel engines',
    hsnCode: '84213920',
    gstSlabPercent: 18,
    minPricePaise: 1120000,
    totalStock: 30,
    fitmentMatrix: [{ make: 'Tata', model: 'Harrier', yearStart: 2020, yearEnd: 2024 }],
    platformFeeBps: 0,
    similarityScore: 0.84,
  },
];

export async function searchProductsSemantic(
  query: string,
  fitment?: SemanticFitmentFilter,
  tenantId: string = 'tenant-auto-parts',
  limit: number = 10
): Promise<SemanticSearchResponse> {
  const pulseUrl = process.env.PULSE_AI_URL || 'http://127.0.0.1:8000';
  const serviceToken = process.env.ZIRO_INTERNAL_SERVICE_TOKEN || 'ziro-dev-service-token';

  const cleanedQuery = (query || '').trim();
  if (!cleanedQuery && (!fitment || (!fitment.make && !fitment.model))) {
    return {
      success: true,
      tenantId,
      query: '',
      count: 0,
      results: [],
      platformFeeBps: 0,
      source: 'pulse-ai',
    };
  }

  const payload: Record<string, unknown> = {
    tenant_id: tenantId,
    query: cleanedQuery || `${fitment?.make || ''} ${fitment?.model || ''} parts`.trim(),
    limit,
    platform_fee_bps: 0,
  };

  if (fitment && (fitment.make || fitment.model)) {
    payload.fitment_filter = {
      ...(fitment.make ? { make: fitment.make } : {}),
      ...(fitment.model ? { model: fitment.model } : {}),
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${pulseUrl}/v1/embeddings/products/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceToken}`,
        'X-Ziro-Service-Token': serviceToken,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const mappedResults: SemanticSearchResultItem[] = (data.results || []).map((r: any) => ({
        productId: r.product_id,
        handle: r.handle,
        title: r.title,
        semanticText: r.semantic_text || '',
        hsnCode: r.hsn_code,
        gstSlabPercent: r.gst_slab_percent,
        minPricePaise: r.min_price_paise,
        totalStock: r.total_stock,
        fitmentMatrix: r.fitment_matrix || [],
        platformFeeBps: 0, // Strict 0% GMV assertion
        similarityScore: r.similarity_score || 0,
      }));

      return {
        success: true,
        tenantId,
        query: cleanedQuery,
        count: mappedResults.length,
        results: mappedResults,
        platformFeeBps: 0,
        source: 'pulse-ai',
      };
    }
  } catch (err) {
    // Pulse AI unreachable or timeout - gracefully fallback to local catalog
  }

  // Graceful local fallback filter
  const qLower = cleanedQuery.toLowerCase();
  const filtered = LOCAL_FALLBACK_CATALOG.filter((item) => {
    const matchesText =
      !cleanedQuery ||
      item.title.toLowerCase().includes(qLower) ||
      item.semanticText.toLowerCase().includes(qLower) ||
      item.handle.toLowerCase().includes(qLower);

    if (!matchesText) return false;

    if (fitment?.make) {
      const hasMake = item.fitmentMatrix.some(
        (f) => f.make?.toLowerCase() === fitment.make?.toLowerCase()
      );
      if (!hasMake) return false;
    }

    if (fitment?.model) {
      const hasModel = item.fitmentMatrix.some(
        (f) => f.model?.toLowerCase() === fitment.model?.toLowerCase()
      );
      if (!hasModel) return false;
    }

    return true;
  });

  return {
    success: true,
    tenantId,
    query: cleanedQuery,
    count: filtered.length,
    results: filtered.slice(0, limit),
    platformFeeBps: 0,
    source: 'fallback',
  };
}
