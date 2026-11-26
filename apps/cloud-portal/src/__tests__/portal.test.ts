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

  it('Caddy check-domain route returns 200 for active tenant domain and 404 for unknown domain', async () => {
    globalTenantRegistry.saveTenant({
      tenant_id: 't_active_01',
      slug: 'active-store',
      name: 'Active Store',
      admin_email: 'owner@active.test',
      primary_domain: 'active-store.ziro.dev',
      custom_domain: 'shop.activestore.com',
      api_key: 'zk_live_1111222233334444',
      status: 'ACTIVE',
      plan_tier: 'ENTERPRISE',
      created_at: new Date().toISOString(),
    });

    // Valid primary domain
    const req1 = new Request('http://localhost:3002/api/caddy/check-domain?domain=active-store.ziro.dev');
    const resp1 = await checkDomainRoute(req1);
    expect(resp1.status).toBe(200);

    // Valid custom domain
    const req2 = new Request('http://localhost:3002/api/caddy/check-domain?domain=shop.activestore.com');
    const resp2 = await checkDomainRoute(req2);
    expect(resp2.status).toBe(200);

    // Unknown domain -> 404
    const req3 = new Request('http://localhost:3002/api/caddy/check-domain?domain=unknown-random.com');
    const resp3 = await checkDomainRoute(req3);
    expect(resp3.status).toBe(404);
  });
});
