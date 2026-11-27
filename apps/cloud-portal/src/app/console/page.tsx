import React from 'react';
import type { Metadata } from 'next';
import { OmniConsoleClient } from './OmniConsoleClient';

export const metadata: Metadata = {
  title: 'Ziro Unified Omni-Channel Console — Storefront, Admin & POS',
  description:
    'Experience the entire Ziro Commerce OS from one single unified interface: Customer Storefront, Merchant Admin, and Offline Counter POS.',
};

export default function ConsolePage() {
  return (
    <OmniConsoleClient
      defaultStorefrontUrl={process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://ziro-storefront.vercel.app'}
      defaultAdminUrl="/admin"
      defaultPosUrl={process.env.NEXT_PUBLIC_POS_URL || 'https://ziro-pos.vercel.app'}
    />
  );
}
