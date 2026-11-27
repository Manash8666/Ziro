import React from 'react';
import { ZiroWordmark } from './ZiroWordmark.js';
import { StatusBadge } from './StatusBadge.js';

export interface ZiroNavigationHeaderProps {
  activePath?: string;
  showTaxBadge?: boolean;
  showPulseTelemetry?: boolean;
  taxRegime?: 'GST' | 'DDP' | 'GLOBAL';
  portalUrl?: string;
  posUrl?: string;
  className?: string;
  renderLink?: (props: { href: string; children: React.ReactNode; className?: string }) => React.ReactNode;
}

export function ZiroNavigationHeader({
  activePath = '/',
  showTaxBadge = true,
  showPulseTelemetry = true,
  taxRegime = 'GST',
  portalUrl = 'http://localhost:3002/admin',
  posUrl = 'http://localhost:3001',
  className = '',
  renderLink,
}: ZiroNavigationHeaderProps) {
  const linkRenderer = renderLink || (({ href, children, className: cls }) => (
    <a href={href} className={cls}>
      {children}
    </a>
  ));

  const navItems = [
    { label: 'Storefront', href: '/' },
    { label: 'Catalog', href: '/catalog' },
    { label: '3D Configurator', href: '/configure' },
    { label: 'Merchant Admin', href: portalUrl, external: true },
    { label: 'Counter POS', href: posUrl, external: true },
  ];

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b border-[#1F2633] bg-[#090B0E]/90 backdrop-blur-md transition-colors ${className}`}
      data-testid="ziro-navigation-header"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
        {/* Brand & 0% GMV Badge */}
        <div className="flex items-center gap-4">
          {linkRenderer({
            href: '/',
            className: 'flex items-center transition-opacity hover:opacity-90',
            children: <ZiroWordmark size="md" />,
          })}
          {showTaxBadge && (
            <div className="hidden sm:inline-flex">
              <StatusBadge variant="zero-fee" label="0% GMV Tax" />
            </div>
          )}
        </div>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium">
          {navItems.map((item) => {
            const isActive = activePath === item.href;
            return (
              <span key={item.label}>
                {linkRenderer({
                  href: item.href,
                  className: `transition-colors hover:text-[#F4F6F9] ${
                    isActive ? 'text-[#00E599] font-semibold' : 'text-[#8B95A5]'
                  }`,
                  children: item.label,
                })}
              </span>
            );
          })}
        </nav>

        {/* Right Status Indicators & CTA */}
        <div className="flex items-center gap-3">
          {/* Dual Tax / Logistics Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-[#1F2633] bg-[#12161E] px-2.5 py-1 text-[11px] font-mono text-[#8B95A5]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00E599]" />
            <span>{taxRegime === 'GST' ? 'GST 38+1 India' : 'Dual DDP / VAT'}</span>
          </div>

          {/* Pulse AI Agentic Indicator */}
          {showPulseTelemetry && (
            <div className="flex items-center gap-1.5 rounded-full border border-[#1F2633] bg-[#12161E] px-2.5 py-1 text-[11px] font-mono text-[#F4F6F9]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00E599] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00E599]" />
              </span>
              <span className="text-[#00E599]">UCP / ACP</span>
              <span className="text-[#8B95A5]">Ready</span>
            </div>
          )}

          {/* Action Link */}
          {linkRenderer({
            href: portalUrl,
            className: 'hidden sm:inline-flex items-center justify-center rounded-lg bg-[#00E599] px-3.5 py-1.5 text-xs font-semibold text-[#090B0E] transition-all hover:bg-[#00E599]/90 hover:shadow-[0_0_16px_rgba(0,229,153,0.35)]',
            children: 'Launch Store',
          })}
        </div>
      </div>
    </header>
  );
}
