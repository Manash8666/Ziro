export const SANDBOX_TENANT_PREFIX = 'sandbox-';
export const OFFICIAL_SANDBOX_TENANTS = [
  'sandbox-auto-parts',
  'sandbox-industrial-hydraulics',
  'sandbox-d2c-apparel',
];

export function isSandboxTenant(tenantId: string | null | undefined): boolean {
  if (!tenantId) return false;
  const tid = tenantId.trim().toLowerCase();
  return OFFICIAL_SANDBOX_TENANTS.includes(tid) || tid.startsWith(SANDBOX_TENANT_PREFIX);
}

export function assertSandboxTenantProtection(tenantId: string, action: string): void {
  if (isSandboxTenant(tenantId)) {
    throw new Error(
      `Action '${action}' is prohibited for public demo tenant '${tenantId}'. Sandbox data is protected and immutable.`
    );
  }
}
