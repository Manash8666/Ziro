import { PosConflictPolicy, TenancyMode, TenantContext } from '@ziro/shared-types';

export class TenantContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantContextError';
  }
}

export interface TenantRecord {
  tenant_id: string;
  slug?: string;
  primary_domain?: string;
  mode: TenancyMode;
  medusa_store_id: string;
  medusa_sales_channel_id: string;
  pos_conflict_policy: PosConflictPolicy;
  origin_state_code: string;
  min_margin_bps: number;
  currency_code: string;
}

export interface GatewayConfigRecord {
  tenant_id: string;
  provider: 'razorpay' | 'stripe';
  key_id: string;
  secret_ciphertext: string;
  webhook_secret_ciphertext?: string;
  is_active?: boolean;
}

export interface GatewaySecrets {
  tenant_id: string;
  provider: 'razorpay' | 'stripe';
  key_id: string;
  api_secret: string;
  webhook_secret?: string;
  source: 'env' | 'tenant_config';
}

export class InMemoryTenantStore {
  private tenants = new Map<string, TenantRecord>();
  private domainMap = new Map<string, string>();
  private gatewayConfigs = new Map<string, GatewayConfigRecord>();

  constructor(options?: { tenants?: TenantRecord[]; gatewayConfigs?: GatewayConfigRecord[] }) {
    if (options?.tenants) {
      for (const t of options.tenants) {
        this.setTenant(t);
      }
    }
    if (options?.gatewayConfigs) {
      for (const gc of options.gatewayConfigs) {
        this.setGatewayConfig(gc);
      }
    }
  }

  setTenant(tenant: TenantRecord): void {
    this.tenants.set(tenant.tenant_id, tenant);
    if (tenant.primary_domain) {
      this.domainMap.set(tenant.primary_domain.toLowerCase().trim(), tenant.tenant_id);
    }
    if (tenant.slug) {
      this.domainMap.set(tenant.slug.toLowerCase().trim(), tenant.tenant_id);
    }
  }

  getTenant(tenantId: string): TenantRecord | undefined {
    return this.tenants.get(tenantId);
  }

  getTenantByHost(host: string): TenantRecord | undefined {
    const cleanHost = host.toLowerCase().split(':')[0].trim();
    const directMatch = this.domainMap.get(cleanHost);
    if (directMatch) {
      return this.tenants.get(directMatch);
    }
    const subdomain = cleanHost.split('.')[0];
    const subMatch = this.domainMap.get(subdomain);
    if (subMatch) {
      return this.tenants.get(subMatch);
    }
    return undefined;
  }

  setGatewayConfig(config: GatewayConfigRecord): void {
    this.gatewayConfigs.set(`${config.tenant_id}:${config.provider}`, config);
  }

  getGatewayConfig(tenantId: string, provider: string): GatewayConfigRecord | undefined {
    return this.gatewayConfigs.get(`${tenantId}:${provider}`);
  }
}

export interface TenantContextResolverOptions {
  store?: InMemoryTenantStore;
  defaultMode?: TenancyMode;
  defaultTenantId?: string;
  env?: Record<string, string | undefined>;
}

export class TenantContextResolver {
  private store: InMemoryTenantStore;
  private defaultMode: TenancyMode;
  private defaultTenantId: string;
  private env: Record<string, string | undefined>;

  constructor(options?: TenantContextResolverOptions) {
    this.store = options?.store ?? new InMemoryTenantStore();
    this.defaultMode = options?.defaultMode ?? 'single';
    this.defaultTenantId = options?.defaultTenantId ?? 'default';
    this.env = options?.env ?? process.env;
  }

