import crypto from 'node:crypto';
import {
  type TenantProvisionRequest,
  type TenantProvisionResponse,
  TenantProvisionRequestSchema,
  ZIRO_PLATFORM_FEE_BPS,
} from '@ziro/shared-types';
import type { z } from 'zod';

export interface TenantRecord {
  tenant_id: string;
  slug: string;
  name: string;
  admin_email: string;
  primary_domain: string;
  custom_domain?: string;
  api_key: string;
  status: 'ACTIVE' | 'PROVISIONING' | 'SUSPENDED';
  plan_tier: string;
  created_at: string;
}

export class InMemoryTenantRegistry {
  private tenants = new Map<string, TenantRecord>();
  private slugMap = new Map<string, string>();
  private domainMap = new Map<string, string>();

  hasSlug(slug: string): boolean {
    return this.slugMap.has(slug.toLowerCase().trim());
  }

  hasDomain(domain: string): boolean {
    return this.domainMap.has(domain.toLowerCase().trim());
  }

  getTenant(tenantId: string): TenantRecord | undefined {
    return this.tenants.get(tenantId);
  }

  getTenantByDomain(domain: string): TenantRecord | undefined {
    const tenantId = this.domainMap.get(domain.toLowerCase().trim());
    return tenantId ? this.tenants.get(tenantId) : undefined;
  }

  saveTenant(record: TenantRecord): void {
    this.tenants.set(record.tenant_id, record);
    this.slugMap.set(record.slug.toLowerCase().trim(), record.tenant_id);
    this.domainMap.set(record.primary_domain.toLowerCase().trim(), record.tenant_id);
    if (record.custom_domain) {
      this.domainMap.set(record.custom_domain.toLowerCase().trim(), record.tenant_id);
    }
  }

  getAllTenants(): TenantRecord[] {
    return Array.from(this.tenants.values());
  }
}

export class TenantProvisioner {
  constructor(private registry: InMemoryTenantRegistry = new InMemoryTenantRegistry()) {}

  async provisionTenant(rawInput: z.input<typeof TenantProvisionRequestSchema>): Promise<TenantProvisionResponse> {
    const input = TenantProvisionRequestSchema.parse(rawInput);
    const cleanSlug = input.slug.toLowerCase().trim();

    if (this.registry.hasSlug(cleanSlug)) {
      throw new Error(`Tenant slug '${cleanSlug}' is already taken. Please choose another.`);
    }

    if (input.custom_domain && this.registry.hasDomain(input.custom_domain)) {
      throw new Error(`Custom domain '${input.custom_domain}' is already linked to another tenant.`);
    }

    const tenantId = `tenant_${cleanSlug.replace(/-/g, '_')}_${crypto.randomBytes(4).toString('hex')}`;
    const primaryDomain = `${cleanSlug}.ziro.dev`;
    const apiKey = `zk_live_${crypto.randomBytes(20).toString('hex')}`;

    const record: TenantRecord = {
      tenant_id: tenantId,
      slug: cleanSlug,
      name: input.name,
      admin_email: input.admin_email,
      primary_domain: primaryDomain,
      custom_domain: input.custom_domain?.toLowerCase().trim(),
      api_key: apiKey,
      status: 'ACTIVE',
      plan_tier: input.plan_tier,
      created_at: new Date().toISOString(),
    };

    this.registry.saveTenant(record);

    return {
      tenant_id: tenantId,
      slug: cleanSlug,
      primary_domain: primaryDomain,
      api_key: apiKey,
      status: 'ACTIVE',
      platform_fee_bps: ZIRO_PLATFORM_FEE_BPS, // 0% GMV fee
    };
  }

  getRegistry(): InMemoryTenantRegistry {
    return this.registry;
  }
}

export const globalTenantRegistry = new InMemoryTenantRegistry();
export const globalTenantProvisioner = new TenantProvisioner(globalTenantRegistry);
