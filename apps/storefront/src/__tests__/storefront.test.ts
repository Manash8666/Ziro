import { describe, expect, it } from 'vitest';
import { useCartStore } from '../store/cart';
import { CheckoutFormSchema } from '../components/CheckoutForm';
import { Pages } from '../collections/Pages';
import { Media } from '../collections/Media';
import { PAYLOAD_SCHEMA_NAME } from '../payload.config';

describe('@ziro/storefront cart, checkout & Payload CMS', () => {
  it('manages Zustand cart items with BOM optional SKUs, 3D variant, GSTIN, and UPI nudge', () => {
    useCartStore.getState().clear();

    useCartStore.getState().addItem({
      sku: 'kit_brake_01',
      title: 'Ceramic Brake Kit',
      unitPriceMinor: 50000,
      qty: 1,
      materialVariant: 'titanium-slate',
      selectedOptionalSkus: ['sku_bolt'],
    });

    // Adding same SKU + variant + optional SKUs merges qty
    useCartStore.getState().addItem({
      sku: 'kit_brake_01',
      title: 'Ceramic Brake Kit',
      unitPriceMinor: 50000,
      qty: 2,
      materialVariant: 'titanium-slate',
      selectedOptionalSkus: ['sku_bolt'],
    });

    // Different 3D material creates separate line
    useCartStore.getState().addItem({
      sku: 'kit_brake_01',
      title: 'Ceramic Brake Kit',
      unitPriceMinor: 50000,
      qty: 1,
      materialVariant: 'anodized-mint',
      selectedOptionalSkus: ['sku_bolt'],
    });

    const state = useCartStore.getState();
    expect(state.items.length).toBe(2);
    expect(state.items[0].qty).toBe(3);

    state.setGstin('29ABCDE1234F1ZW');
    expect(useCartStore.getState().gstin).toBe('29ABCDE1234F1ZW');

    state.setUpiNudgeDiscountInr(120);
    expect(useCartStore.getState().upiNudgeDiscountInr).toBe(120);

    state.removeItem(state.items[0].lineKey);
    expect(useCartStore.getState().items.length).toBe(1);

    state.clear();
    expect(useCartStore.getState().items.length).toBe(0);
  });

  it('validates India GSTIN (Mod-36) and global DDP checkout addresses', () => {
    const validIndia = CheckoutFormSchema.safeParse({
      fullName: 'Aarav Sharma',
      email: 'aarav@ziro.in',
      countryCode: 'IN',
      stateCode: '29',
      postalCode: '560001',
      line1: '12 MG Road',
      paymentMode: 'UPI_INTENT',
      gstin: '29ABCDE1234F1ZW',
    });
    expect(validIndia.success).toBe(true);

    const invalidGstin = CheckoutFormSchema.safeParse({
      fullName: 'Aarav Sharma',
      email: 'aarav@ziro.in',
      countryCode: 'IN',
      stateCode: '29',
      postalCode: '560001',
      line1: '12 MG Road',
      paymentMode: 'UPI_INTENT',
      gstin: '29ABCDE1234F1Z5', // bad Mod-36 checksum
    });
    expect(invalidGstin.success).toBe(false);

    const globalDdp = CheckoutFormSchema.safeParse({
      fullName: 'Alex Mercer',
      email: 'alex@mercer.uk',
      countryCode: 'GB',
      postalCode: 'SW1A 1AA',
      line1: '10 Downing St',
      paymentMode: 'CARD',
    });
    expect(globalDdp.success).toBe(true);
  });

  it('configures Payload CMS v3 with schemaName "payload" and tenantId isolation field', () => {
    expect(PAYLOAD_SCHEMA_NAME).toBe('payload');
    expect(Pages.fields.some((f: any) => f.name === 'tenantId')).toBe(true);
    expect(Media.fields.some((f: any) => f.name === 'tenantId')).toBe(true);
  });
});
