import { createHash } from 'node:crypto';
import type { FitmentEntry, GstSlabPercent } from './types.js';

/**
 * Deterministic HSN Code and GST Slab inference rules for migrated catalogs.
 * Standardized across Indian GST classifications.
 */
interface InferenceRule {
  keywords: string[];
  hsnCode: string;
  gstSlab: GstSlabPercent;
}

const INFERENCE_RULES: InferenceRule[] = [
  {
    keywords: ['brake', 'clutch', 'chain', 'sprocket', 'disc', 'pad', 'lever', 'suspension', 'fork', 'shock'],
    hsnCode: '8714',
    gstSlab: 28,
  },
  {
    keywords: ['battery', 'batteries', 'accumulator'],
    hsnCode: '8507',
    gstSlab: 28,
  },
  {
    keywords: ['tyre', 'tyres', 'tire', 'tires', 'tube'],
    hsnCode: '4011',
    gstSlab: 28,
  },
  {
    keywords: ['oil', 'lubricant', 'brake fluid', 'coolant', 'grease', 'engine oil'],
    hsnCode: '2710',
    gstSlab: 18,
  },
  {
    keywords: ['helmet', 'helmets', 'visor'],
    hsnCode: '6506',
    gstSlab: 18,
  },
  {
    keywords: ['whey', 'protein', 'supplement', 'creatine', 'bcaa'],
    hsnCode: '2106',
    gstSlab: 18,
  },
  {
    keywords: ['jersey', 't-shirt', 'shirt', 'jacket', 'glove', 'gloves', 'apparel', 'riding gear', 'pant'],
    hsnCode: '6109',
    gstSlab: 5,
  },
];

const DEFAULT_HSN = '8708';
const DEFAULT_GST: GstSlabPercent = 18;

export function inferHsnAndGst(
  title: string,
  category?: string,
  tags: string[] = []
): { hsnCode: string; gstSlab: GstSlabPercent } {
  const combinedText = `${title} ${category || ''} ${tags.join(' ')}`.toLowerCase();

  for (const rule of INFERENCE_RULES) {
    if (rule.keywords.some((kw) => combinedText.includes(kw))) {
      return { hsnCode: rule.hsnCode, gstSlab: rule.gstSlab };
    }
  }

  return { hsnCode: DEFAULT_HSN, gstSlab: DEFAULT_GST };
}

/**
 * Extracts vehicle fitment matrices from product tags.
 * Format: fitment:Make:Model:YearRange (e.g. `fitment:Yamaha:YZF-R15:2018-2024` or `fitment:KTM:Duke-390:2021`)
 */
export function extractFitmentFromTags(tags: string[]): FitmentEntry[] {
  const fitments: FitmentEntry[] = [];

  for (const tag of tags) {
    const trimmed = tag.trim();
    if (!trimmed.toLowerCase().startsWith('fitment:')) {
      continue;
    }

    const parts = trimmed.split(':');
    if (parts.length >= 4) {
      const make = parts[1].trim();
      const model = parts[2].trim();
      const yearStr = parts[3].trim();

      if (yearStr.includes('-')) {
        const [startStr, endStr] = yearStr.split('-');
        const yearStart = parseInt(startStr, 10);
        const yearEnd = parseInt(endStr, 10);
        if (!isNaN(yearStart) && !isNaN(yearEnd)) {
          fitments.push({ make, model, yearStart, yearEnd });
        }
      } else {
        const year = parseInt(yearStr, 10);
        if (!isNaN(year)) {
          fitments.push({ make, model, yearStart: year, yearEnd: year });
        }
      }
    }
  }

  return fitments;
}

/**
 * Generates deterministic idempotency key for catalog imports.
 */
export function generateMigrationIdempotencyKey(
  tenantId: string,
  source: 'shopify' | 'woocommerce',
  sourceId: string | number,
  handleOrSku: string
): string {
  const digest = createHash('sha256')
    .update(`${tenantId}:${source}:${sourceId}:${handleOrSku}`)
    .digest('hex');
  return `ziro_mig_${digest}`;
}
