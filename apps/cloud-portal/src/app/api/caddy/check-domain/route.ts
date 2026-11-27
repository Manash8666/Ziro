import { NextResponse } from 'next/server';
import { globalTenantRegistry } from '../../../../lib/tenant-provisioner';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain');
  const secret = searchParams.get('secret');

  // If internal secret is configured, require it to prevent certificate exhaustion
  const expectedSecret = process.env.CADDY_INTERNAL_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return new NextResponse('Unauthorized: invalid Caddy internal secret', { status: 401 });
  }

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
