import { MoneyMinorSchema, type MoneyMinor } from '../schemas/commerce.js';

const GSTIN_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PINCODE_REGEX = /^\d{6}$/;
const HSN_REGEX = /^\d{2,8}$/;
const DEFAULT_GST_RATE_BPS = 1800;

/**
 * Mandatory inter-state e-Way bill consignment value threshold in paise (₹50,000.00).
 */
export const EWAY_BILL_THRESHOLD_MINOR = 5_000_000;

/**
 * Official Indian GST State & Union Territory code directory (`01`–`38` plus `97` Other Territory).
 */
export const INDIAN_STATE_CODES: Record<string, string> = Object.freeze({
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman & Diu',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh (Old)',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
});

/**
 * Curated offline HSN/SAC GST rate registry in basis points (100 bps = 1%).
 */
export const HSN_SLAB_BPS_REGISTRY: Record<string, number> = Object.freeze({
  '04': 0,
  '0401': 0,
  '07': 0,
  '0701': 0,
  '0713': 0,
  '09': 500,
  '0901': 500,
  '0902': 500,
  '10': 0,
  '1001': 0,
  '1006': 0,
  '1701': 500,
  '2106': 1800,
  '2710': 1800,
  '30': 1200,
  '3004': 1200,
  '4011': 2800,
  '49': 0,
  '4901': 0,
  '52': 500,
  '5208': 500,
  '61': 500,
  '6109': 500,
  '62': 1200,
  '6203': 1200,
  '6403': 1200,
  '7318': 1800,
  '84': 1800,
  '8409': 1800,
  '8421': 1800,
  '8471': 1800,
  '85': 1800,
  '8504': 1800,
  '8507': 1800,
  '8517': 1800,
  '8518': 1800,
  '8528': 1800,
  '87': 1800,
  '8708': 1800,
  '8714': 1800,
  '9004': 1200,
  '9403': 1800,
  '9503': 1200,
  '99': 1800,
  '9965': 500,
  '9983': 1800,
});

export interface GstinValidationResult {
  valid: boolean;
  stateCode?: string;
  error?: string;
}

export interface GstBreakupInput {
  taxableMinor: MoneyMinor;
  hsnCode: string;
  gstRateBps?: number;
  originStateCode: string;
  destinationStateCode: string;
}

export interface GstBreakupResult {
  taxableMinor: MoneyMinor;
  hsnCode: string;
  gstRateBps: number;
  originStateCode: string;
  destinationStateCode: string;
  isInterState: boolean;
  cgstMinor: MoneyMinor;
  sgstMinor: MoneyMinor;
  igstMinor: MoneyMinor;
  totalTaxMinor: MoneyMinor;
  totalWithTaxMinor: MoneyMinor;
}

export interface EwayBillInput {
  taxableMinor: MoneyMinor;
  totalTaxMinor: MoneyMinor;
  cgstMinor?: MoneyMinor;
  sgstMinor?: MoneyMinor;
  igstMinor?: MoneyMinor;
  gstRateBps?: number;
  originStateCode?: string;
  destinationStateCode?: string;
  isInterState?: boolean;
  consignmentValueMinor?: MoneyMinor;
  hsnCode: string;
  fromPincode: string;
  toPincode: string;
  supplierGstin: string;
  recipientGstin?: string;
  supplyType?: 'OUTWARD' | 'INWARD';
  subSupplyType?: string;
  documentType?: 'INV' | 'CHL' | 'BIL' | 'BOE' | 'OTH';
  documentNo?: string;
  documentDate?: string;
  transMode?: '1' | '2' | '3' | '4';
  transDistanceKm?: number;
  vehicleNo?: string;
  transporterId?: string;
}

export interface EwayBillItem {
  hsnCode: string;
  taxableMinor: MoneyMinor;
  cgstMinor: MoneyMinor;
  sgstMinor: MoneyMinor;
  igstMinor: MoneyMinor;
  gstRateBps: number;
}

