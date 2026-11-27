import crypto from 'node:crypto';
import {
  DUNNING_GRACE_PERIOD_DAYS,
  ZIRO_PLATFORM_FEE_BPS,
  type BillingProvider,
  type TenantBillingStatus,
  type ZiroPlanTier,
} from './billing-plans';

export interface BillingLifecycleTransitionInput {
  provider: BillingProvider;
  eventId: string;
  eventType: string;
  rawBody: string;
  tenantIdHint?: string | null;
  externalCustomerId?: string | null;
  externalSubscriptionId?: string | null;
  targetStatus: TenantBillingStatus;
  targetPlanTier?: ZiroPlanTier | null;
  currentPeriodEndIso?: string | null;
  now?: Date;
}

export interface BillingLifecycleTransitionResult {
  outcome: 'applied' | 'duplicate_ignored' | 'sandbox_protected' | 'tenant_not_found';
  provider: BillingProvider;
  eventId: string;
  eventType: string;
  tenantId: string | null;
  billingStatus: TenantBillingStatus | null;
  planTier: ZiroPlanTier | null;
  gracePeriodEndsAt: string | null;
  platformFeeBps: typeof ZIRO_PLATFORM_FEE_BPS;
}

export interface SqlClientLike {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[]
  ): Promise<{ rows: T[]; rowCount: number | null }>;
}

export interface DbPoolLike {
  connect(): Promise<SqlClientLike & { release(): void }>;
}

