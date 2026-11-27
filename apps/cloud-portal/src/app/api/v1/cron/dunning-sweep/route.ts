import crypto from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { Pool } from 'pg';
import { z } from 'zod';
import {
  ZIRO_PLATFORM_FEE_BPS,
  type TenantBillingStatus,
  type ZiroPlanTier,
} from '@/lib/billing-plans';
import type { DbPoolLike } from '@/lib/billing-lifecycle-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_BATCH_LIMIT = 250;
const MAX_BATCH_LIMIT = 1000;

const SweepOptionsSchema = z.object({
  dryRun: z.boolean().default(false),
  limit: z.number().int().min(1).max(MAX_BATCH_LIMIT).default(DEFAULT_BATCH_LIMIT),
});

interface ExpiredGraceTenantRow {
  tenant_id: string;
  slug: string;
  custom_domain: string | null;
  plan_tier: ZiroPlanTier;
  billing_status: TenantBillingStatus;
  billing_provider: string | null;
  external_subscription_id: string | null;
  grace_period_ends_at: string;
  is_demo_sandbox: boolean;
  platform_fee_bps: number;
}

export interface SweptTenantSummary {
  tenantId: string;
  slug: string;
  customDomain: string | null;
  planTier: ZiroPlanTier;
  previousStatus: 'past_due';
  newStatus: 'suspended' | 'past_due';
  billingProvider: string | null;
  gracePeriodEndsAt: string;
  platformFeeBps: typeof ZIRO_PLATFORM_FEE_BPS;
}

export interface DunningSweepDeps {
  db?: DbPoolLike;
  now?: Date;
}

let sharedPool: Pool | null = null;
function getDefaultDbPool(): DbPoolLike {
  if (!sharedPool) {
    sharedPool = new Pool({
      connectionString:
        process.env.DATABASE_URL ?? 'postgres://ziro:ziro_dev_secret@localhost:5432/ziro_core',
    });
  }
  return sharedPool;
}

function timingSafeTokenMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided.trim(), 'utf8');
  const b = Buffer.from(expected.trim(), 'utf8');
  if (a.length === 0 || a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function verifyCronAuthorization(authHeader: string | null): {
  authorized: boolean;
  misconfigured: boolean;
} {
  const serviceToken = (process.env.ZIRO_INTERNAL_SERVICE_TOKEN ?? '').trim();
  const cronSecret = (process.env.CRON_SECRET ?? '').trim();

  if (!serviceToken && !cronSecret) {
    return { authorized: false, misconfigured: true };
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authorized: false, misconfigured: false };
  }

  const provided = authHeader.slice('Bearer '.length).trim();
  if (!provided) {
    return { authorized: false, misconfigured: false };
  }

  const matchesService =
    serviceToken.length > 0 && timingSafeTokenMatch(provided, serviceToken);
  const matchesCron = cronSecret.length > 0 && timingSafeTokenMatch(provided, cronSecret);

  return {
    authorized: matchesService || matchesCron,
    misconfigured: false,
  };
}

function jsonNoStore(body: Record<string, unknown>, status: number): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

async function parseSweepOptions(req: NextRequest | Request): Promise<{
  ok: true;
  dryRun: boolean;
  limit: number;
} | {
  ok: false;
  error: string;
}> {
  const reqUrl = new URL(req.url);
  const queryDryRun = reqUrl.searchParams.get('dryRun');
  const queryLimit = reqUrl.searchParams.get('limit');

  let rawDryRun: unknown =
    queryDryRun !== null ? queryDryRun.trim().toLowerCase() === 'true' : false;
  let rawLimit: unknown =
    queryLimit !== null ? Number.parseInt(queryLimit, 10) : DEFAULT_BATCH_LIMIT;

  if (req.method.toUpperCase() === 'POST') {
    const rawText = await req.text().catch(() => '');
    if (rawText.trim().length > 0) {
      try {
        const body = JSON.parse(rawText) as Record<string, unknown>;
        if (typeof body.dryRun === 'boolean') {
          rawDryRun = body.dryRun;
        }
        if (typeof body.limit === 'number') {
          rawLimit = body.limit;
        }
      } catch {
        return { ok: false, error: 'Malformed JSON request body' };
      }
    }
  }

  const parsed = SweepOptionsSchema.safeParse({
    dryRun: rawDryRun,
    limit: rawLimit,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join('; '),
    };
  }

  return {
    ok: true,
    dryRun: parsed.data.dryRun,
    limit: parsed.data.limit,
  };
}

