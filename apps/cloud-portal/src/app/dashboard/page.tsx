import type { Metadata } from 'next';
import { loadTenantDashboardSnapshot } from '@/lib/tenant-dashboard-loader';
import { TenantDashboardClient } from './TenantDashboardClient';

export const metadata: Metadata = {
  title: 'Tenant Command Dashboard | Ziro Cloud',
  description:
    'Monitor RLS-isolated catalog health, BAAI/bge-m3 pgvector coverage, UCP/ACP AI agent telemetry, and 0% GMV tax savings.',
};

export const dynamic = 'force-dynamic';

interface DashboardPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolved = await searchParams;
  const rawTenant = Array.isArray(resolved.tenantId)
    ? resolved.tenantId[0]
    : resolved.tenantId;

  const snapshot = await loadTenantDashboardSnapshot(rawTenant);

  return (
    <main className="min-h-screen bg-[#090B0E] px-4 py-10 sm:px-8">
      <TenantDashboardClient snapshot={snapshot} />
    </main>
  );
}
