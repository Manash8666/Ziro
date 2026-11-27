import React from 'react';
import type { Metadata } from 'next';
import { OmniConsoleClient } from '../console/OmniConsoleClient';

export const metadata: Metadata = {
  title: 'Ziro Storefront — Unified Storefront Console',
  description: 'Live D2C and B2B Storefront with 3D Configurator and Semantic Fitment search.',
};

export default function StoreRedirectPage() {
  return (
    <OmniConsoleClient
      initialTab="storefront"
      defaultStorefrontUrl={process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://ziro-storefront.vercel.app'}
      defaultAdminUrl="/admin"
      defaultPosUrl={process.env.NEXT_PUBLIC_POS_URL || 'https://ziro-pos.vercel.app'}
    />
  );
}