export interface EwayBillPayload {
  version: '1.0.03';
  supplyType: 'OUTWARD' | 'INWARD';
  subSupplyType: string;
  docType: 'INV' | 'CHL' | 'BIL' | 'BOE' | 'OTH';
  docNo: string;
  docDate: string;
  fromGstin: string;
  fromStateCode: string;
  fromPincode: string;
  toGstin: string;
  toStateCode: string;
  toPincode: string;
  hsnCode: string;
  taxableMinor: MoneyMinor;
  cgstMinor: MoneyMinor;
  sgstMinor: MoneyMinor;
  igstMinor: MoneyMinor;
  totalTaxMinor: MoneyMinor;
  totalValueMinor: MoneyMinor;
  transMode: '1' | '2' | '3' | '4';
  transDistanceKm: number;
  vehicleNo?: string;
  transporterId?: string;
  itemList: EwayBillItem[];
}

export type DdpCorridorCode = 'IN' | 'US' | 'GB' | 'EU' | 'AE' | 'SG' | 'AU' | 'CA';

export interface DdpCorridorRule {
  countryCode: DdpCorridorCode;
  currencyCode: string;
  dutyDeMinimisMinor: MoneyMinor;
  vatDeMinimisMinor: MoneyMinor;
  vatRateBps: number;
  defaultDutyRateBps: number;
  chapterDutyRatesBps: Record<string, number>;
  valuationBasis: 'CIF' | 'FOB';
}

export interface DutyTariffProvider {
  getCorridorRule(destinationCountry: string): DdpCorridorRule | undefined;
  resolveDutyRateBps(destinationCountry: string, hsCode: string): number;
  resolveVatRateBps(destinationCountry: string, hsCode: string): number;
}

export interface DdpInput {
  destinationCountry: string;
  hsCode: string;
  customsValueMinor: MoneyMinor;
  shippingMinor?: MoneyMinor;
  insuranceMinor?: MoneyMinor;
}

export interface DdpResult {
  destinationCountry: DdpCorridorCode;
  currencyCode: string;
  hsCode: string;
  customsValueMinor: MoneyMinor;
  shippingMinor: MoneyMinor;
  insuranceMinor: MoneyMinor;
  dutyRateBps: number;
  vatRateBps: number;
  dutyDeMinimisApplied: boolean;
  vatDeMinimisApplied: boolean;
  dutyMinor: MoneyMinor;
  vatMinor: MoneyMinor;
  landedTotalMinor: MoneyMinor;
}

function assertMoneyMinor(value: number, fieldName: string): MoneyMinor {
  const parsed = MoneyMinorSchema.safeParse(value);
  if (!parsed.success) {
    throw new RangeError(`${fieldName} must be a safe non-negative integer minor unit`);
  }
  return parsed.data;
}

function assertBasisPoints(value: number, fieldName: string): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > 10_000) {
    throw new RangeError(`${fieldName} must be an integer basis-point rate between 0 and 10000`);
  }
  return value;
}

function assertStateCode(stateCode: string, fieldName: string): string {
  const normalized = stateCode.trim();
  if (!(normalized in INDIAN_STATE_CODES)) {
    throw new Error(`${fieldName} is not a valid Indian GST state code: ${stateCode}`);
  }
  return normalized;
}

function normalizeHsCode(hsCode: string): string {
  const clean = hsCode.trim().replace(/\s+/g, '');
  if (!HSN_REGEX.test(clean)) {
    throw new Error(`Invalid HSN/HS code: ${hsCode}`);
  }
  return clean;
}

function multiplyBpsRounded(amountMinor: number, rateBps: number): MoneyMinor {
  const numerator = BigInt(amountMinor) * BigInt(rateBps);
  const rounded = (numerator + 5_000n) / 10_000n;
  const result = Number(rounded);
  if (!Number.isSafeInteger(result)) {
    throw new RangeError('Calculated minor unit amount exceeds safe integer bounds');
  }
  return result;
}

function lookupPrefixRate(
  table: Record<string, number>,
  code: string,
  fallbackRateBps: number,
): number {
  const lengths = [code.length, 6, 4, 2];
  for (const len of lengths) {
    if (code.length >= len) {
      const candidate = table[code.slice(0, len)];
      if (candidate !== undefined) {
        return candidate;
      }
    }
  }
  return fallbackRateBps;
}

/**
 * Computes the official 15th-character Mod-36 weighted check digit for a 14-character GSTIN prefix.
 */
