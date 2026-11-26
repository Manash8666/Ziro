import { describe, expect, it } from 'vitest';
import { LogisticsClient } from '../lib/logistics-client.js';
import { HeroSlider, FitmentWidget, ConfiguratorShowcase } from '../blocks/index.js';

describe('Storefront Visual Blocks & Logistics Client', () => {
  it('exports visual editorial blocks for Payload CMS and storefront layout', () => {
    expect(HeroSlider).toBeDefined();
    expect(FitmentWidget).toBeDefined();
    expect(ConfiguratorShowcase).toBeDefined();
  });

  it('LogisticsClient compares shipping quotes and flags e-Way bill requirement at ₹50,000 threshold', async () => {
    const client = new LogisticsClient();

    // Order below ₹50,000 (e.g. ₹15,000 = 1,500,000 minor)
    const quoteSmall = await client.getShippingQuotes({
      originPincode: '110001',
      destinationPincode: '400001',
      weightGrams: 1500,
      consignmentValueMinor: 1500000,
    });

    expect(quoteSmall.quotes.length).toBeGreaterThanOrEqual(2);
    expect(quoteSmall.requiresEwayBill).toBe(false);
    expect(quoteSmall.ewayBillThresholdMinor).toBe(5000000);

    const sr = quoteSmall.quotes.find((q) => q.providerId === 'shiprocket');
    expect(sr).toBeDefined();
    expect(sr?.currency).toBe('INR');

    // Order at or above ₹50,000 (e.g. ₹75,000 = 7,500,000 minor)
    const quoteLarge = await client.getShippingQuotes({
      originPincode: '110001',
      destinationPincode: '560001',
      weightGrams: 3000,
      consignmentValueMinor: 7500000,
    });

    expect(quoteLarge.requiresEwayBill).toBe(true);
    expect(quoteLarge.ewayBillSummary).toMatchObject({
      fromPincode: '110001',
      toPincode: '560001',
      consignmentValueMinor: 7500000,
    });
  });
});

