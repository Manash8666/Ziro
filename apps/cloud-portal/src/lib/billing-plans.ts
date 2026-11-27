export const ZIRO_PLATFORM_FEE_BPS = 0 as const;
export const DUNNING_GRACE_PERIOD_DAYS = 7 as const;

export type ZiroPlanTier = 'starter' | 'growth' | 'scale' | 'enterprise';

export type TenantBillingStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'suspended';

export type BillingProvider = 'razorpay' | 'stripe';

export interface ZiroPlanDefinition {
  tier: ZiroPlanTier;
  name: string;
  monthlyUsdCents: number;
  monthlyInrPaise: number;
  maxCustomDomains: number;
  maxPosTerminals: number;
  monthlyPulseAgentQueries: number;
  platformFeeBps: typeof ZIRO_PLATFORM_FEE_BPS;
}

export const ZIRO_SAAS_PLANS: Record<ZiroPlanTier, ZiroPlanDefinition> = {
  starter: {
    tier: 'starter',
    name: 'Ziro Starter',
    monthlyUsdCents: 4900, // $49/mo
    monthlyInrPaise: 399900, // ₹3,999/mo
    maxCustomDomains: 1,
    maxPosTerminals: 1,
    monthlyPulseAgentQueries: 2_500,
    platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
  },
  growth: {
    tier: 'growth',
    name: 'Ziro Growth',
    monthlyUsdCents: 14900, // $149/mo
    monthlyInrPaise: 1199900, // ₹11,999/mo
    maxCustomDomains: 3,
    maxPosTerminals: 5,
    monthlyPulseAgentQueries: 25_000,
    platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
  },
  scale: {
    tier: 'scale',
    name: 'Ziro Scale',
    monthlyUsdCents: 49900, // $499/mo
    monthlyInrPaise: 3999900, // ₹39,999/mo
    maxCustomDomains: 10,
    maxPosTerminals: 25,
    monthlyPulseAgentQueries: 250_000,
    platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Ziro Enterprise',
    monthlyUsdCents: 0, // Custom contract
    monthlyInrPaise: 0,
    maxCustomDomains: 100,
    maxPosTerminals: 500,
    monthlyPulseAgentQueries: 5_000_000,
    platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
  },
};

export function normalizePlanTier(raw: string | null | undefined): ZiroPlanTier | null {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase();
  if (
    cleaned === 'starter' ||
    cleaned === 'growth' ||
    cleaned === 'scale' ||
    cleaned === 'enterprise'
  ) {
    return cleaned;
  }
  return null;
}

export function resolvePlanTierFromProviderPlanId(
  provider: BillingProvider,
  externalPlanId: string | null | undefined
): ZiroPlanTier | null {
  if (!externalPlanId) return null;
  const id = externalPlanId.trim();

  if (provider === 'razorpay') {
    if (id === process.env.RAZORPAY_PLAN_STARTER) return 'starter';
    if (id === process.env.RAZORPAY_PLAN_GROWTH) return 'growth';
    if (id === process.env.RAZORPAY_PLAN_SCALE) return 'scale';
    if (id === process.env.RAZORPAY_PLAN_ENTERPRISE) return 'enterprise';
  } else {
    if (id === process.env.STRIPE_PRICE_STARTER) return 'starter';
    if (id === process.env.STRIPE_PRICE_GROWTH) return 'growth';
    if (id === process.env.STRIPE_PRICE_SCALE) return 'scale';
    if (id === process.env.STRIPE_PRICE_ENTERPRISE) return 'enterprise';
  }

  return null;
}

/**
 * Determines whether Caddy On-Demand TLS and edge routing should serve a tenant
 * based on its current subscription lifecycle state.
 */
export function isTenantActiveForEdgeRouting(params: {
  billingStatus: TenantBillingStatus;
  gracePeriodEndsAt: string | Date | null;
  nowMs?: number;
}): boolean {
  if (params.billingStatus === 'active' || params.billingStatus === 'trialing') {
    return true;
  }

  if (params.billingStatus === 'past_due' && params.gracePeriodEndsAt) {
    const expiryMs =
      params.gracePeriodEndsAt instanceof Date
        ? params.gracePeriodEndsAt.getTime()
        : Date.parse(params.gracePeriodEndsAt);
    const now = params.nowMs ?? Date.now();
    return Number.isFinite(expiryMs) && expiryMs > now;
  }

  return false;
}

export function computeGmvTaxSavings(params: {
  gmvAmount: number;
  competitorFeePercent?: number;
}): {
  ziroFeeAmount: number;
  competitorFeeAmount: number;
  netSavingsAmount: number;
  platformFeeBps: typeof ZIRO_PLATFORM_FEE_BPS;
} {
  const rate = (params.competitorFeePercent ?? 2.0) / 100;
  const cleanGmv = Math.max(0, params.gmvAmount);
  const competitorFeeAmount = Math.round(cleanGmv * rate);

  return {
    ziroFeeAmount: 0,
    competitorFeeAmount,
    netSavingsAmount: competitorFeeAmount,
    platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
  };
}