export function computeGstinCheckDigit(prefix14: string): string {
  if (prefix14.length !== 14) {
    throw new Error('GSTIN prefix must be exactly 14 characters');
  }
  let sum = 0;
  for (let i = 0; i < 14; i += 1) {
    const ch = prefix14[i]!;
    const codePoint = GSTIN_CHARSET.indexOf(ch);
    if (codePoint < 0) {
      throw new Error(`Invalid GSTIN character at position ${i + 1}: ${ch}`);
    }
    const factor = i % 2 === 0 ? 1 : 2;
    const product = codePoint * factor;
    const quotient = (product - (product % 36)) / 36;
    sum += quotient + (product % 36);
  }
  const checkIndex = (36 - (sum % 36)) % 36;
  return GSTIN_CHARSET[checkIndex]!;
}

/**
 * Validates a 15-character Indian GSTIN against structural format, state code directory, and Mod-36 checksum.
 */
export function validateGstin(gstin: string): GstinValidationResult {
  if (typeof gstin !== 'string') {
    return { valid: false, error: 'GSTIN must be a string' };
  }
  const normalized = gstin.trim().toUpperCase();
  if (normalized.length !== 15) {
    return { valid: false, error: 'GSTIN must be exactly 15 characters' };
  }
  if (!GSTIN_REGEX.test(normalized)) {
    return { valid: false, error: 'Invalid GSTIN structural format' };
  }
  const stateCode = normalized.slice(0, 2);
  if (!(stateCode in INDIAN_STATE_CODES)) {
    return { valid: false, error: `Unknown Indian GST state code: ${stateCode}` };
  }
  const expectedCheckDigit = computeGstinCheckDigit(normalized.slice(0, 14));
  if (normalized[14] !== expectedCheckDigit) {
    return { valid: false, error: 'Invalid GSTIN Mod-36 check digit' };
  }
  return { valid: true, stateCode };
}

/**
 * Resolves GST rate in basis points from an explicit override or offline HSN/SAC slab registry.
 */
export function resolveGstRateBps(hsnCode: string, overrideBps?: number): number {
  if (overrideBps !== undefined) {
    return assertBasisPoints(overrideBps, 'gstRateBps');
  }
  const cleanHsn = normalizeHsCode(hsnCode);
  return lookupPrefixRate(HSN_SLAB_BPS_REGISTRY, cleanHsn, DEFAULT_GST_RATE_BPS);
}

/**
 * Computes exact integer minor-unit Indian GST breakup (`CGST + SGST === totalTaxMinor` intra-state, `IGST` inter-state).
 */
export function calculateGstBreakup(input: GstBreakupInput): GstBreakupResult {
  const taxableMinor = assertMoneyMinor(input.taxableMinor, 'taxableMinor');
  const originStateCode = assertStateCode(input.originStateCode, 'originStateCode');
  const destinationStateCode = assertStateCode(input.destinationStateCode, 'destinationStateCode');
  const cleanHsn = normalizeHsCode(input.hsnCode);
  const gstRateBps = resolveGstRateBps(cleanHsn, input.gstRateBps);

  const totalTaxMinor = multiplyBpsRounded(taxableMinor, gstRateBps);
  const isInterState = originStateCode !== destinationStateCode;

  let cgstMinor = 0;
  let sgstMinor = 0;
  let igstMinor = 0;

  if (isInterState) {
    igstMinor = totalTaxMinor;
  } else {
    // Allocate any odd 1-paisa remainder to CGST so cgstMinor + sgstMinor === totalTaxMinor exactly.
    sgstMinor = Number(BigInt(totalTaxMinor) / 2n);
    cgstMinor = totalTaxMinor - sgstMinor;
  }

  const totalWithTaxMinor = taxableMinor + totalTaxMinor;
  if (!Number.isSafeInteger(totalWithTaxMinor)) {
    throw new RangeError('totalWithTaxMinor exceeds safe integer bounds');
  }

  return {
    taxableMinor,
    hsnCode: cleanHsn,
    gstRateBps,
    originStateCode,
    destinationStateCode,
    isInterState,
    cgstMinor,
    sgstMinor,
    igstMinor,
    totalTaxMinor,
    totalWithTaxMinor,
  };
}

