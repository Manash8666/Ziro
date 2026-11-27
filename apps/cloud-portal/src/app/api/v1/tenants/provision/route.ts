import net from 'node:net';
import { NextResponse, type NextRequest } from 'next/server';
import { Pool } from 'pg';
import { z } from 'zod';
import {
  ZIRO_PLATFORM_FEE_BPS,
  ZIRO_SAAS_PLANS,
  type TenantBillingStatus,
  type ZiroPlanTier,
} from '@/lib/billing-plans';
import type { DbPoolLike } from '@/lib/billing-lifecycle-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const TRIAL_WINDOW_DAYS = 14 as const;

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])?$/;
const VALID_HOSTNAME_REGEX =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

const RESERVED_TENANT_SLUGS = new Set([
  'www',
  'api',
  'app',
  'admin',
  'cloud',
  'pos',
  'edge',
  'docs',
  'status',
  'billing',
  'migrate',
  'demo',
  'demo-motors',
  'demo-nutrition',
  'sandbox',
  'staging',
  'prod',
  'production',
  'support',
  'mail',
  'cdn',
  'static',
  'assets',
  'ziro',
  'provision',
]);

const RESERVED_LOCAL_SUFFIXES = ['.localhost', '.local', '.internal', '.test', '.invalid'];

const ProvisionTenantSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Store display name must be at least 2 characters')
    .max(120, 'Store display name must not exceed 120 characters'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      SLUG_REGEX,
      'Slug must be 3-48 lowercase alphanumeric characters or single hyphens (no leading/trailing hyphen)'
    ),
  planTier: z.enum(['starter', 'growth', 'scale']).default('starter'),
  ownerEmail: z.string().trim().email('Valid owner email address is required'),
  customDomain: z.string().trim().toLowerCase().nullable().optional(),
  platformFeeBps: z.number().int().optional(),
});

interface ProvisionedRegistryRow {
  tenant_id: string;
  slug: string;
  display_name: string;
  custom_domain: string | null;
  plan_tier: ZiroPlanTier;
  billing_status: TenantBillingStatus;
  current_period_end: string;
  is_demo_sandbox: boolean;
  read_only_catalog: boolean;
  platform_fee_bps: number;
}

export interface TenantProvisionDeps {
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

function getRootDomain(): string {
  return (process.env.ZIRO_ROOT_DOMAIN ?? 'ziro.build')
    .trim()
    .toLowerCase()
    .replace(/\.$/, '');
}

export function deriveTenantIdFromSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase().replace(/-/g, '_');
  return `tenant_${normalized}`;
}

function normalizeAndValidateCustomDomain(
  rawDomain: string | null | undefined,
  rootDomain: string
): { ok: true; domain: string | null } | { ok: false; error: string } {
  if (rawDomain === undefined || rawDomain === null || rawDomain.trim() === '') {
    return { ok: true, domain: null };
  }

  const normalized = rawDomain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '');

  if (!normalized || normalized === 'localhost' || net.isIP(normalized) !== 0) {
    return { ok: false, error: 'Custom domain must be a valid public hostname (not localhost or IP)' };
  }

  if (RESERVED_LOCAL_SUFFIXES.some((suffix) => normalized.endsWith(suffix))) {
    return { ok: false, error: 'Reserved internal or local domain suffixes are not permitted' };
  }

  if (!VALID_HOSTNAME_REGEX.test(normalized)) {
    return { ok: false, error: 'Invalid custom domain hostname format' };
  }

  if (normalized === rootDomain || normalized.endsWith(`.${rootDomain}`)) {
    return {
      ok: false,
      error: `Custom domain cannot use first-party ${rootDomain} namespace (your slug subdomain is provisioned automatically)`,
    };
  }

  return { ok: true, domain: normalized };
}

function jsonNoStore(body: Record<string, unknown>, status: number): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

