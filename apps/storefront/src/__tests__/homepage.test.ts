import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import StorefrontHomePage from '../app/page';

describe('Task 4: Storefront Editorial Homepage', () => {
  it('renders editorial hero slider, 3D configurator teaser, and tax comparison graphic', () => {
    const html = renderToStaticMarkup(React.createElement(StorefrontHomePage));

    expect(html).toContain('The Zero-Tax Commerce OS');
    expect(html).toContain('0% GMV Tax');
    expect(html).toContain('Transaction Tax on $1,000,000 Annual Online GMV');
    expect(html).toContain('KYA VERIFIED');
    expect(html).toContain('LOCAL FIRST');
    expect(html).toContain('GST 38+1 COMPLIANT');
  });
});
