export interface ShipmentQuoteRequest {
  originPincode: string;
  destinationPincode: string;
  weightGrams: number;
  codAmountMinor?: number;
}

export interface ShipmentQuote {
  providerId: string;
  serviceName: string;
  estimatedDays: number;
  rateMinor: number;
  currency: string;
}

export interface FulfillmentAdapter {
  readonly providerId: string;
  quoteShipment(request: ShipmentQuoteRequest): Promise<ShipmentQuote>;
}

export class ShiprocketAdapter implements FulfillmentAdapter {
  readonly providerId = 'shiprocket';

  async quoteShipment(request: ShipmentQuoteRequest): Promise<ShipmentQuote> {
    const baseRate = 4500 + Math.ceil(request.weightGrams / 500) * 1500;
    const codFee = request.codAmountMinor && request.codAmountMinor > 0 ? 3000 : 0;
    return {
      providerId: this.providerId,
      serviceName: 'Shiprocket Surface',
      estimatedDays: 3,
      rateMinor: baseRate + codFee,
      currency: 'INR',
    };
  }
}

export class DelhiveryAdapter implements FulfillmentAdapter {
  readonly providerId = 'delhivery';

  async quoteShipment(request: ShipmentQuoteRequest): Promise<ShipmentQuote> {
    const baseRate = 5000 + Math.ceil(request.weightGrams / 500) * 1200;
    const codFee = request.codAmountMinor && request.codAmountMinor > 0 ? 2500 : 0;
    return {
      providerId: this.providerId,
      serviceName: 'Delhivery Express',
      estimatedDays: 2,
      rateMinor: baseRate + codFee,
      currency: 'INR',
    };
  }
}

export class ShippoAdapter implements FulfillmentAdapter {
  readonly providerId = 'shippo';

  async quoteShipment(request: ShipmentQuoteRequest): Promise<ShipmentQuote> {
    const baseRate = 1200 + Math.ceil(request.weightGrams / 500) * 400;
    return {
      providerId: this.providerId,
      serviceName: 'Shippo Global Priority',
      estimatedDays: 5,
      rateMinor: baseRate,
      currency: 'USD',
    };
  }
}
