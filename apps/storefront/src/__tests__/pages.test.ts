import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ProductCard, type ProductItem } from '../components/ProductCard';
import { BomDrawer, type BomChildItem } from '../components/BomDrawer';

describe('Task 3: Storefront PDP, Catalog & BOM Components', () => {
  it('renders ProductCard with SKU, formatted price, and guaranteed fitment tag', () => {
    const item: ProductItem = {
      handle: 'ceramic-brake-pad-creta',
      title: 'High-Friction Ceramic Front Brake Pad Set',
      sku: 'BRK-PAD-001',
      priceMinor: 349900,
      currency: 'INR',
      category: 'Braking Systems',
      fitmentSummary: '2020-2024 Hyundai Creta / Kia Seltos',
    };

    const html = renderToStaticMarkup(React.createElement(ProductCard, { product: item }));
    expect(html).toContain('BRK-PAD-001');
    expect(html).toContain('High-Friction Ceramic');
    expect(html).toContain('₹3,499');
    expect(html).toContain('2020-2024 Hyundai Creta');
  });

  it('renders BomDrawer with child components breakdown and quantities', () => {
    const bomChildren: BomChildItem[] = [
      { sku: 'BRK-ROTOR-01', name: 'Drilled Disc Rotor (320mm)', quantity: 2, hsn: '87083000' },
      { sku: 'BRK-PAD-02', name: 'Ceramic Shims & Hardware', quantity: 4, hsn: '87083000' },
    ];

    const html = renderToStaticMarkup(
      React.createElement(BomDrawer, {
        isOpen: true,
        onClose: () => {},
        assemblyTitle: 'High-Performance Front Brake Kit',
        assemblySku: 'BRK-ASY-001',
        childrenItems: bomChildren,
      })
    );

    expect(html).toContain('Bill of Materials');
    expect(html).toContain('BRK-ASY-001');
    expect(html).toContain('Drilled Disc Rotor');
    expect(html).toContain('87083000');
  });
});
