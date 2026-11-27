import type { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';
import { ThemeToggle } from '@ziro/ui-kit';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ziro Cloud — Zero-GMV-Tax Multi-Tenant SaaS Portal',
  description:
    'Launch your 0% GMV fee commerce operating system with automated SSL, offline POS, and AI shopping agents.',
};

const CLOUD_NAV_LINKS = [
  { href: '/console', label: '⚡ 3-in-1 Console', highlight: true },
  { href: '/admin', label: 'Merchant Admin' },
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('ziro-theme')||'dark';document.documentElement.setAttribute('data-theme',t);if(t==='light'){document.documentElement.classList.add('light-theme');document.documentElement.classList.remove('dark-theme');}else{document.documentElement.classList.add('dark-theme');document.documentElement.classList.remove('light-theme');}if(window.self!==window.top){document.documentElement.classList.add('is-embedded');}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[var(--ziro-bg-canvas,#14090D)] text-[var(--ziro-text-primary,#F6DCE2)] antialiased transition-colors duration-200">
        <nav className="border-b border-[var(--ziro-border-hairline,#3D1C26)] bg-[var(--ziro-bg-card,#221016)]/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-8">
            <Link
              href="/"
              className="flex items-center gap-2 font-mono text-sm font-bold tracking-tight text-[var(--ziro-text-primary,#F6DCE2)]"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-[var(--ziro-badge-bg,rgba(122,36,59,0.35))] text-xs text-[var(--ziro-cta-bg,#E8A5B5)] font-bold">
                0%
              </span>
              <span>ziro.cloud</span>
            </Link>
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
              {CLOUD_NAV_LINKS.map((item) => {
                const isHighlight = 'highlight' in item && item.highlight;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`transition ${
                      isHighlight
                        ? 'rounded-full border border-[var(--ziro-badge-border,#7A243B)] bg-[var(--ziro-badge-bg,rgba(122,36,59,0.35))] px-2.5 py-0.5 font-bold text-[var(--ziro-cta-bg,#E8A5B5)] hover:opacity-90 shadow-sm'
                        : 'text-[var(--ziro-text-secondary,#C9A3AC)] hover:text-[var(--ziro-cta-bg,#E8A5B5)]'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <ThemeToggle size="sm" />
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