function addDaysIso(base: Date, days: number): string {
  const copy = new Date(base.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy.toISOString();
}

export async function applyBillingLifecycleEvent(
  db: DbPoolLike,
  input: BillingLifecycleTransitionInput
): Promise<BillingLifecycleTransitionResult> {
  const now = input.now ?? new Date();
  const payloadSha256 = crypto.createHash('sha256').update(input.rawBody, 'utf8').digest('hex');
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // 1. Idempotency check: skip duplicate webhook deliveries cleanly
    const priorEventRes = await client.query<{
      tenant_id: string;
      resulting_status: TenantBillingStatus;
      plan_tier: ZiroPlanTier | null;
    }>(
      `SELECT tenant_id, resulting_status, plan_tier
       FROM ziro_billing_webhook_events
       WHERE provider = $1 AND event_id = $2
       LIMIT 1;`,
      [input.provider, input.eventId]
    );

    const priorEvent = priorEventRes.rows[0];
    if (priorEvent) {
      await client.query('COMMIT');
      return {
        outcome: 'duplicate_ignored',
        provider: input.provider,
        eventId: input.eventId,
        eventType: input.eventType,
        tenantId: priorEvent.tenant_id,
        billingStatus: priorEvent.resulting_status,
        planTier: priorEvent.plan_tier,
        gracePeriodEndsAt: null,
        platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
      };
    }

    // 2. Locate target tenant by explicit tenantIdHint or existing external_subscription_id
    let tenantRow:
      | {
          tenant_id: string;
          plan_tier: ZiroPlanTier;
          billing_status: TenantBillingStatus;
          is_demo_sandbox: boolean;
          grace_period_ends_at: string | null;
        }
      | undefined;

    if (input.tenantIdHint && input.tenantIdHint.trim().length > 0) {
      const byIdRes = await client.query<{
        tenant_id: string;
        plan_tier: ZiroPlanTier;
        billing_status: TenantBillingStatus;
        is_demo_sandbox: boolean;
        grace_period_ends_at: string | null;
      }>(
        `SELECT tenant_id, plan_tier, billing_status, is_demo_sandbox, grace_period_ends_at::text
         FROM ziro_tenant_registry
         WHERE tenant_id = $1
         FOR UPDATE;`,
        [input.tenantIdHint.trim()]
      );
      tenantRow = byIdRes.rows[0];
    }

    if (!tenantRow && input.externalSubscriptionId) {
      const bySubRes = await client.query<{
        tenant_id: string;
        plan_tier: ZiroPlanTier;
        billing_status: TenantBillingStatus;
        is_demo_sandbox: boolean;
        grace_period_ends_at: string | null;
      }>(
        `SELECT tenant_id, plan_tier, billing_status, is_demo_sandbox, grace_period_ends_at::text
         FROM ziro_tenant_registry
         WHERE billing_provider = $1 AND external_subscription_id = $2
         FOR UPDATE;`,
        [input.provider, input.externalSubscriptionId]
      );
      tenantRow = bySubRes.rows[0];
    }

    if (!tenantRow) {
      await client.query('ROLLBACK');
      return {
        outcome: 'tenant_not_found',
        provider: input.provider,
        eventId: input.eventId,
        eventType: input.eventType,
        tenantId: input.tenantIdHint ?? null,
        billingStatus: null,
        planTier: null,
        gracePeriodEndsAt: null,
        platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
      };
    }

    // 3. Never allow external billing webhooks to mutate or suspend read-only public demo sandboxes
    if (tenantRow.is_demo_sandbox) {
      await client.query('COMMIT');
      return {
        outcome: 'sandbox_protected',
        provider: input.provider,
        eventId: input.eventId,
        eventType: input.eventType,
        tenantId: tenantRow.tenant_id,
        billingStatus: tenantRow.billing_status,
        planTier: tenantRow.plan_tier,
        gracePeriodEndsAt: null,
        platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
      };
    }

    // 4. Compute resulting billing status, plan tier & dunning grace window
    const nextPlanTier: ZiroPlanTier = input.targetPlanTier ?? tenantRow.plan_tier;
    const nextStatus: TenantBillingStatus = input.targetStatus;

    let nextGraceEndIso: string | null = null;
    if (nextStatus === 'past_due') {
      // Preserve existing grace deadline if already in dunning; otherwise grant 7 days
      nextGraceEndIso =
        tenantRow.billing_status === 'past_due' && tenantRow.grace_period_ends_at
          ? tenantRow.grace_period_ends_at
          : addDaysIso(now, DUNNING_GRACE_PERIOD_DAYS);
    }

    // 5. Update ziro_tenant_registry while strictly locking platform_fee_bps = 0
    await client.query(
      `UPDATE ziro_tenant_registry
       SET plan_tier = $2,
           billing_status = $3,
           billing_provider = $4,
           external_customer_id = COALESCE($5, external_customer_id),
           external_subscription_id = COALESCE($6, external_subscription_id),
           current_period_end = COALESCE($7::timestamptz, current_period_end),
           grace_period_ends_at = $8::timestamptz,
           platform_fee_bps = 0,
           updated_at = NOW()
       WHERE tenant_id = $1;`,
      [
        tenantRow.tenant_id,
        nextPlanTier,
        nextStatus,
        input.provider,
        input.externalCustomerId ?? null,
        input.externalSubscriptionId ?? null,
        input.currentPeriodEndIso ?? null,
        nextGraceEndIso,
      ]
    );

    // 6. Persist idempotency audit record
    await client.query(
      `INSERT INTO ziro_billing_webhook_events (
         provider, event_id, event_type, tenant_id, external_subscription_id,
         plan_tier, resulting_status, payload_sha256, platform_fee_bps, processed_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, NOW());`,
      [
        input.provider,
        input.eventId,
        input.eventType,
        tenantRow.tenant_id,
        input.externalSubscriptionId ?? null,
        nextPlanTier,
        nextStatus,
        payloadSha256,
      ]
    );

    await client.query('COMMIT');

    return {
      outcome: 'applied',
      provider: input.provider,
      eventId: input.eventId,
      eventType: input.eventType,
      tenantId: tenantRow.tenant_id,
      billingStatus: nextStatus,
      planTier: nextPlanTier,
      gracePeriodEndsAt: nextGraceEndIso,
      platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
