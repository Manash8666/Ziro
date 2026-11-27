import { NextResponse } from 'next/server';
import { ZIRO_PLATFORM_FEE_BPS } from '@/lib/billing-plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'ziro-cloud-portal',
      platformFeeBps: ZIRO_PLATFORM_FEE_BPS,
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
