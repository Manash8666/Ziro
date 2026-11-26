import { type SaaSPlanTier, ZIRO_PLATFORM_FEE_BPS } from '@ziro/shared-types';

export interface SaaSPlanDefinition {
  tier: SaaSPlanTier;
  name: string;
  monthly_price_usd: number;
  monthly_price_inr: number;
  platform_fee_bps: 0;
  features: string[];
}

export const SAAS_PLANS: Record<SaaSPlanTier, SaaSPlanDefinition> = {
  STARTER: {
    tier: 'STARTER',
    name: 'Ziro Starter',
    monthly_price_usd: 49,
    monthly_price_inr: 3999,
    platform_fee_bps: ZIRO_PLATFORM_FEE_BPS, // 0
    features: [
      '0% GMV Platform Fee',
      'Up to 1,000 Orders/mo',
      'Local-First PWA POS',
      'Razorpay & Stripe Integration',
      'Automated GST & e-Way Bill Math',
    ],
  },
  GROWTH: {
    tier: 'GROWTH',
    name: 'Ziro Growth',
    monthly_price_usd: 149,
    monthly_price_inr: 11999,
    platform_fee_bps: ZIRO_PLATFORM_FEE_BPS, // 0
    features: [
      '0% GMV Platform Fee',
      'Up to 25,000 Orders/mo',
      'UCP & ACP AI Shopping Agent Protocols',
      'AI COD-RTO Shield',
      'Multi-level BOM & Vehicle Fitments',
      'Custom Domain + Automated SSL',
    ],
  },
  ENTERPRISE: {
    tier: 'ENTERPRISE',
    name: 'Ziro Enterprise',
    monthly_price_usd: 499,
    monthly_price_inr: 39999,
    platform_fee_bps: ZIRO_PLATFORM_FEE_BPS, // 0
    features: [
      '0% GMV Platform Fee',
      'Unlimited Orders & POS Terminals',
      'ONDC Seller Node Adapter',
      'Dedicated TimescaleDB Hypertable Analytics',
      'Net-30 B2B Wholesale Ledger',
      '24/7 Dedicated SLA',
    ],
  },
};

export interface SubscriptionRecord {
  subscription_id: string;
  tenant_id: string;
  tier: SaaSPlanTier;
  status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED';
  current_period_end: string;
}

export class SaaSSubscriptionManager {
  private subscriptions = new Map<string, SubscriptionRecord>();

  createSubscription(tenantId: string, tier: SaaSPlanTier): SubscriptionRecord {
    const subId = `sub_${tenantId}_${Date.now()}`;
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const record: SubscriptionRecord = {
      subscription_id: subId,
      tenant_id: tenantId,
      tier,
      status: 'ACTIVE',
      current_period_end: periodEnd,
    };

    this.subscriptions.set(tenantId, record);
    return record;
  }

  getSubscription(tenantId: string): SubscriptionRecord | undefined {
    return this.subscriptions.get(tenantId);
  }

  updateStatus(tenantId: string, status: SubscriptionRecord['status']): void {
    const sub = this.subscriptions.get(tenantId);
    if (sub) {
      sub.status = status;
    }
  }

  isTenantEntitled(tenantId: string): boolean {
    const sub = this.subscriptions.get(tenantId);
    return Boolean(sub && (sub.status === 'ACTIVE' || sub.status === 'TRIALING'));
  }
}