/**
 * Generates a NIC e-Way Bill JSON payload when consignment is inter-state and >= ₹50,000 (`5_000_000` paise).
 */
export function buildEwayBillPayload(input: EwayBillInput): EwayBillPayload | null {
  const taxableMinor = assertMoneyMinor(input.taxableMinor, 'taxableMinor');
  const totalTaxMinor = assertMoneyMinor(input.totalTaxMinor, 'totalTaxMinor');
  const cgstMinor = assertMoneyMinor(input.cgstMinor ?? 0, 'cgstMinor');
  const sgstMinor = assertMoneyMinor(input.sgstMinor ?? 0, 'sgstMinor');
  const igstMinor = assertMoneyMinor(input.igstMinor ?? totalTaxMinor, 'igstMinor');
  const consignmentThresholdMinor = assertMoneyMinor(
    input.consignmentValueMinor ?? taxableMinor,
    'consignmentValueMinor',
  );

  const supplierCheck = validateGstin(input.supplierGstin);
  if (!supplierCheck.valid || !supplierCheck.stateCode) {
    throw new Error(supplierCheck.error ?? 'Invalid supplier GSTIN');
  }
  const normalizedSupplierGstin = input.supplierGstin.trim().toUpperCase();

  let normalizedRecipientGstin = 'URP';
  let derivedRecipientState = input.destinationStateCode;
  if (input.recipientGstin !== undefined && input.recipientGstin.trim().toUpperCase() !== 'URP') {
    const recipientCheck = validateGstin(input.recipientGstin);
    if (!recipientCheck.valid || !recipientCheck.stateCode) {
      throw new Error(recipientCheck.error ?? 'Invalid recipient GSTIN');
    }
    normalizedRecipientGstin = input.recipientGstin.trim().toUpperCase();
    derivedRecipientState = derivedRecipientState ?? recipientCheck.stateCode;
  }

  const fromPincode = input.fromPincode.trim();
  const toPincode = input.toPincode.trim();
  if (!PINCODE_REGEX.test(fromPincode)) {
    throw new Error(`Invalid fromPincode: ${input.fromPincode}`);
  }
  if (!PINCODE_REGEX.test(toPincode)) {
    throw new Error(`Invalid toPincode: ${input.toPincode}`);
  }

  const fromStateCode = input.originStateCode
    ? assertStateCode(input.originStateCode, 'originStateCode')
    : supplierCheck.stateCode;
  const toStateCode = derivedRecipientState
    ? assertStateCode(derivedRecipientState, 'destinationStateCode')
    : fromStateCode;

  const isInterState = input.isInterState ?? fromStateCode !== toStateCode;
  if (!isInterState || consignmentThresholdMinor < EWAY_BILL_THRESHOLD_MINOR) {
    return null;
  }

  const cleanHsn = normalizeHsCode(input.hsnCode);
  const gstRateBps = resolveGstRateBps(cleanHsn, input.gstRateBps);
  const totalValueMinor = taxableMinor + totalTaxMinor;
  if (!Number.isSafeInteger(totalValueMinor)) {
    throw new RangeError('totalValueMinor exceeds safe integer bounds');
  }

  const transDistanceKm = input.transDistanceKm ?? 0;
  if (!Number.isSafeInteger(transDistanceKm) || transDistanceKm < 0) {
    throw new RangeError('transDistanceKm must be a safe non-negative integer');
  }

  const payload: EwayBillPayload = {
    version: '1.0.03',
    supplyType: input.supplyType ?? 'OUTWARD',
    subSupplyType: input.subSupplyType ?? 'SUPPLY',
    docType: input.documentType ?? 'INV',
    docNo: input.documentNo ?? 'DRAFT',
    docDate: input.documentDate ?? '',
    fromGstin: normalizedSupplierGstin,
    fromStateCode,
    fromPincode,
    toGstin: normalizedRecipientGstin,
    toStateCode,
    toPincode,
    hsnCode: cleanHsn,
    taxableMinor,
    cgstMinor,
    sgstMinor,
    igstMinor,
    totalTaxMinor,
    totalValueMinor,
    transMode: input.transMode ?? '1',
    transDistanceKm,
    itemList: [
      {
        hsnCode: cleanHsn,
        taxableMinor,
        cgstMinor,
        sgstMinor,
        igstMinor,
        gstRateBps,
      },
    ],
  };

  if (input.vehicleNo !== undefined) {
    payload.vehicleNo = input.vehicleNo;
  }
  if (input.transporterId !== undefined) {
    payload.transporterId = input.transporterId;
  }

  return payload;
}

