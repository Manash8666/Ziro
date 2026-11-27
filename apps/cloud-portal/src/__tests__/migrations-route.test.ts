import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET as checkDomainGet } from '../app/api/caddy/check-domain/route.js';
import { POST as migrationsPost } from '../app/api/v1/migrations/route.js';
import { globalTenantRegistry } from '../lib/tenant-provisioner.js';

describe('Cloud Portal Migrations & Caddy Secret API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Caddy Check Domain Secret Protection', () => {
    it('rejects check-domain request when CADDY_INTERNAL_SECRET is configured and secret query is missing or invalid', async () => {
      process.env.CADDY_INTERNAL_SECRET = 'caddy_secret_token_abc';

      // 1. Missing secret
      const req1 = new Request('http://localhost:3002/api/caddy/check-domain?domain=store.ziro.build');
      const res1 = await checkDomainGet(req1);
      expect(res1.status).toBe(401);

      // 2. Invalid secret
      const req2 = new Request('http://localhost:3002/api/caddy/check-domain?domain=store.ziro.build&secret=wrong');
      const res2 = await checkDomainGet(req2);
      expect(res2.status).toBe(401);

      // Clean up env
      delete process.env.CADDY_INTERNAL_SECRET;
    });

    it('allows check-domain request when secret matches and tenant is active', async () => {
      process.env.CADDY_INTERNAL_SECRET = 'caddy_secret_token_abc';

      // Register an active tenant
      globalTenantRegistry.saveTenant({
        tenant_id: 'tenant_valid_1',
        slug: 'valid-merchant',
        name: 'Valid Merchant',
        admin_email: 'admin@valid.com',
        primary_domain: 'active-merchant.example.com',
        api_key: 'key_123',
        status: 'ACTIVE',
        plan_tier: 'GROWTH',
        created_at: new Date().toISOString(),
      });

      const req = new Request(
        'http://localhost:3002/api/caddy/check-domain?domain=active-merchant.example.com&secret=caddy_secret_token_abc'
      );
      const res = await checkDomainGet(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.allowed).toBe(true);
      expect(json.tenant_id).toBe('tenant_valid_1');

      delete process.env.CADDY_INTERNAL_SECRET;
    });
  });

  describe('Migrations API Route (/api/v1/migrations)', () => {
    it('previews Shopify CSV import in dryRun mode without mutating database', async () => {
      const csv = `Handle,Title,Variant SKU,Variant Price,Tags
racing-brake,Racing Ceramic Brake,BRK-01,99.50,"brakes, fitment:Yamaha:R15:2020-2024"`;

      const req = new Request('http://localhost:3002/api/v1/migrations?tenantId=merchant_x&dryRun=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/csv',
          'X-Ziro-Tenant-Id': 'merchant_x',
        },
        body: csv,
      });

      const res = await migrationsPost(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.dryRun).toBe(true);
      expect(data.totalProcessed).toBe(1);
      expect(data.preview).toHaveLength(1);
      expect(data.preview[0].handle).toBe('racing-brake');
      expect(data.preview[0].hsnCode).toBe('8714');
      expect(data.preview[0].gstSlab).toBe(28);
      expect(data.preview[0].platformFeeBps).toBe(0);
    });

    it('blocks SSRF attempt targeting local or private networks in WooCommerce sync', async () => {
      const payload = {
        source: 'woocommerce',
        tenantId: 'merchant_y',
        storeUrl: 'http://127.0.0.1:9000',
        consumerKey: 'ck_test',
        consumerSecret: 'cs_test',
        dryRun: true,
      };

      const req = new Request('http://localhost:3002/api/v1/migrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await migrationsPost(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Loopback addresses are strictly forbidden');
    });

    it('rejects request with missing credentials', async () => {
      const payload = {
        source: 'woocommerce',
        tenantId: 'merchant_y',
      };

      const req = new Request('http://localhost:3002/api/v1/migrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await migrationsPost(req);
      expect(res.status).toBe(400);
    });
  });
});
