import { describe, expect, it } from 'vitest';
import { sandboxGuardMiddleware } from '../src/api/middlewares';
import { isSandboxTenant, assertSandboxMutationAllowed, SandboxReadOnlyError } from '../src/lib/sandbox-policy';
import type { EngineRequest, EngineResponse } from '../src/services/engine-container';

function createMockResponse(): { res: EngineResponse; getPayload: () => any; getStatus: () => number } {
  let statusCode = 200;
  let responsePayload: any = null;

  const res: EngineResponse = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(payload: any) {
      responsePayload = payload;
      return res;
    },
  };

  return {
    res,
    getStatus: () => statusCode,
    getPayload: () => responsePayload,
  };
}

describe('Commerce Engine Sandbox Policy Guard', () => {
  it('correctly identifies public sandbox tenants', () => {
    expect(isSandboxTenant('sandbox-auto-parts')).toBe(true);
    expect(isSandboxTenant('sandbox-industrial-hydraulics')).toBe(true);
    expect(isSandboxTenant('sandbox-d2c-apparel')).toBe(true);
    expect(isSandboxTenant('sandbox-custom-demo')).toBe(true);
    expect(isSandboxTenant('tenant-real-merchant')).toBe(false);
    expect(isSandboxTenant(null)).toBe(false);
  });

  it('allows read-only GET requests on sandbox tenants', () => {
    const { res, getStatus } = createMockResponse();
    let nextCalled = false;

    const req: EngineRequest & { method: string } = {
      method: 'GET',
      headers: {
        'x-ziro-tenant-id': 'sandbox-auto-parts',
      },
    };

    const allowed = sandboxGuardMiddleware(req, res, () => {
      nextCalled = true;
    });

    expect(allowed).toBe(true);
    expect(nextCalled).toBe(true);
    expect(getStatus()).toBe(200);
  });

  it('blocks POST/PUT/DELETE mutations on sandbox tenants with 403 and 0% GMV fee invariant', () => {
    const { res, getStatus, getPayload } = createMockResponse();
    let nextCalled = false;

    const req: EngineRequest & { method: string } = {
      method: 'POST',
      headers: {
        'x-ziro-tenant-id': 'sandbox-auto-parts',
      },
      body: { action: 'delete_catalog' },
    };

    const allowed = sandboxGuardMiddleware(req, res, () => {
      nextCalled = true;
    });

    expect(allowed).toBe(false);
    expect(nextCalled).toBe(false);
    expect(getStatus()).toBe(403);

    const payload = getPayload();
    expect(payload.error).toBe('SANDBOX_READ_ONLY');
    expect(payload.platformFeeBps).toBe(0);
    expect(payload.tenantId).toBe('sandbox-auto-parts');
  });

  it('allows maintenance bypass with valid service token for administrative seeding', () => {
    process.env.ZIRO_INTERNAL_SERVICE_TOKEN = 'test-service-token-secret';
    const { res, getStatus } = createMockResponse();
    let nextCalled = false;

    const req: EngineRequest & { method: string } = {
      method: 'POST',
      headers: {
        'x-ziro-tenant-id': 'sandbox-auto-parts',
        'x-ziro-sandbox-maintenance': 'true',
        authorization: 'Bearer test-service-token-secret',
      },
      body: { action: 'admin_seed' },
    };

    const allowed = sandboxGuardMiddleware(req, res, () => {
      nextCalled = true;
    });

    expect(allowed).toBe(true);
    expect(nextCalled).toBe(true);
    expect(getStatus()).toBe(200);
  });

  it('assertSandboxMutationAllowed throws SandboxReadOnlyError on mutation', () => {
    expect(() => {
      assertSandboxMutationAllowed('sandbox-d2c-apparel', 'DELETE');
    }).toThrow(SandboxReadOnlyError);

    // GET should not throw
    expect(() => {
      assertSandboxMutationAllowed('sandbox-d2c-apparel', 'GET');
    }).not.toThrow();

    // Regular tenant should not throw on POST
    expect(() => {
      assertSandboxMutationAllowed('live-production-tenant', 'POST');
    }).not.toThrow();
  });
});