  async resolveFromRequest(params: {
    host?: string;
    mode?: TenancyMode;
    authTenantId?: string;
    headerTenantId?: string;
    bodyTenantId?: string;
  }): Promise<TenantContext> {
    const effectiveMode = params.mode ?? this.defaultMode;

    if (effectiveMode === 'single') {
      const tenantId = this.defaultTenantId;
      if (params.bodyTenantId && params.bodyTenantId !== tenantId) {
        throw new TenantContextError(
          `Mismatched tenant: body specifies '${params.bodyTenantId}' but single-tenant engine is pinned to '${tenantId}'`,
        );
      }
      return {
        tenant_id: tenantId,
        slug: this.env.DEFAULT_TENANT_SLUG ?? tenantId,
        mode: 'single',
        medusa_store_id: this.env.MEDUSA_STORE_ID ?? `store_${tenantId}`,
        medusa_sales_channel_id: this.env.MEDUSA_SALES_CHANNEL_ID ?? `sc_${tenantId}`,
        pos_conflict_policy: (this.env.POS_CONFLICT_POLICY as PosConflictPolicy) ?? 'FORCE_SALE_WITH_ALERT',
        origin_state_code: this.env.ORIGIN_STATE_CODE ?? '27',
        min_margin_bps: Number(this.env.MIN_MARGIN_BPS ?? '1500'),
        currency_code: this.env.DEFAULT_CURRENCY ?? 'INR',
      };
    }

    // Multi-tenant derivation
    let derivedTenantId: string | undefined;

    if (params.authTenantId) {
      derivedTenantId = params.authTenantId;
    } else if (params.host) {
      const record = this.store.getTenantByHost(params.host);
      if (!record) {
        throw new TenantContextError(`Unknown tenant for host '${params.host}'`);
      }
      derivedTenantId = record.tenant_id;
    } else if (params.headerTenantId) {
      derivedTenantId = params.headerTenantId;
    }

    if (!derivedTenantId) {
      throw new TenantContextError(
        'Cannot resolve tenant in multi-tenant mode without authoritative host, auth token, or header',
      );
    }

    if (params.bodyTenantId && params.bodyTenantId !== derivedTenantId) {
      throw new TenantContextError(
        `Tenant spoofing detected: body specifies '${params.bodyTenantId}' but authoritative context is '${derivedTenantId}'`,
      );
    }

    const tenant = this.store.getTenant(derivedTenantId);
    if (!tenant) {
      throw new TenantContextError(`Tenant '${derivedTenantId}' not found`);
    }

    return {
      tenant_id: tenant.tenant_id,
      slug: tenant.slug ?? tenant.tenant_id,
      primary_domain: tenant.primary_domain,
      mode: 'multi',
      medusa_store_id: tenant.medusa_store_id,
      medusa_sales_channel_id: tenant.medusa_sales_channel_id,
      pos_conflict_policy: tenant.pos_conflict_policy,
      origin_state_code: tenant.origin_state_code,
      min_margin_bps: tenant.min_margin_bps,
      currency_code: tenant.currency_code,
    };
  }

  async resolveGatewaySecrets(
    tenantId: string,
    provider: 'razorpay' | 'stripe',
    mode?: TenancyMode,
  ): Promise<GatewaySecrets | null> {
    const effectiveMode = mode ?? this.defaultMode;

    if (effectiveMode === 'single') {
      if (provider === 'razorpay') {
        const key_id = this.env.RAZORPAY_KEY_ID ?? '';
        const api_secret = this.env.RAZORPAY_KEY_SECRET ?? '';
        const webhook_secret = this.env.RAZORPAY_WEBHOOK_SECRET;
        if (!key_id && !api_secret && !webhook_secret) return null;
        return {
          tenant_id: tenantId,
          provider,
          key_id,
          api_secret,
          webhook_secret,
          source: 'env',
        };
      }
      if (provider === 'stripe') {
        const api_key = this.env.STRIPE_API_KEY ?? '';
        const webhook_secret = this.env.STRIPE_WEBHOOK_SECRET;
        if (!api_key && !webhook_secret) return null;
        return {
          tenant_id: tenantId,
          provider,
          key_id: api_key,
          api_secret: api_key,
          webhook_secret,
          source: 'env',
        };
      }
      return null;
    }

    // Multi-tenant: strict lookup in store, never leak env
    const config = this.store.getGatewayConfig(tenantId, provider);
    if (!config || config.is_active === false) {
      return null;
    }

    return {
      tenant_id: config.tenant_id,
      provider: config.provider,
      key_id: config.key_id,
      api_secret: config.secret_ciphertext,
      webhook_secret: config.webhook_secret_ciphertext,
      source: 'tenant_config',
    };
  }
}
