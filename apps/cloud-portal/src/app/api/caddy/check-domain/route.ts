import crypto from 'node:crypto';
import net from 'node:net';
import { NextResponse, type NextRequest } from 'next/server';
import { Pool } from 'pg';
import {
  ZIRO_PLATFORM_FEE_BPS,
  isTenantActiveForEdgeRouting,
  type TenantBillingStatus,
  type ZiroPlanTier,
} from '@/lib/billing-plans';
import type { DbPoolLike } from '@/lib/billing-lifecycle-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_HOSTNAME_REGEX =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

const RESERVED_LOCAL_SUFFIXES = ['.localhost', '.local', '.internal', '.test', '.invalid'];

const VALID_BILLING_STATUSES = new Set<TenantBillingStatus>([
  'trialing',
  'active',
  'past_due',
  'canceled',
  'suspended',
]);

interface TenantDomainRegistryRow {
  tenant_id: string;
  slug: string;
  custom_domain: string | null;
  plan_tier: ZiroPlanTier;
  billing_status: TenantBillingStatus;
  grace_period_ends_at: string | null;
  is_demo_sandbox: boolean;
  platform_fee_bps: number;
}

export interface CaddyCheckDomainDeps {
  db?: DbPoolLike;
  nowMs?: number;
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

function timingSafeSecretEqual(provided: string | null, expected: string): boolean {
  if (!provided) {
    return false;
  }
  const a = Buffer.from(provided.trim(), 'utf8');
  const b = Buffer.from(expected.trim(), 'utf8');
  if (a.length === 0 || a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function normalizeAndValidateDomain(rawDomain: string | null): string | null {
  if (!rawDomain) {
    return null;
  }

  const normalized = rawDomain.trim().toLowerCase().replace(/\.$/, '');
  if (!normalized || normalized === 'localhost') {
    return null;
  }

  // Reject raw IPv4 or IPv6 addresses
  if (net.isIP(normalized) !== 0) {
    return null;
  }

  if (RESERVED_LOCAL_SUFFIXES.some((suffix) => normalized.endsWith(suffix))) {
    return null;
  }

  if (!VALID_HOSTNAME_REGEX.test(normalized)) {
    return null;
  }

  return normalized;
}

function getRootDomain(): string {
  return (process.env.ZIRO_ROOT_DOMAIN ?? 'ziro.build')
    .trim()
    .toLowerCase()
    .replace(/\.$/, '');
}

function isFirstPartyPlatformHost(domain: string, rootDomain: string): boolean {
  const systemHosts = new Set([
    rootDomain,
    `edge.${rootDomain}`,
    `cloud.${rootDomain}`,
    `pos.${rootDomain}`,
  ]);
  return systemHosts.has(domain);
}

function extractTenantSlugIfSubdomain(domain: string, rootDomain: string): string | null {
  const suffix = `.${rootDomain}`;
  if (!domain.endsWith(suffix)) {
    return null;
  }
  const label = domain.slice(0, -suffix.length);
  // Only match single-level tenant subdomains (<slug>.ziro.build)
  if (!label || label.includes('.')) {
    return null;
  }
  return label;
}

function jsonNoStore(body: Record<string, unknown>, status: number): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

export async function handleCaddyCheckDomain(
  req: NextRequest | Request,
  deps: CaddyCheckDomainDeps = {}
): Promise<NextResponse> {
  // 1. Verify internal Caddy secret (passed via ?secret= by Caddyfile or X-Ziro-Caddy-Secret)
  const expectedSecret = (process.env.CADDY_INTERNAL_SECRET ?? '').trim();
  if (!expectedSecret) {
    return jsonNoStore(
      {
        allowed: false,
        error: 'CADDY_INTERNAL_SECRET is not configured',
        platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
      },
      503
    );
  }

  const reqUrl = new URL(req.url);
  const providedSecret =
    reqUrl.searchParams.get('secret') ?? req.headers.get('x-ziro-caddy-secret');

  if (!timingSafeSecretEqual(providedSecret, expectedSecret)) {
    return jsonNoStore(
      {
        allowed: false,
        error: 'Unauthorized: invalid Caddy internal secret',
        platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
      },
      401
    );
  }

  // 2. Validate requested TLS SNI domain passed by Caddy (?domain=...)
  const domain = normalizeAndValidateDomain(reqUrl.searchParams.get('domain'));
  if (!domain) {
    return jsonNoStore(
      {
        allowed: false,
        error: 'Missing or invalid domain query parameter',
        platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
      },
      400
    );
  }

  const rootDomain = getRootDomain();

  // 3. Approve first-party Ziro platform infrastructure hostnames
  if (isFirstPartyPlatformHost(domain, rootDomain)) {
    return jsonNoStore(
      {
        allowed: true,
        reason: 'first_party_platform_host',
        domain,
        platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
      },
      200
    );
  }

  // 4. Query ziro_tenant_registry by custom_domain or <slug>.<rootDomain>
  const tenantSlug = extractTenantSlugIfSubdomain(domain, rootDomain);
  const db = deps.db ?? getDefaultDbPool();
  const client = await db.connect();

  let tenantRow: TenantDomainRegistryRow | undefined;
  try {
    const queryRes = await client.query<TenantDomainRegistryRow>(
      `SELECT
         tenant_id,
         slug,
         custom_domain,
         plan_tier,
         billing_status,
         grace_period_ends_at::text AS grace_period_ends_at,
         is_demo_sandbox,
         platform_fee_bps
       FROM ziro_tenant_registry
       WHERE LOWER(custom_domain) = $1
          OR ($2::text IS NOT NULL AND LOWER(slug) = $2)
       LIMIT 1;`,
      [domain, tenantSlug]
    );
    tenantRow = queryRes.rows[0];
  } finally {
    client.release();
  }

  if (!tenantRow) {
    return jsonNoStore(
      {
        allowed: false,
        reason: 'domain_not_registered',
        domain,
        platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
      },
      404
    );
  }

  // 5. Fail closed if hardcoded 0% GMV tax invariant was violated in DB
  if (Number(tenantRow.platform_fee_bps) !== ZIRO_PLATFORM_FEE_BPS) {
    return jsonNoStore(
      {
        allowed: false,
        reason: 'platform_fee_invariant_violation',
        tenantId: tenantRow.tenant_id,
        domain,
      },
      500
    );
  }

  // 6. Always allow active public demo sandboxes
  if (tenantRow.is_demo_sandbox) {
    return jsonNoStore(
      {
        allowed: true,
        reason: 'demo_sandbox_active',
        tenantId: tenantRow.tenant_id,
        domain,
        planTier: tenantRow.plan_tier,
        billingStatus: tenantRow.billing_status,
        platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
      },
      200
    );
  }

  // 7. Evaluate subscription & dunning grace window via isTenantActiveForEdgeRouting
  const billingStatus: TenantBillingStatus = VALID_BILLING_STATUSES.has(tenantRow.billing_status)
    ? tenantRow.billing_status
    : 'suspended';

  const isEligible = isTenantActiveForEdgeRouting({
    billingStatus,
    gracePeriodEndsAt: tenantRow.grace_period_ends_at,
    nowMs: deps.nowMs,
  });

  if (!isEligible) {
    const denialReason =
      billingStatus === 'past_due'
        ? 'dunning_grace_period_expired'
        : `billing_${billingStatus}`;

    return jsonNoStore(
      {
        allowed: false,
        reason: denialReason,
        tenantId: tenantRow.tenant_id,
        domain,
        planTier: tenantRow.plan_tier,
        billingStatus,
        gracePeriodEndsAt: tenantRow.grace_period_ends_at,
        platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
      },
      403
    );
  }

  const approvalReason =
    billingStatus === 'past_due' ? 'past_due_within_grace_period' : 'subscription_active';

  return jsonNoStore(
    {
      allowed: true,
      reason: approvalReason,
      tenantId: tenantRow.tenant_id,
      domain,
      planTier: tenantRow.plan_tier,
      billingStatus,
      gracePeriodEndsAt: tenantRow.grace_period_ends_at,
      platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
    },
    200
  );
}

export async function GET(req: NextRequest | Request): Promise<NextResponse> {
  return handleCaddyCheckDomain(req);
}
