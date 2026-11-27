import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ZIRO_PLATFORM_FEE_BPS, ZIRO_SAAS_PLANS } from '../src/lib/billing-plans';
import {
  BillingPortalClient,
  computeGraceDaysRemaining,
  currencyToBillingProvider,
  formatPlanMonthlyPrice,
} from '../src/app/billing/BillingPortalClient';

describe('BillingPortalClient & SaaS Subscription UI', () => {
  it('maps INR currency to Razorpay and USD currency to Stripe with accurate formatted prices', () => {
    expect(currencyToBillingProvider('INR')).toBe('razorpay');
    expect(currencyToBillingProvider('USD')).toBe('stripe');

    expect(formatPlanMonthlyPrice('starter', 'INR')).toBe('₹3,999');
    expect(formatPlanMonthlyPrice('growth', 'INR')).toBe('₹11,999');
    expect(formatPlanMonthlyPrice('scale', 'INR')).toBe('₹39,999');

    expect(formatPlanMonthlyPrice('starter', 'USD')).toBe('$49');
    expect(formatPlanMonthlyPrice('growth', 'USD')).toBe('$149');
    expect(formatPlanMonthlyPrice('scale', 'USD')).toBe('$499');
    expect(formatPlanMonthlyPrice('enterprise', 'USD')).toBe('Custom');

    expect(ZIRO_PLATFORM_FEE_BPS).toBe(0);
    expect(ZIRO_SAAS_PLANS.growth.platformFeeBps).toBe(0);
  });

  it('computes remaining dunning grace days accurately', () => {
    const baseMs = Date.parse('2026-12-01T00:00:00.000Z');
    const threeDaysLaterIso = '2026-12-04T00:00:00.000Z';
    const expiredIso = '2026-11-30T23:59:59.000Z';

    expect(computeGraceDaysRemaining(threeDaysLaterIso, baseMs)).toBe(3);
    expect(computeGraceDaysRemaining(expiredIso, baseMs)).toBe(0);
    expect(computeGraceDaysRemaining(null, baseMs)).toBeNull();
  });

  it('renders dunning warning banner, plan entitlement cards, and 0% GMV tax guarantee for past_due tenants', () => {
    const html = renderToStaticMarkup(
      React.createElement(BillingPortalClient, {
        initialTenant: {
          tenantId: 'tenant_motofit2',
          displayName: 'MotoFit 2 Performance Parts',
          customDomain: 'shop.motofit2.in',
          planTier: 'growth',
          billingStatus: 'past_due',
          billingProvider: 'razorpay',
          currentPeriodEnd: '2026-12-01T00:00:00.000Z',
          gracePeriodEndsAt: '2026-12-08T00:00:00.000Z',
          isDemoSandbox: false,
          platformFeeBps: 0,
        },
        checkoutRedirectStatus: null,
      })
    );

    expect(html).toContain('DUNNING GRACE PERIOD ACTIVE');
    expect(html).toContain('Resolve Payment Now');
    expect(html).toContain('0% GMV TAX GUARANTEED (BPS: 0)');
    expect(html).toContain('Ziro Starter');
    expect(html).toContain('Ziro Growth');
    expect(html).toContain('Ziro Scale');
    expect(html).toContain('Ziro Enterprise');
    expect(html).toContain('₹11,999');
  });

  it('renders sandbox protection notice when viewing a read-only demo tenant', () => {
    const html = renderToStaticMarkup(
      React.createElement(BillingPortalClient, {
        initialTenant: {
          tenantId: 'tenant_demo_motors',
          displayName: 'Apex MotoWorks Demo',
          customDomain: 'demo.ziro.build',
          planTier: 'scale',
          billingStatus: 'active',
          billingProvider: null,
          currentPeriodEnd: null,
          gracePeriodEndsAt: null,
          isDemoSandbox: true,
          platformFeeBps: 0,
        },
      })
    );

    expect(html).toContain('[SANDBOX NOTICE]');
    expect(html).toContain('tenant_demo_motors');
  });
});
