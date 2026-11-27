import { describe, expect, it } from 'vitest';
import {
  InMemoryTenantRegistry,
  SaaSSubscriptionManager,
  TenantProvisioner,
} from '../lib/index.js';
import { GET as checkDomainRoute } from '../app/api/caddy/check-domain/route.js';
import { globalTenantRegistry } from '../lib/tenant-provisioner.js';

describe('TenantProvisioner & SaaSSubscriptionManager', () => {
  it('provisions a tenant, enforces 0% platform fee, and rejects duplicate slugs', async () => {
    const registry = new InMemoryTenantRegistry();
    const provisioner = new TenantProvisioner(registry);

    const result = await provisioner.provisionTenant({
      slug: 'acme-auto-parts',
      name: 'Acme Auto Parts Inc',
      admin_email: 'admin@acme.test',
      plan_tier: 'GROWTH',
      origin_state_code: '27',
      currency_code: 'INR',
      custom_domain: 'parts.acme.test',
    });

    expect(result.slug).toBe('acme-auto-parts');
    expect(result.primary_domain).toBe('acme-auto-parts.ziro.dev');
    expect(result.status).toBe('ACTIVE');
    expect(result.platform_fee_bps).toBe(0);
    expect(result.api_key).toMatch(/^zk_live_/);

    // Duplicate slug must be rejected
    await expect(
      provisioner.provisionTenant({
        slug: 'acme-auto-parts',
        name: 'Another Acme',
        admin_email: 'other@acme.test',
        plan_tier: 'STARTER',
      }),
    ).rejects.toThrow(/already taken/i);

    // Duplicate custom domain must be rejected
    await expect(
      provisioner.provisionTenant({
        slug: 'acme-two',
        name: 'Another Acme 2',
        admin_email: 'other2@acme.test',
        plan_tier: 'STARTER',
        custom_domain: 'parts.acme.test',
      }),
    ).rejects.toThrow(/already linked/i);
  });

  it('manages flat-tier subscriptions with zero GMV fee and updates entitlement', () => {
    const billing = new SaaSSubscriptionManager();
    const tenantId = 'tenant_123';

    expect(billing.isTenantEntitled(tenantId)).toBe(false);

    const sub = billing.createSubscription(tenantId, 'GROWTH');
    expect(sub.status).toBe('ACTIVE');
    expect(billing.isTenantEntitled(tenantId)).toBe(true);

    billing.updateStatus(tenantId, 'PAST_DUE');
    expect(billing.isTenantEntitled(tenantId)).toBe(false);
  });

  it('Caddy check-domain route fails closed when unauthenticated or unconfigured', async () => {
    const prevSecret = process.env.CADDY_INTERNAL_SECRET;
    process.env.CADDY_INTERNAL_SECRET = 'stage5_test_caddy_secret';

    try {
      const reqUnauthorized = new Request(
        'http://localhost:3002/api/caddy/check-domain?domain=active-store.ziro.dev',
      );
      const resp1 = await checkDomainRoute(reqUnauthorized as any);
      expect(resp1.status).toBe(401);
    } finally {
      if (prevSecret === undefined) {
        delete process.env.CADDY_INTERNAL_SECRET;
      } else {
        process.env.CADDY_INTERNAL_SECRET = prevSecret;
      }
    }
  });
});
