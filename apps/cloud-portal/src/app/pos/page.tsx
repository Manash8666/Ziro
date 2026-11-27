import React from 'react';
import type { Metadata } from 'next';
import { OmniConsoleClient } from '../console/OmniConsoleClient';

export const metadata: Metadata = {
  title: 'Ziro POS — Unified Counter Terminal Console',
  description: 'Offline-first Serwist PWA counter terminal with barcode scanner and ESC/POS thermal printing.',
};

export default function PosRedirectPage() {
  return (
    <OmniConsoleClient
      initialTab="pos"
      defaultStorefrontUrl={process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://ziro-storefront.vercel.app'}
      defaultAdminUrl="/admin"
      defaultPosUrl={process.env.NEXT_PUBLIC_POS_URL || 'https://ziro-pos.vercel.app'}
    />
  );
}
