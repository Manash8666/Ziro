import type { Metadata } from 'next';
import { StoreLaunchWizard, type SelfServePlanTier } from './StoreLaunchWizard';

export const metadata: Metadata = {
  title: 'Launch Your Zero-Tax Store | Ziro Cloud Onboarding',
  description:
    'Provision a multi-tenant Ziro Commerce OS store with a 14-day free trial, custom subdomain, UCP/ACP AI agent discovery, and permanent 0% GMV tax.',
};

export const dynamic = 'force-dynamic';

function resolveInitialPlan(rawPlan: string | string[] | undefined): SelfServePlanTier {
  const candidate = Array.isArray(rawPlan) ? rawPlan[0] : rawPlan;
  const normalized = candidate?.trim().toLowerCase();
  if (normalized === 'starter' || normalized === 'growth' || normalized === 'scale') {
    return normalized;
  }
  return 'growth';
}

interface OnboardingPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const resolvedParams = await searchParams;
  const initialPlanTier = resolveInitialPlan(resolvedParams.plan);
  const rootDomain = (
    process.env.ZIRO_ROOT_DOMAIN ??
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ??
    'ziro.build'
  )
    .trim()
    .toLowerCase()
    .replace(/\.$/, '');

  return (
    <main className="min-h-screen bg-[#090B0E] px-4 py-10 sm:px-8">
      <StoreLaunchWizard initialPlanTier={initialPlanTier} rootDomain={rootDomain} />
    </main>
  );
}
