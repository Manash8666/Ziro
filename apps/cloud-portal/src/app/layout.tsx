import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Ziro Cloud — Zero-GMV-Tax Multi-Tenant SaaS Portal',
  description: 'Launch your 0% GMV fee commerce operating system with automated SSL, offline POS, and AI shopping agents.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#090B0E', color: '#F4F6F9', fontFamily: 'sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
