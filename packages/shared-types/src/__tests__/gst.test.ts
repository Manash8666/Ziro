import { describe, expect, it } from 'vitest';
import {
  INDIAN_STATE_CODES,
  HSN_SLAB_BPS_REGISTRY,
  DEFAULT_DDP_CORRIDORS,
  validateGstin,
  resolveGstRateBps,
  calculateGstBreakup,
  buildEwayBillPayload,
  calculateDdpLandedCost,
  type DutyTariffProvider,
} from '../gst/calculator.js';

describe('Indian GST, GSTIN, e-Way & Global DDP', () => {
  it('validates authentic Mod-36 GSTIN and rejects corrupted check digit', () => {
    // 29ABCDE1234F1Z + computed Mod-36 check digit
    const valid = validateGstin('29ABCDE1234F1ZW');
    expect(valid.valid).toBe(true);
    expect(valid.stateCode).toBe('29');
    expect(validateGstin('29ABCDE1234F1ZX').valid).toBe(false);
    expect(validateGstin('99ABCDE1234F1ZW').valid).toBe(false);
  });

  it('exposes all 38 Indian state/UT codes (01-38) plus 97 Other Territory', () => {
    for (let i = 1; i <= 38; i += 1) {
      const code = String(i).padStart(2, '0');
      expect(INDIAN_STATE_CODES[code]).toBeTruthy();
    }
    expect(INDIAN_STATE_CODES['97']).toBe('Other Territory');
    expect(Object.keys(INDIAN_STATE_CODES)).toHaveLength(39);
  });

  it('rejects malformed GSTIN formats, invalid entity digits, and invalid check digits', () => {
    expect(validateGstin('').valid).toBe(false);
    expect(validateGstin('29ABCDE1234F1Z').valid).toBe(false);
    expect(validateGstin('29ABCDE1234F0Z5').valid).toBe(false);
    expect(validateGstin('29123451234F1ZW').valid).toBe(false);
    expect(validateGstin('27ABCDE1234F1Z0').valid).toBe(true);
  });

  it('resolves HSN slabs and validates overrides', () => {
    expect(HSN_SLAB_BPS_REGISTRY['8708']).toBe(1800);
    expect(resolveGstRateBps('8708')).toBe(1800);
    expect(resolveGstRateBps('870899')).toBe(1800);
    expect(resolveGstRateBps('4901')).toBe(0);
    expect(resolveGstRateBps('8708', 2800)).toBe(2800);
    expect(() => resolveGstRateBps('8708', -100)).toThrow();
    expect(() => resolveGstRateBps('8708', 12.5)).toThrow();
  });

  it('splits intra-state GST into CGST+SGST conserving exact integer paise on odd amounts', () => {
    const intra = calculateGstBreakup({
      taxableMinor: 10005, // ₹100.05 -> 5% = 500.25 -> 500 paise -> 250 + 250; try 18% on 101 = 18.18; try 5% on 1020 -> 51 paise!
      hsnCode: '2106',
      gstRateBps: 500,
      originStateCode: '27',
      destinationStateCode: '27',
    });
    expect(intra.isInterState).toBe(false);
    expect(intra.igstMinor).toBe(0);
    expect(intra.cgstMinor + intra.sgstMinor).toBe(intra.totalTaxMinor);
  });

  it('computes odd-paise totalTaxMinor (51 paise -> 26 + 25) with zero leakage', () => {
    const res = calculateGstBreakup({
      taxableMinor: 1020,
      hsnCode: '2106',
      gstRateBps: 500,
      originStateCode: '29',
      destinationStateCode: '29',
    });
    expect(res.totalTaxMinor).toBe(51);
    expect(res.cgstMinor).toBe(26);
    expect(res.sgstMinor).toBe(25);
    expect(res.cgstMinor + res.sgstMinor).toBe(51);
  });

  it('rejects fractional or negative minor units and unknown state codes in GST breakup', () => {
    expect(() =>
      calculateGstBreakup({
        taxableMinor: 100.5,
        hsnCode: '8708',
        originStateCode: '27',
        destinationStateCode: '27',
      }),
    ).toThrow();
    expect(() =>
      calculateGstBreakup({
        taxableMinor: -100,
        hsnCode: '8708',
        originStateCode: '27',
        destinationStateCode: '27',
      }),
    ).toThrow();
    expect(() =>
      calculateGstBreakup({
        taxableMinor: 1000,
        hsnCode: '8708',
        originStateCode: '99',
        destinationStateCode: '27',
      }),
    ).toThrow();
  });

  it('applies IGST for inter-state and emits e-Way payload at >= 50000 INR threshold', () => {
    const inter = calculateGstBreakup({
      taxableMinor: 5_000_000,
      hsnCode: '8708',
      originStateCode: '27',
      destinationStateCode: '29',
    });
    expect(inter.isInterState).toBe(true);
    expect(inter.igstMinor).toBe(inter.totalTaxMinor);
    expect(
      buildEwayBillPayload({
        ...inter,
        taxableMinor: 4_999_999,
        fromPincode: '400001',
        toPincode: '560001',
        hsnCode: '8708',
        supplierGstin: '27ABCDE1234F1Z0',
      }),
    ).toBeNull();
    const eway = buildEwayBillPayload({
      ...inter,
      taxableMinor: 5_000_000,
      fromPincode: '400001',
      toPincode: '560001',
      hsnCode: '8708',
      supplierGstin: '27ABCDE1234F1Z0',
    });
    expect(eway?.supplyType).toBe('OUTWARD');
    expect(eway?.totalValueMinor).toBe(5_000_000 + inter.totalTaxMinor);

    // Intra-state above threshold does not trigger mandatory inter-state e-Way bill
    const intraLarge = calculateGstBreakup({
      taxableMinor: 6_000_000,
      hsnCode: '8708',
      originStateCode: '27',
      destinationStateCode: '27',
    });
    expect(
      buildEwayBillPayload({
        ...intraLarge,
        fromPincode: '400001',
        toPincode: '400002',
        supplierGstin: '27ABCDE1234F1Z0',
      }),
    ).toBeNull();

    // Invalid GSTIN or pincode is rejected cleanly
    expect(() =>
      buildEwayBillPayload({
        ...inter,
        fromPincode: '400001',
        toPincode: '560001',
        supplierGstin: '27ABCDE1234F1ZX',
      }),
    ).toThrow();
    expect(() =>
      buildEwayBillPayload({
        ...inter,
        fromPincode: '40001',
        toPincode: '560001',
        supplierGstin: '27ABCDE1234F1Z0',
      }),
    ).toThrow();
  });

  it('calculates deterministic DDP duties and VAT respecting de minimis thresholds', () => {
    const underUs = calculateDdpLandedCost({
      destinationCountry: 'US',
      hsCode: '870899',
      customsValueMinor: 50_000, // $500 < $800 de minimis
      shippingMinor: 2_500,
      insuranceMinor: 500,
    });
    expect(underUs.dutyMinor).toBe(0);
    expect(underUs.vatMinor).toBe(0);
    expect(underUs.landedTotalMinor).toBe(53_000);

    const ukImport = calculateDdpLandedCost({
      destinationCountry: 'GB',
      hsCode: '870899',
      customsValueMinor: 30_000, // £300 > £135 threshold
      shippingMinor: 2_000,
      insuranceMinor: 0,
    });
    expect(ukImport.dutyMinor).toBeGreaterThan(0);
    expect(ukImport.vatMinor).toBeGreaterThan(0);
    expect(ukImport.landedTotalMinor).toBe(30_000 + 2_000 + ukImport.dutyMinor + ukImport.vatMinor);
  });

  it('supports all 8 default DDP corridors and pluggable DutyTariffProvider', () => {
    const corridors = ['IN', 'US', 'GB', 'EU', 'AE', 'SG', 'AU', 'CA'] as const;
    for (const country of corridors) {
      expect(DEFAULT_DDP_CORRIDORS[country]).toBeDefined();
      const res = calculateDdpLandedCost({
        destinationCountry: country,
        hsCode: '870899',
        customsValueMinor: 200_000,
        shippingMinor: 10_000,
        insuranceMinor: 1_000,
      });
      expect(res.currencyCode).toBe(DEFAULT_DDP_CORRIDORS[country].currencyCode);
      expect(res.landedTotalMinor).toBe(200_000 + 10_000 + 1_000 + res.dutyMinor + res.vatMinor);
    }

    const customProvider: DutyTariffProvider = {
      getCorridorRule: () => ({
        countryCode: 'US',
        currencyCode: 'USD',
        dutyDeMinimisMinor: 10_000,
        vatDeMinimisMinor: 0,
        vatRateBps: 800,
        defaultDutyRateBps: 1000,
        chapterDutyRatesBps: { '87': 500 },
        valuationBasis: 'FOB',
      }),
      resolveDutyRateBps: () => 500,
      resolveVatRateBps: () => 800,
    };

    const custom = calculateDdpLandedCost(
      {
        destinationCountry: 'US',
        hsCode: '870899',
        customsValueMinor: 20_000,
        shippingMinor: 1_000,
        insuranceMinor: 0,
      },
      customProvider,
    );
    expect(custom.dutyMinor).toBe(1_000); // 5% of 20_000
    expect(custom.vatMinor).toBe(1_680); // 8% of (20_000 + 1_000)
    expect(custom.landedTotalMinor).toBe(23_680);

    expect(() =>
      calculateDdpLandedCost({
        destinationCountry: 'ZZ',
        hsCode: '870899',
        customsValueMinor: 20_000,
        shippingMinor: 1_000,
      }),
    ).toThrow();
  });
});
