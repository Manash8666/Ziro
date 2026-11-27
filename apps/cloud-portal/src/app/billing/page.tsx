import type { Metadata } from 'next';
import { Pool } from 'pg';
import {
  ZIRO_PLATFORM_FEE_BPS,
  type BillingProvider,
  type TenantBillingStatus,
  type ZiroPlanTier,
} from '@/lib/billing-plans';
import {
  BillingPortalClient,
  type InitialTenantBillingSnapshot,
} from './BillingPortalClient';

export const metadata: Metadata = {
  title: 'SaaS Billing & Subscription Management | Ziro Cloud',
  description:
    'Manage your Ziro Commerce OS subscription in INR (Razorpay) or USD (Stripe) with a permanent 0% GMV transaction tax guarantee.',
};

export const dynamic = 'force-dynamic';

let sharedPool: Pool | null = null;
function getDbPool(): Pool {
  if (!sharedPool) {
    sharedPool = new Pool({
      connectionString:
        process.env.DATABASE_URL ?? 'postgres://ziro:ziro_dev_secret@localhost:5432/ziro_core',
    });
  }
  return sharedPool;
}

const TENANT_ID_REGEX = /^[a-zA-Z0-9_-]{3,64}$/;

async function loadTenantBillingSnapshot(
  tenantId: string
): Promise<InitialTenantBillingSnapshot> {
  const fallback: InitialTenantBillingSnapshot = {
    tenantId,
    displayName: tenantId,
    customDomain: null,
    planTier: 'starter',
    billingStatus: 'trialing',
    billingProvider: null,
    currentPeriodEnd: null,
    gracePeriodEndsAt: null,
    isDemoSandbox: tenantId.startsWith('tenant_demo_'),
    platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
  };

  try {
    const pool = getDbPool();
    const res = await pool.query<{
      tenant_id: string;
      display_name: string;
      custom_domain: string | null;
      plan_tier: ZiroPlanTier;
      billing_status: TenantBillingStatus;
      billing_provider: BillingProvider | null;
      current_period_end: string | null;
      grace_period_ends_at: string | null;
      is_demo_sandbox: boolean;
      platform_fee_bps: number;
    }>(
      `SELECT
         tenant_id,
         display_name,
         custom_domain,
         plan_tier,
         billing_status,
         billing_provider,
         current_period_end::text AS current_period_end,
         grace_period_ends_at::text AS grace_period_ends_at,
         is_demo_sandbox,
         platform_fee_bps
       FROM ziro_tenant_registry
       WHERE tenant_id = $1
       LIMIT 1;`,
      [tenantId]
    );

    const row = res.rows[0];
    if (!row) {
      return fallback;
    }

    return {
      tenantId: row.tenant_id,
      displayName: row.display_name,
      customDomain: row.custom_domain,
      planTier: row.plan_tier,
      billingStatus: row.billing_status,
      billingProvider: row.billing_provider,
      currentPeriodEnd: row.current_period_end,
      gracePeriodEndsAt: row.grace_period_ends_at,
      isDemoSandbox: Boolean(row.is_demo_sandbox),
      platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
    };
  } catch {
    return fallback;
  }
}

interface BillingPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const resolvedParams = await searchParams;

  const rawTenant = Array.isArray(resolvedParams.tenantId)
    ? resolvedParams.tenantId[0]
    : resolvedParams.tenantId;
  const tenantId =
    rawTenant && TENANT_ID_REGEX.test(rawTenant.trim())
      ? rawTenant.trim()
      : 'tenant_motofit2';

  const rawStatus = Array.isArray(resolvedParams.status)
    ? resolvedParams.status[0]
    : resolvedParams.status;
  const checkoutRedirectStatus =
    rawStatus === 'success' || rawStatus === 'canceled' ? rawStatus : null;

  const initialSnapshot = await loadTenantBillingSnapshot(tenantId);

  return (
    <main className="min-h-screen bg-[#090B0E] px-4 py-10 sm:px-8">
      <BillingPortalClient
        initialTenant={initialSnapshot}
        checkoutRedirectStatus={checkoutRedirectStatus}
      />
    </main>
  );
}