/**
 * Deterministic offline DDP customs duty & VAT corridor rules across 8 supported jurisdictions.
 */
export const DEFAULT_DDP_CORRIDORS: Record<DdpCorridorCode, DdpCorridorRule> = Object.freeze({
  IN: {
    countryCode: 'IN',
    currencyCode: 'INR',
    dutyDeMinimisMinor: 0,
    vatDeMinimisMinor: 0,
    vatRateBps: 1800,
    defaultDutyRateBps: 1000,
    chapterDutyRatesBps: { '61': 2000, '62': 2000, '84': 750, '85': 1000, '87': 1500 },
    valuationBasis: 'CIF',
  },
  US: {
    countryCode: 'US',
    currencyCode: 'USD',
    dutyDeMinimisMinor: 80_000, // $800 Section 321
    vatDeMinimisMinor: 80_000,
    vatRateBps: 0,
    defaultDutyRateBps: 500,
    chapterDutyRatesBps: { '61': 1650, '62': 1650, '84': 250, '85': 200, '87': 250 },
    valuationBasis: 'FOB',
  },
  GB: {
    countryCode: 'GB',
    currencyCode: 'GBP',
    dutyDeMinimisMinor: 13_500, // £135 customs threshold
    vatDeMinimisMinor: 0,
    vatRateBps: 2000,
    defaultDutyRateBps: 400,
    chapterDutyRatesBps: { '61': 1200, '62': 1200, '84': 250, '85': 300, '87': 450 },
    valuationBasis: 'CIF',
  },
  EU: {
    countryCode: 'EU',
    currencyCode: 'EUR',
    dutyDeMinimisMinor: 15_000, // €150 IOSS customs relief
    vatDeMinimisMinor: 0,
    vatRateBps: 1900,
    defaultDutyRateBps: 450,
    chapterDutyRatesBps: { '61': 1200, '62': 1200, '84': 300, '85': 350, '87': 450 },
    valuationBasis: 'CIF',
  },
  AE: {
    countryCode: 'AE',
    currencyCode: 'AED',
    dutyDeMinimisMinor: 30_000, // AED 300
    vatDeMinimisMinor: 0,
    vatRateBps: 500,
    defaultDutyRateBps: 500,
    chapterDutyRatesBps: { '61': 500, '62': 500, '84': 500, '85': 500, '87': 500 },
    valuationBasis: 'CIF',
  },
  SG: {
    countryCode: 'SG',
    currencyCode: 'SGD',
    dutyDeMinimisMinor: 40_000, // S$400
    vatDeMinimisMinor: 0,
    vatRateBps: 900,
    defaultDutyRateBps: 0,
    chapterDutyRatesBps: { '22': 1000, '24': 1000, '87': 0 },
    valuationBasis: 'CIF',
  },
  AU: {
    countryCode: 'AU',
    currencyCode: 'AUD',
    dutyDeMinimisMinor: 100_000, // A$1,000
    vatDeMinimisMinor: 0,
    vatRateBps: 1000,
    defaultDutyRateBps: 500,
    chapterDutyRatesBps: { '61': 500, '62': 500, '84': 500, '85': 500, '87': 500 },
    valuationBasis: 'CIF',
  },
  CA: {
    countryCode: 'CA',
    currencyCode: 'CAD',
    dutyDeMinimisMinor: 15_000, // C$150
    vatDeMinimisMinor: 4_000, // C$40
    vatRateBps: 500,
    defaultDutyRateBps: 650,
    chapterDutyRatesBps: { '61': 1800, '62': 1800, '84': 500, '85': 400, '87': 600 },
    valuationBasis: 'FOB',
  },
});

/**
 * Default offline DutyTariffProvider backed by `DEFAULT_DDP_CORRIDORS`.
 */
export class StaticDutyTariffProvider implements DutyTariffProvider {
  constructor(private readonly corridors: Record<string, DdpCorridorRule> = DEFAULT_DDP_CORRIDORS) {}

