import type { EngineRequest, EngineResponse } from '../services/engine-container.js';
import { isSandboxTenant } from '../lib/sandbox-policy.js';

export function authenticateInternalService(req: EngineRequest): { authorized: boolean; error?: string } {
  const authHeader = (req.headers['authorization'] || req.headers['Authorization']) as string | undefined;
  if (!authHeader) {
    return { authorized: false, error: 'Missing Authorization header' };
  }

  const expectedToken = process.env.ZIRO_INTERNAL_SERVICE_TOKEN || 'ziro_internal_secret_token_123';
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return { authorized: false, error: 'Invalid Authorization format. Expected Bearer <token>' };
  }

  const token = parts[1];
  if (token !== expectedToken) {
    return { authorized: false, error: 'Unauthorized: invalid internal service token' };
  }

  return { authorized: true };
}

export function sandboxGuardMiddleware(
  req: EngineRequest & { method?: string },
  res: EngineResponse,
  next?: () => void
): boolean {
  const tenantId = (req.headers['x-ziro-tenant-id'] || req.headers['X-Ziro-Tenant-Id']) as string | undefined;
  const method = (req.method || 'GET').toUpperCase();

  if (!tenantId || !isSandboxTenant(tenantId)) {
    if (next) next();
    return true;
  }

  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  if (!isMutation) {
    if (next) next();
    return true;
  }

  // Check for administrative maintenance bypass
  const maintenanceHeader = (req.headers['x-ziro-sandbox-maintenance'] ||
    req.headers['X-Ziro-Sandbox-Maintenance']) as string | undefined;
  const authHeader = (req.headers['authorization'] || req.headers['Authorization']) as string | undefined;
  const expectedToken = process.env.ZIRO_INTERNAL_SERVICE_TOKEN || 'ziro_internal_secret_token_123';

  if (maintenanceHeader === 'true' && authHeader === `Bearer ${expectedToken}`) {
    if (next) next();
    return true;
  }

  res.status(403).json({
    error: 'SANDBOX_READ_ONLY',
    message: `Mutations to public sandbox tenant '${tenantId}' are forbidden. Create your own tenant via Cloud Portal for full read-write access.`,
    tenantId,
    platformFeeBps: 0,
  });
  return false;
}
