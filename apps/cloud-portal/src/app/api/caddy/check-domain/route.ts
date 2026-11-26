import { NextResponse } from 'next/server';
import { globalTenantRegistry } from '../../../../lib/tenant-provisioner';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain');

  if (!domain) {
    return new NextResponse('Missing domain query parameter', { status: 400 });
  }

  const tenant = globalTenantRegistry.getTenantByDomain(domain);
  if (!tenant || tenant.status !== 'ACTIVE') {
    return new NextResponse('Domain not allowed or inactive', { status: 404 });
  }

  return NextResponse.json({
    allowed: true,
    domain,
    tenant_id: tenant.tenant_id,
  });
}
