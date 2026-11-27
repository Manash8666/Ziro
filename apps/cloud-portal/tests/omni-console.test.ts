import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { OmniConsoleClient } from '../src/app/console/OmniConsoleClient';

describe('OmniConsoleClient (Unified 3-in-1 Workspace Console)', () => {
  it('renders split screen mode by default with live admin and pos frames', () => {
    const html = renderToString(
      React.createElement(OmniConsoleClient, {
        initialTab: 'split-admin-pos',
        defaultStorefrontUrl: 'https://ziro-storefront.vercel.app',
        defaultAdminUrl: '/admin',
        defaultPosUrl: 'https://ziro-pos.vercel.app',
      })
    );

    expect(html).toContain('ZIRO 3-IN-1:');
    expect(html).toContain('Split (Admin + POS)');
    expect(html).toContain('Split (Admin + Store)');
    expect(html).toContain('🛍️ Storefront');
    expect(html).toContain('⚙️ Merchant Admin');
    expect(html).toContain('📟 Counter POS');
    expect(html).toContain('title="Merchant Admin Shell"');
    expect(html).toContain('title="Counter POS Terminal"');
    expect(html).toContain('0% GMV Toll');
  });

  it('renders storefront tab with customer-facing iframe and direct popout', () => {
    const html = renderToString(
      React.createElement(OmniConsoleClient, {
        initialTab: 'storefront',
        defaultStorefrontUrl: 'https://ziro-storefront.vercel.app',
        defaultAdminUrl: '/admin',
        defaultPosUrl: 'https://ziro-pos.vercel.app',
      })
    );

    expect(html).toContain('src="https://ziro-storefront.vercel.app"');
    expect(html).toContain('title="Customer Storefront"');
    expect(html).toContain('href="https://ziro-storefront.vercel.app"');
  });

  it('renders counter pos tab with serial and camera device permissions', () => {
    const html = renderToString(
      React.createElement(OmniConsoleClient, {
        initialTab: 'pos',
        defaultStorefrontUrl: 'https://ziro-storefront.vercel.app',
        defaultAdminUrl: '/admin',
        defaultPosUrl: 'https://ziro-pos.vercel.app',
      })
    );

    expect(html).toContain('src="https://ziro-pos.vercel.app"');
    expect(html).toContain('allow="serial; usb; clipboard-read; clipboard-write; camera"');
  });

  it('renders split admin + storefront mode', () => {
    const html = renderToString(
      React.createElement(OmniConsoleClient, {
        initialTab: 'split-admin-store',
        defaultStorefrontUrl: 'https://ziro-storefront.vercel.app',
        defaultAdminUrl: '/admin',
        defaultPosUrl: 'https://ziro-pos.vercel.app',
      })
    );

    expect(html).toContain('🛍️ Customer Storefront');
    expect(html).toContain('⚙️ Merchant Admin Shell');
    expect(html).toContain('src="/admin"');
    expect(html).toContain('src="https://ziro-storefront.vercel.app"');
  });
});
