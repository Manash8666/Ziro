import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CloudPortalHome from '../app/page';
import { ProtocolPlayground } from '../components/ProtocolPlayground';

describe('Task 5: Cloud Portal Stage 3 Experience', () => {
  it('renders ProtocolPlayground with UCP, WebMCP, and KYA simulation tabs', () => {
    const html = renderToStaticMarkup(React.createElement(ProtocolPlayground));
    expect(html).toContain('Autonomous Agent Protocol Playground');
    expect(html).toContain('/ucp/manifest.json');
    expect(html).toContain('WebMCP Tools');
    expect(html).toContain('KYA Signature Verification');
  });

  it('renders CloudPortalHome with interactive SavingsCalculator and ProtocolPlayground', () => {
    const html = renderToStaticMarkup(React.createElement(CloudPortalHome));
    expect(html).toContain('The Zero-Tax Commerce Operating System');
    expect(html).toContain('Transaction Tax ROI Calculator');
    expect(html).toContain('Autonomous Agent Protocol Playground');
    expect(html).toContain('Flat-Tier Transparent Pricing');
    expect(html).toContain('STARTER');
    expect(html).toContain('GROWTH');
    expect(html).toContain('ENTERPRISE');
  });
});
