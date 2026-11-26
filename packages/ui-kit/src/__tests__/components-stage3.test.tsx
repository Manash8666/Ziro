import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  ZiroTable,
  ZiroDrawer,
  ZiroModal,
  ZiroToast,
  SavingsCalculator,
  calculateAnnualSavings,
} from '../index.js';

describe('Task 2: @ziro/ui-kit Advanced Interactive Components', () => {
  it('renders ZiroTable with tabular numbers, headers, and rows', () => {
    const columns = [
      { key: 'sku', header: 'SKU', align: 'left' as const },
      { key: 'name', header: 'Item Name', align: 'left' as const },
      { key: 'price', header: 'Price', align: 'right' as const, isTabular: true },
    ];
    const data = [
      { sku: 'BRK-001', name: 'Ceramic Brake Pad', price: '₹3,499.00' },
      { sku: 'SUS-002', name: 'Nitrogen Damper', price: '₹12,850.00' },
    ];

    const html = renderToStaticMarkup(
      React.createElement(ZiroTable, { columns, data, keyField: 'sku' })
    );

    expect(html).toContain('<table');
    expect(html).toContain('BRK-001');
    expect(html).toContain('Ceramic Brake Pad');
    expect(html).toContain('ziro-tabular');
  });

  it('renders ZiroDrawer conditionally with accessible dialog attributes', () => {
    const openHtml = renderToStaticMarkup(
      React.createElement(
        ZiroDrawer,
        { isOpen: true, title: 'Bill of Materials', onClose: () => {} },
        React.createElement('p', null, 'BOM Component Breakdown')
      )
    );
    expect(openHtml).toContain('role="dialog"');
    expect(openHtml).toContain('Bill of Materials');
    expect(openHtml).toContain('BOM Component Breakdown');

    const closedHtml = renderToStaticMarkup(
      React.createElement(
        ZiroDrawer,
        { isOpen: false, title: 'Bill of Materials', onClose: () => {} },
        React.createElement('p', null, 'Hidden Content')
      )
    );
    expect(closedHtml).not.toContain('Hidden Content');
  });

  it('renders ZiroModal with backdrop and accessible title', () => {
    const modalHtml = renderToStaticMarkup(
      React.createElement(
        ZiroModal,
        { isOpen: true, title: 'Confirm Order Dispatch', onClose: () => {} },
        React.createElement('p', null, 'Ready to print ESC/POS receipt.')
      )
    );
    expect(modalHtml).toContain('role="dialog"');
    expect(modalHtml).toContain('Confirm Order Dispatch');
    expect(modalHtml).toContain('Ready to print ESC/POS receipt.');
  });

  it('renders ZiroToast with tone styling and message', () => {
    const toastHtml = renderToStaticMarkup(
      React.createElement(ZiroToast, {
        message: 'Cart lock acquired for 5 minutes',
        tone: 'mint',
      })
    );
    expect(toastHtml).toContain('role="status"');
    expect(toastHtml).toContain('Cart lock acquired for 5 minutes');
    expect(toastHtml).toContain('#00E599');
  });

  it('calculates exact GMV annual tax savings and renders SavingsCalculator', () => {
    // $1,000,000 GMV with average order value $50 (20,000 orders)
    // Shopify: 2.9% of $1,000,000 ($29,000) + 20,000 * $0.30 ($6,000) = $35,000
    // Ziro: $0 platform fee
    const savings = calculateAnnualSavings({ annualGmvDollars: 1000000, averageOrderValueDollars: 50 });
    expect(savings.legacyFeeDollars).toBe(35000);
    expect(savings.ziroPlatformFeeDollars).toBe(0);
    expect(savings.netSavingsDollars).toBe(35000);

    const calcHtml = renderToStaticMarkup(
      React.createElement(SavingsCalculator, { initialGmvDollars: 1000000 })
    );
    expect(calcHtml).toContain('0% GMV Fee');
    expect(calcHtml).toContain('Net Annual Savings');
    expect(calcHtml).toContain('$35,000');
  });
});
