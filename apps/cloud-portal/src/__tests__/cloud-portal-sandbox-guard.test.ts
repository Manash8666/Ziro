import { describe, expect, it } from 'vitest';
import { isSandboxTenant, assertSandboxTenantProtection } from '../lib/sandbox-guard';

describe('Cloud Portal Sandbox Guard', () => {
  it('identifies official and prefixed sandbox tenants', () => {
    expect(isSandboxTenant('sandbox-auto-parts')).toBe(true);
    expect(isSandboxTenant('sandbox-industrial-hydraulics')).toBe(true);
    expect(isSandboxTenant('sandbox-d2c-apparel')).toBe(true);
    expect(isSandboxTenant('sandbox-temp')).toBe(true);
    expect(isSandboxTenant('merchant-tenant-123')).toBe(false);
    expect(isSandboxTenant(null)).toBe(false);
  });

  it('throws descriptive error on prohibited modifications of sandbox tenants', () => {
    expect(() => {
      assertSandboxTenantProtection('sandbox-auto-parts', 'delete_tenant');
    }).toThrow(/Action 'delete_tenant' is prohibited for public demo tenant/);

    expect(() => {
      assertSandboxTenantProtection('sandbox-d2c-apparel', 'change_billing_tier');
    }).toThrow(/Action 'change_billing_tier' is prohibited for public demo tenant/);
  });

  it('allows regular tenants to proceed without throwing', () => {
    expect(() => {
      assertSandboxTenantProtection('merchant-production', 'delete_tenant');
    }).not.toThrow();
  });
});
