import {
  calculateDdpLandedCost,
  calculateGstBreakup,
  resolveGstRateBps,
} from '@ziro/shared-types';

export interface ZiroTaxProviderOptions {
  defaultOriginStateCode?: string;
}

export interface TaxItemLine {
  id: string;
  product_id: string;
  unit_price_minor: number;
  quantity: number;
  hsn_code?: string;
  rate_bps_override?: number;
}

export interface TaxShippingLine {
  id: string;
  unit_price_minor: number;
}

export interface TaxCalculationContext {
  origin_state_code?: string;
  shipping_address?: {
    country_code?: string;
    province_code?: string;
  };
}

export interface ZiroTaxLine {
  line_item_id?: string;
  shipping_line_id?: string;
  code: 'CGST' | 'SGST' | 'IGST' | 'VAT' | 'CUSTOMS_DUTY';
  name: string;
  rate: number;
  amount_minor: number;
}

export class ZiroTaxProvider {
  static identifier = 'ziro-tax';
  private defaultOriginStateCode: string;

  constructor(options?: ZiroTaxProviderOptions) {
    this.defaultOriginStateCode = options?.defaultOriginStateCode ?? '27';
  }

  async getTaxLines(
    itemLines: TaxItemLine[],
    shippingLines: TaxShippingLine[],
    context: TaxCalculationContext,
  ): Promise<ZiroTaxLine[]> {
    const countryCode = (context.shipping_address?.country_code ?? 'IN').toUpperCase();
    const lines: ZiroTaxLine[] = [];

    if (countryCode === 'IN') {
      const originStateCode = context.origin_state_code ?? this.defaultOriginStateCode;
      const destStateCode = context.shipping_address?.province_code ?? originStateCode;

      for (const item of itemLines) {
        const taxableMinor = item.unit_price_minor * item.quantity;
        const hsnCode = item.hsn_code ?? '8708';
        const rateBps = resolveGstRateBps(hsnCode, item.rate_bps_override);
        const gst = calculateGstBreakup({
          taxableMinor,
          hsnCode,
          originStateCode,
          destinationStateCode: destStateCode,
          gstRateBps: rateBps,
        });

        if (!gst.isInterState) {
          const halfPct = rateBps / 200;
          lines.push({
            line_item_id: item.id,
            code: 'CGST',
            name: `CGST ${halfPct}%`,
            rate: halfPct,
            amount_minor: gst.cgstMinor,
          });
          lines.push({
            line_item_id: item.id,
            code: 'SGST',
            name: `SGST ${halfPct}%`,
            rate: halfPct,
            amount_minor: gst.sgstMinor,
          });
        } else {
          const fullPct = rateBps / 100;
          lines.push({
            line_item_id: item.id,
            code: 'IGST',
            name: `IGST ${fullPct}%`,
            rate: fullPct,
            amount_minor: gst.igstMinor,
          });
        }
      }

      for (const ship of shippingLines) {
        if (ship.unit_price_minor <= 0) continue;
        const gst = calculateGstBreakup({
          taxableMinor: ship.unit_price_minor,
          hsnCode: '9965',
          originStateCode,
          destinationStateCode: destStateCode,
          gstRateBps: 1800,
        });
        if (!gst.isInterState) {
          lines.push({
            shipping_line_id: ship.id,
            code: 'CGST',
            name: 'CGST 9%',
            rate: 9,
            amount_minor: gst.cgstMinor,
          });
          lines.push({
            shipping_line_id: ship.id,
            code: 'SGST',
            name: 'SGST 9%',
            rate: 9,
            amount_minor: gst.sgstMinor,
          });
        } else {
          lines.push({
            shipping_line_id: ship.id,
            code: 'IGST',
            name: 'IGST 18%',
            rate: 18,
            amount_minor: gst.igstMinor,
          });
        }
      }

      return lines;
    }

    // Cross-border DDP calculation
    const shippingTotalMinor = shippingLines.reduce((acc, s) => acc + s.unit_price_minor, 0);
    for (let i = 0; i < itemLines.length; i++) {
      const item = itemLines[i];
      const customsValueMinor = item.unit_price_minor * item.quantity;
      const ddp = calculateDdpLandedCost({
        destinationCountry: countryCode,
        hsCode: item.hsn_code ?? '8708',
        customsValueMinor,
        shippingMinor: i === 0 ? shippingTotalMinor : 0,
        insuranceMinor: 0,
      });

      if (ddp.dutyMinor > 0) {
        lines.push({
          line_item_id: item.id,
          code: 'CUSTOMS_DUTY',
          name: `Customs Duty (${ddp.dutyRateBps / 100}%)`,
          rate: ddp.dutyRateBps / 100,
          amount_minor: ddp.dutyMinor,
        });
      }
      if (ddp.vatMinor > 0) {
        lines.push({
          line_item_id: item.id,
          code: 'VAT',
          name: `Import VAT (${ddp.vatRateBps / 100}%)`,
          rate: ddp.vatRateBps / 100,
          amount_minor: ddp.vatMinor,
        });
      }
    }

    return lines;
  }
}
