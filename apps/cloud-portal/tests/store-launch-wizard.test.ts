import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  StoreLaunchWizard,
  buildLiveEndpointPreview,
  slugifyStoreName,
} from '../src/app/onboarding/StoreLaunchWizard';

describe('StoreLaunchWizard & Live Endpoint Preview', () => {
  it('slugifies store display names into clean DNS-safe slugs', () => {
    expect(slugifyStoreName('MotoFit 2 Performance Parts!')).toBe('motofit-2-performance-parts');
    expect(slugifyStoreName('  ---Apex   MotoWorks---  ')).toBe('apex-motoworks');
    expect(slugifyStoreName('A'.repeat(65))).toHaveLength(48);
  });

  it('computes live tenant ID, subdomain URLs, and custom domain CNAME requirements', () => {
    const subOnly = buildLiveEndpointPreview({
      slug: 'motofit-2',
      customDomain: '',
      rootDomain: 'ziro.build',
    });

    expect(subOnly).toEqual({
      effectiveSlug: 'motofit-2',
      tenantId: 'tenant_motofit_2',
      primaryHost: 'motofit-2.ziro.build',
      storefrontUrl: 'https://motofit-2.ziro.build',
      defaultSubdomainUrl: 'https://motofit-2.ziro.build',
      posUrl: 'https://pos.ziro.build',
      ucpManifestUrl: 'https://motofit-2.ziro.build/.well-known/ucp',
      requiresDnsCname: false,
    });

    const withCustomDomain = buildLiveEndpointPreview({
      slug: 'motofit-2',
      customDomain: 'https://SHOP.MOTOFIT2.IN/',
      rootDomain: 'ziro.build',
    });

    expect(withCustomDomain.primaryHost).toBe('shop.motofit2.in');
    expect(withCustomDomain.storefrontUrl).toBe('https://shop.motofit2.in');
    expect(withCustomDomain.ucpManifestUrl).toBe('https://shop.motofit2.in/.well-known/ucp');
    expect(withCustomDomain.requiresDnsCname).toBe(true);
  });

  it('renders initial wizard state with 0% GMV tax guarantee, 14-day trial badge, and plan cards', () => {
    const html = renderToStaticMarkup(
      React.createElement(StoreLaunchWizard, {
        initialPlanTier: 'growth',
        rootDomain: 'ziro.build',
      })
    );

    expect(html).toContain('0% GMV TAX • 14-DAY FREE TRIAL');
    expect(html).toContain('Launch Your Zero-Tax Commerce OS Instance');
    expect(html).toContain('Ziro Starter');
    expect(html).toContain('Ziro Growth');
    expect(html).toContain('Ziro Scale');
    expect(html).toContain('0.00% (0 BPS)');
    expect(html).toContain('https://your-store.ziro.build/.well-known/ucp');
  });

  it('renders post-provisioning launchpad with tenant ID and deep links into /migrate, /billing, and /docs', () => {
    const html = renderToStaticMarkup(
      React.createElement(StoreLaunchWizard, {
        initialProvisionedResult: {
          status: 'provisioned',
          tenant: {
            tenantId: 'tenant_motofit_2',
            slug: 'motofit-2',
            displayName: 'MotoFit 2 Performance Parts',
            ownerEmail: 'manash@motofit2.in',
            customDomain: 'shop.motofit2.in',
            planTier: 'growth',
            billingStatus: 'trialing',
            trialDays: 14,
            trialEndsAt: '2026-12-11T10:00:00.000Z',
            isDemoSandbox: false,
            readOnlyCatalog: false,
            platformFeeBps: 0,
          },
          endpoints: {
            storefrontUrl: 'https://shop.motofit2.in',
            defaultSubdomainUrl: 'https://motofit-2.ziro.build',
            posUrl: 'https://pos.ziro.build',
            cloudBillingUrl: 'https://cloud.ziro.build/billing?tenantId=tenant_motofit_2',
            ucpManifestUrl: 'https://shop.motofit2.in/.well-known/ucp',
          },
          entitlements: {
            tier: 'growth',
            name: 'Ziro Growth',
            monthlyUsdCents: 14900,
            monthlyInrPaise: 1199900,
            maxCustomDomains: 3,
            maxPosTerminals: 5,
            monthlyPulseAgentQueries: 25000,
            platformFeeBps: 0,
          },
          platformFeeBps: 0,
        },
      })
    );

    expect(html).toContain('MotoFit 2 Performance Parts is Live on Ziro Cloud');
    expect(html).toContain('0% GMV TAX LOCKED (BPS: 0)');
    expect(html).toContain('/migrate?tenantId=tenant_motofit_2');
    expect(html).toContain('/billing?tenantId=tenant_motofit_2');
    expect(html).toContain('/docs?tenantId=tenant_motofit_2');
    expect(html).toContain('https://shop.motofit2.in/.well-known/ucp');
  });
});