export async function handleTenantProvision(
  req: NextRequest | Request,
  deps: TenantProvisionDeps = {}
): Promise<NextResponse> {
  let rawJson: unknown;
  try {
    rawJson = await req.json();
  } catch {
    return jsonNoStore(
      { error: 'Malformed JSON request body', platformFeeBps: ZIRO_PLATFORM_FEE_BPS },
      400
    );
  }

  const parsed = ProvisionTenantSchema.safeParse(rawJson);
  if (!parsed.success) {
    return jsonNoStore(
      {
        error: 'Invalid tenant provisioning payload',
        details: parsed.error.flatten(),
        platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
      },
      400
    );
  }

  const { displayName, slug, planTier, ownerEmail, customDomain, platformFeeBps } = parsed.data;

  // 1. Enforce Ziro hardcoded 0% GMV tax invariant
  if (platformFeeBps !== undefined && platformFeeBps !== ZIRO_PLATFORM_FEE_BPS) {
    return jsonNoStore(
      {
        error: `Invariant violation: Ziro enforces platformFeeBps = 0 (received ${platformFeeBps})`,
        platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
      },
      422
    );
  }

  // 2. Block reserved platform slugs and demo-* sandbox namespace spoofing
  if (RESERVED_TENANT_SLUGS.has(slug) || slug.startsWith('demo-')) {
    return jsonNoStore(
      {
        error: `Slug "${slug}" is reserved by Ziro platform infrastructure or sandbox namespaces`,
        field: 'slug',
        platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
      },
      400
    );
  }

  // 3. Validate optional custom domain
  const rootDomain = getRootDomain();
  const domainCheck = normalizeAndValidateCustomDomain(customDomain, rootDomain);
  if (!domainCheck.ok) {
    return jsonNoStore(
      {
        error: domainCheck.error,
        field: 'customDomain',
        platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
      },
      400
    );
  }

  const tenantId = deriveTenantIdFromSlug(slug);
  const now = deps.now ?? new Date();
  const trialEndsAt = new Date(now.getTime() + TRIAL_WINDOW_DAYS * 86_400_000);
  const trialEndsAtIso = trialEndsAt.toISOString();

  const db = deps.db ?? getDefaultDbPool();
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // 4. Check for existing tenant_id, slug, or custom_domain conflicts
    const conflictRes = await client.query<{
      tenant_id: string;
      slug: string;
      custom_domain: string | null;
    }>(
      `SELECT tenant_id, slug, custom_domain
       FROM ziro_tenant_registry
       WHERE tenant_id = $1
          OR LOWER(slug) = $2
          OR ($3::text IS NOT NULL AND LOWER(custom_domain) = $3)
       LIMIT 1;`,
      [tenantId, slug, domainCheck.domain]
    );

    const conflict = conflictRes.rows[0];
    if (conflict) {
      await client.query('ROLLBACK');
      const isDomainConflict =
        domainCheck.domain !== null &&
        conflict.custom_domain?.toLowerCase() === domainCheck.domain;

      return jsonNoStore(
        {
          error: isDomainConflict
            ? `Custom domain "${domainCheck.domain}" is already registered to another tenant`
            : `Store slug "${slug}" is already claimed`,
          conflictField: isDomainConflict ? 'customDomain' : 'slug',
          platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
        },
        409
      );
    }

    // 5. Insert new merchant tenant with 14-day trialing window & locked 0% GMV tax
    const insertRes = await client.query<ProvisionedRegistryRow>(
      `INSERT INTO ziro_tenant_registry (
         tenant_id,
         slug,
         display_name,
         custom_domain,
         plan_tier,
         billing_status,
         billing_provider,
         current_period_end,
         grace_period_ends_at,
         is_demo_sandbox,
         read_only_catalog,
         platform_fee_bps,
         created_at,
         updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, 'trialing', NULL, $6::timestamptz, NULL, FALSE, FALSE, 0, NOW(), NOW()
       )
       RETURNING
         tenant_id,
         slug,
         display_name,
         custom_domain,
         plan_tier,
         billing_status,
         current_period_end::text AS current_period_end,
         is_demo_sandbox,
         read_only_catalog,
         platform_fee_bps;`,
      [tenantId, slug, displayName, domainCheck.domain, planTier, trialEndsAtIso]
    );

    const created = insertRes.rows[0];
    if (!created) {
      throw new Error('Failed to insert tenant record into ziro_tenant_registry');
    }

    if (Number(created.platform_fee_bps) !== ZIRO_PLATFORM_FEE_BPS || created.is_demo_sandbox) {
      throw new Error(`Invariant violation on newly provisioned tenant ${tenantId}`);
    }

    await client.query('COMMIT');

    const primaryHost = created.custom_domain ?? `${created.slug}.${rootDomain}`;
    const entitlements = ZIRO_SAAS_PLANS[created.plan_tier];

    return jsonNoStore(
      {
        status: 'provisioned',
        tenant: {
          tenantId: created.tenant_id,
          slug: created.slug,
          displayName: created.display_name,
          ownerEmail,
          customDomain: created.custom_domain,
          planTier: created.plan_tier,
          billingStatus: created.billing_status,
          trialDays: TRIAL_WINDOW_DAYS,
          trialEndsAt: created.current_period_end,
          isDemoSandbox: false,
          readOnlyCatalog: false,
          platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
        },
        endpoints: {
          storefrontUrl: `https://${primaryHost}`,
          defaultSubdomainUrl: `https://${created.slug}.${rootDomain}`,
          posUrl: `https://pos.${rootDomain}`,
          cloudBillingUrl: `https://cloud.${rootDomain}/billing?tenantId=${created.tenant_id}`,
          ucpManifestUrl: `https://${primaryHost}/.well-known/ucp`,
        },
        entitlements,
        platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
      },
      201
    );
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});

    // Handle concurrent unique index race condition (PostgreSQL error code 23505)
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: string }).code === '23505'
    ) {
      return jsonNoStore(
        {
          error: 'Slug or custom domain was just claimed by another request',
          platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
        },
        409
      );
    }

    const message = err instanceof Error ? err.message : 'Unexpected tenant provisioning error';
    return jsonNoStore({ error: message, platformFeeBps: ZIRO_PLATFORM_FEE_BPS }, 500);
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handleTenantProvision(req);
}