  getCorridorRule(destinationCountry: string): DdpCorridorRule | undefined {
    const code = destinationCountry.trim().toUpperCase();
    return this.corridors[code];
  }

  resolveDutyRateBps(destinationCountry: string, hsCode: string): number {
    const rule = this.getCorridorRule(destinationCountry);
    if (!rule) {
      throw new Error(`Unsupported DDP destination corridor: ${destinationCountry}`);
    }
    const cleanHs = normalizeHsCode(hsCode);
    return lookupPrefixRate(rule.chapterDutyRatesBps, cleanHs, rule.defaultDutyRateBps);
  }

  resolveVatRateBps(destinationCountry: string, hsCode: string): number {
    const rule = this.getCorridorRule(destinationCountry);
    if (!rule) {
      throw new Error(`Unsupported DDP destination corridor: ${destinationCountry}`);
    }
    const cleanHs = normalizeHsCode(hsCode);
    if (rule.countryCode === 'IN') {
      return resolveGstRateBps(cleanHs);
    }
    return rule.vatRateBps;
  }
}

export const defaultDutyTariffProvider: DutyTariffProvider = new StaticDutyTariffProvider();

/**
 * Calculates deterministic integer minor-unit customs duty, import VAT/GST, and landed DDP total.
 */
export function calculateDdpLandedCost(
  input: DdpInput,
  provider: DutyTariffProvider = defaultDutyTariffProvider,
): DdpResult {
  const customsValueMinor = assertMoneyMinor(input.customsValueMinor, 'customsValueMinor');
  const shippingMinor = assertMoneyMinor(input.shippingMinor ?? 0, 'shippingMinor');
  const insuranceMinor = assertMoneyMinor(input.insuranceMinor ?? 0, 'insuranceMinor');
  const cleanHs = normalizeHsCode(input.hsCode);
  const countryKey = input.destinationCountry.trim().toUpperCase();

  const rule = provider.getCorridorRule(countryKey);
  if (!rule) {
    throw new Error(`Unsupported DDP destination corridor: ${input.destinationCountry}`);
  }

  const dutyDeMinimisApplied = customsValueMinor <= rule.dutyDeMinimisMinor;
  const dutyRateBps = dutyDeMinimisApplied
    ? 0
    : assertBasisPoints(provider.resolveDutyRateBps(countryKey, cleanHs), 'dutyRateBps');

  const dutyValuationMinor =
    rule.valuationBasis === 'CIF'
      ? customsValueMinor + shippingMinor + insuranceMinor
      : customsValueMinor;
  if (!Number.isSafeInteger(dutyValuationMinor)) {
    throw new RangeError('dutyValuationMinor exceeds safe integer bounds');
  }

  const dutyMinor = dutyDeMinimisApplied
    ? 0
    : multiplyBpsRounded(dutyValuationMinor, dutyRateBps);

  const vatDeMinimisApplied = customsValueMinor <= rule.vatDeMinimisMinor;
  const vatRateBps = vatDeMinimisApplied
    ? 0
    : assertBasisPoints(provider.resolveVatRateBps(countryKey, cleanHs), 'vatRateBps');

  const vatBaseMinor = dutyValuationMinor + dutyMinor;
  if (!Number.isSafeInteger(vatBaseMinor)) {
    throw new RangeError('vatBaseMinor exceeds safe integer bounds');
  }

  const vatMinor = vatDeMinimisApplied ? 0 : multiplyBpsRounded(vatBaseMinor, vatRateBps);

  const landedTotalMinor =
    customsValueMinor + shippingMinor + insuranceMinor + dutyMinor + vatMinor;
  if (!Number.isSafeInteger(landedTotalMinor)) {
    throw new RangeError('landedTotalMinor exceeds safe integer bounds');
  }

  return {
    destinationCountry: rule.countryCode,
    currencyCode: rule.currencyCode,
    hsCode: cleanHs,
    customsValueMinor,
    shippingMinor,
    insuranceMinor,
    dutyRateBps,
    vatRateBps,
    dutyDeMinimisApplied,
    vatDeMinimisApplied,
    dutyMinor,
    vatMinor,
    landedTotalMinor,
  };
}
