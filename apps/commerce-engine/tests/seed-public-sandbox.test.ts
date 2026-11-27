import { describe, expect, it } from 'vitest';
import {
  SANDBOX_TENANTS,
  verifySandboxInvariants,
  computeProductContentSha256,
} from '../../../scripts/seed-public-sandbox.js';

describe('Ziro Public Sandbox Tenants & Invariants', () => {
  it('contains exactly 3 official public sandbox demo tenants', () => {
    const tenantIds = Object.keys(SANDBOX_TENANTS);
    expect(tenantIds).toEqual([
      'sandbox-auto-parts',
      'sandbox-industrial-hydraulics',
      'sandbox-d2c-apparel',
    ]);
  });

  it('strictly enforces the 0% GMV fee invariant across all sandbox tenants and products', () => {
    const stats = verifySandboxInvariants(SANDBOX_TENANTS);
    expect(stats.allZeroFee).toBe(true);
    expect(stats.totalTenants).toBe(3);
    expect(stats.totalProducts).toBeGreaterThanOrEqual(7);

    for (const tenant of Object.values(SANDBOX_TENANTS)) {
      expect(tenant.platformFeeBps).toBe(0);
      expect(tenant.isReadOnly).toBe(true);
      for (const prod of tenant.products) {
        expect(prod.platformFeeBps).toBe(0);
      }
    }
  });

  it('validates compliant HSN codes and integer non-negative prices in paise', () => {
    const stats = verifySandboxInvariants(SANDBOX_TENANTS);
    expect(stats.allValidHsn).toBe(true);
    expect(stats.allNonNegativePrice).toBe(true);

    for (const tenant of Object.values(SANDBOX_TENANTS)) {
      for (const p of tenant.products) {
        expect(p.hsnCode).toMatch(/^[0-9]{4,8}$/);
        expect(Number.isInteger(p.minPricePaise)).toBe(true);
        expect(p.minPricePaise).toBeGreaterThan(0);
        expect(p.totalStock).toBeGreaterThanOrEqual(0);
        expect([0, 5, 12, 18, 28]).toContain(p.gstSlabPercent);
      }
    }
  });

  it('generates 64-character hex SHA-256 digests for semantic search text deduplication', () => {
    for (const tenant of Object.values(SANDBOX_TENANTS)) {
      for (const p of tenant.products) {
        const hash = computeProductContentSha256(p);
        expect(hash).toHaveLength(64);
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      }
    }
  });

  it('verifies fitment matrices for automotive parts', () => {
    const autoTenant = SANDBOX_TENANTS['sandbox-auto-parts'];
    expect(autoTenant).toBeDefined();

    const brakeKit = autoTenant.products.find((p) => p.handle.includes('brake'));
    expect(brakeKit).toBeDefined();
    expect(brakeKit?.fitmentMatrix.length).toBeGreaterThan(0);
    expect(brakeKit?.fitmentMatrix[0].make).toBe('Porsche');
  });
});