export async function handleDunningSweep(
  req: NextRequest | Request,
  deps: DunningSweepDeps = {}
): Promise<NextResponse> {
  // 1. Authenticate internal cron / service caller
  const auth = verifyCronAuthorization(req.headers.get('authorization'));
  if (auth.misconfigured) {
    return jsonNoStore(
      {
        error: 'Cron authentication secret is not configured (set ZIRO_INTERNAL_SERVICE_TOKEN or CRON_SECRET)',
        platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
      },
      503
    );
  }

  if (!auth.authorized) {
    return jsonNoStore(
      {
        error: 'Unauthorized: valid internal service or cron Bearer token required',
        platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
      },
      401
    );
  }

  // 2. Parse dryRun & batch limit options
  const parsedOpts = await parseSweepOptions(req);
  if (!parsedOpts.ok) {
    return jsonNoStore(
      {
        error: parsedOpts.error,
        platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
      },
      400
    );
  }

  const evaluatedAt = deps.now ?? new Date();
  const evaluatedAtIso = evaluatedAt.toISOString();
  const db = deps.db ?? getDefaultDbPool();
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // 3. Count any public sandbox tenants flagged past_due so we audit sandbox protection explicitly
    const sandboxCountRes = await client.query<{ sandbox_cnt: string | number }>(
      `SELECT COUNT(*)::int AS sandbox_cnt
       FROM ziro_tenant_registry
       WHERE billing_status = 'past_due'
         AND is_demo_sandbox = TRUE;`
    );
    const sandboxProtectedCount = Number(sandboxCountRes.rows[0]?.sandbox_cnt ?? 0);

    // 4. Lock eligible non-sandbox tenants whose 7-day dunning grace period has expired
    const candidatesRes = await client.query<ExpiredGraceTenantRow>(
      `SELECT
         tenant_id,
         slug,
         custom_domain,
         plan_tier,
         billing_status,
         billing_provider,
         external_subscription_id,
         grace_period_ends_at::text AS grace_period_ends_at,
         is_demo_sandbox,
         platform_fee_bps
       FROM ziro_tenant_registry
       WHERE billing_status = 'past_due'
         AND grace_period_ends_at IS NOT NULL
         AND grace_period_ends_at <= $1::timestamptz
         AND is_demo_sandbox = FALSE
       ORDER BY grace_period_ends_at ASC
       LIMIT $2
       FOR UPDATE SKIP LOCKED;`,
      [evaluatedAtIso, parsedOpts.limit]
    );

    const candidates = candidatesRes.rows;

    // 5. Dry-run preview returns candidates without mutating ziro_tenant_registry
    if (parsedOpts.dryRun) {
      await client.query('COMMIT');
      const previewItems: SweptTenantSummary[] = candidates.map((row) => ({
        tenantId: row.tenant_id,
        slug: row.slug,
        customDomain: row.custom_domain,
        planTier: row.plan_tier,
        previousStatus: 'past_due',
        newStatus: 'past_due',
        billingProvider: row.billing_provider,
        gracePeriodEndsAt: row.grace_period_ends_at,
        platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
      }));

      return jsonNoStore(
        {
          status: 'ok',
          mode: 'dry_run',
          evaluatedAt: evaluatedAtIso,
          sweptCount: previewItems.length,
          sandboxProtectedCount,
          transitionedTenants: previewItems,
          platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
        },
        200
      );
    }

    // 6. Atomically transition expired tenants to 'suspended' and lock platform_fee_bps = 0
    const transitionedTenants: SweptTenantSummary[] = [];

    if (candidates.length > 0) {
      const targetIds = candidates.map((c) => c.tenant_id);

      const updatedRes = await client.query<ExpiredGraceTenantRow>(
        `UPDATE ziro_tenant_registry
         SET billing_status = 'suspended',
             platform_fee_bps = 0,
             updated_at = NOW()
         WHERE tenant_id = ANY($1::text[])
           AND billing_status = 'past_due'
           AND is_demo_sandbox = FALSE
         RETURNING
           tenant_id,
           slug,
           custom_domain,
           plan_tier,
           billing_status,
           billing_provider,
           external_subscription_id,
           grace_period_ends_at::text AS grace_period_ends_at,
           is_demo_sandbox,
           platform_fee_bps;`,
        [targetIds]
      );

      for (const updated of updatedRes.rows) {
        if (Number(updated.platform_fee_bps) !== ZIRO_PLATFORM_FEE_BPS) {
          throw new Error(
            `Invariant violation on ${updated.tenant_id}: platform_fee_bps must remain 0`
          );
        }

        transitionedTenants.push({
          tenantId: updated.tenant_id,
          slug: updated.slug,
          customDomain: updated.custom_domain,
          planTier: updated.plan_tier,
          previousStatus: 'past_due',
          newStatus: 'suspended',
          billingProvider: updated.billing_provider,
          gracePeriodEndsAt: updated.grace_period_ends_at,
          platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
        });
      }
    }

    await client.query('COMMIT');

    return jsonNoStore(
      {
        status: 'ok',
        mode: 'committed',
        evaluatedAt: evaluatedAtIso,
        sweptCount: transitionedTenants.length,
        sandboxProtectedCount,
        transitionedTenants,
        platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
      },
      200
    );
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    const message = err instanceof Error ? err.message : 'Unexpected dunning sweep failure';
    return jsonNoStore(
      {
        error: message,
        platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
      },
      500
    );
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handleDunningSweep(req);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  return handleDunningSweep(req);
}
