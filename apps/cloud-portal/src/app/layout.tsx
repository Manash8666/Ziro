import type { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ziro Cloud — Zero-GMV-Tax Multi-Tenant SaaS Portal',
  description:
    'Launch your 0% GMV fee commerce operating system with automated SSL, offline POS, and AI shopping agents.',
};

const CLOUD_NAV_LINKS = [
  { href: '/', label: 'Overview' },
  { href: '/onboarding', label: 'Launch Store' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/billing', label: 'Billing' },
  { href: '/migrate', label: 'Migrate' },
  { href: '/docs', label: 'Workbench Docs' },
] as const;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#090B0E] text-[#F4F6F9] antialiased">
        <nav className="border-b border-[#1F2633] bg-[#090B0E]/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-8">
            <Link
              href="/"
              className="flex items-center gap-2 font-mono text-sm font-bold tracking-tight text-[#F4F6F9]"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#00E599]/15 text-xs text-[#00E599]">
                0%
              </span>
              <span>ziro.cloud</span>
            </Link>
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
              {CLOUD_NAV_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-slate-400 transition hover:text-[#00E599]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
