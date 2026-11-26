import { NextResponse } from 'next/server';
import { TenantProvisionRequestSchema } from '@ziro/shared-types';
import { globalTenantProvisioner } from '../../../../../lib/tenant-provisioner';

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = TenantProvisionRequestSchema.parse(json);
    const result = await globalTenantProvisioner.provisionTenant(parsed);
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Failed to provision tenant' },
      { status: 400 },
    );
  }
}
