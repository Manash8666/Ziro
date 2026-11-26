export interface ShippingQuote {
  providerId: 'shiprocket' | 'delhivery' | 'shippo';
  providerName: string;
  serviceName: string;
  rateMinor: number;
  currency: string;
  estimatedDays: number;
}

export interface ShippingQuoteParams {
  originPincode: string;
  destinationPincode: string;
  weightGrams: number;
  consignmentValueMinor: number;
}

export interface EwayBillSummary {
  fromPincode: string;
  toPincode: string;
  consignmentValueMinor: number;
}

export interface ShippingQuotesResult {
  quotes: ShippingQuote[];
  requiresEwayBill: boolean;
  ewayBillThresholdMinor: number;
  ewayBillSummary?: EwayBillSummary;
}

export class LogisticsClient {
  /**
   * Under Indian GST law (Rule 138), an e-Way bill is mandatory
   * whenever consignment value exceeds ₹50,000 (5,000,000 minor units).
   */
  public readonly ewayBillThresholdMinor = 5_000_000;

  async getShippingQuotes(params: ShippingQuoteParams): Promise<ShippingQuotesResult> {
    const { originPincode, destinationPincode, weightGrams, consignmentValueMinor } = params;

    const baseWeightKg = Math.max(1, Math.ceil(weightGrams / 1000));

    const quotes: ShippingQuote[] = [
      {
        providerId: 'shiprocket',
        providerName: 'Shiprocket B2C/D2C Surface',
        serviceName: 'Surface Standard',
        rateMinor: 8000 + baseWeightKg * 4000,
        currency: 'INR',
        estimatedDays: 3,
      },
      {
        providerId: 'delhivery',
        providerName: 'Delhivery Express Direct',
        serviceName: 'Express Air & Surface',
        rateMinor: 9500 + baseWeightKg * 3500,
        currency: 'INR',
        estimatedDays: 2,
      },
      {
        providerId: 'shippo',
        providerName: 'Shippo Priority Logistics',
        serviceName: 'Priority Fast-Track',
        rateMinor: 12000 + baseWeightKg * 5000,
        currency: 'INR',
        estimatedDays: 1,
      },
    ];

    const requiresEwayBill = consignmentValueMinor >= this.ewayBillThresholdMinor;
    const ewayBillSummary: EwayBillSummary | undefined = requiresEwayBill
      ? {
          fromPincode: originPincode,
          toPincode: destinationPincode,
          consignmentValueMinor,
        }
      : undefined;

    return {
      quotes,
      requiresEwayBill,
      ewayBillThresholdMinor: this.ewayBillThresholdMinor,
      ewayBillSummary,
    };
  }
}
