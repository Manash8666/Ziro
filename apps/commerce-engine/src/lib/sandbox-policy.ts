export const OFFICIAL_SANDBOX_TENANTS = new Set([
  'sandbox-auto-parts',
  'sandbox-industrial-hydraulics',
  'sandbox-d2c-apparel',
]);

export function isSandboxTenant(tenantId?: string | null): boolean {
  if (!tenantId) return false;
  const tid = tenantId.trim().toLowerCase();
  return OFFICIAL_SANDBOX_TENANTS.has(tid) || tid.startsWith('sandbox-');
}

export class SandboxReadOnlyError extends Error {
  public readonly statusCode = 403;
  public readonly code = 'SANDBOX_READ_ONLY';

  constructor(tenantId: string) {
    super(
      `SANDBOX_READ_ONLY: Mutations to public sandbox tenant '${tenantId}' are forbidden. Create your own tenant via Cloud Portal for full read-write access.`
    );
    this.name = 'SandboxReadOnlyError';
  }
}

export function assertSandboxMutationAllowed(
  tenantId: string | undefined,
  method: string = 'GET',
  isMaintenanceBypass: boolean = false
): void {
  if (!tenantId || isMaintenanceBypass) return;
  const upperMethod = method.toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod) && isSandboxTenant(tenantId)) {
    throw new SandboxReadOnlyError(tenantId);
  }
}
