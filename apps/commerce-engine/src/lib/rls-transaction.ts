/**
 * PostgreSQL 17 Row-Level Security (RLS) Transaction Helper.
 * Executes database operations within a session setting app.current_tenant_id.
 */

export interface DbClientWithQuery {
  query(sql: string, params?: any[]): Promise<any>;
}

export async function executeInTenantRls<T>(
  client: DbClientWithQuery,
  tenantId: string,
  work: () => Promise<T>
): Promise<T> {
  if (!tenantId || tenantId.trim() === '') {
    throw new Error('Tenant ID is required for RLS transaction execution');
  }

  // Set the tenant configuration in the transaction context
  await client.query("SELECT set_config('app.current_tenant_id', $1, true);", [tenantId]);
  try {
    return await work();
  } finally {
    // Reset tenant config after work is complete
    await client.query("SELECT set_config('app.current_tenant_id', '', true);").catch(() => {});
  }
}
