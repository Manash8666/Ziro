import React from 'react';
import Link from 'next/link';
import {
  ZiroWordmark,
  ZiroButton,
  StatusBadge,
  MetricCard,
  SavingsCalculator,
} from '@ziro/ui-kit';
import { SAAS_PLANS } from '../lib/subscription-billing';
import { ProtocolPlayground } from '../components/ProtocolPlayground';

export default function CloudPortalHome() {
  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 64 }}>
        <ZiroWordmark size="lg" />
        <StatusBadge variant="zero-fee" label="0% GMV Tax Infrastructure" />
      </header>

      {/* Hero with subtle radial gradient glow (Wine & Blush / Steamed Cream) */}
      <section
        style={{
          textAlign: 'center',
          marginBottom: 64,
          padding: '48px 24px',
          borderRadius: 24,
          backgroundImage: 'var(--ziro-hero-glow)',
          border: '1px solid var(--ziro-border-hairline, #3D1C26)',
        }}
      >
        <h1
          style={{
            fontSize: 48,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: 16,
            color: 'var(--ziro-text-primary, #F6DCE2)',
          }}
        >
          The Zero-Tax Commerce Operating System
        </h1>
        <p
          style={{
            fontSize: 20,
            color: 'var(--ziro-text-secondary, #C9A3AC)',
            maxWidth: 740,
            margin: '0 auto 32px auto',
            lineHeight: 1.6,
          }}
        >
          One unified multi-tenant ledger for your online storefront, B2B wholesale portal, counter POS, and AI shopping agents—with flat-fee pricing and 0% GMV fees.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/console">
            <ZiroButton variant="primary" size="lg">⚡ Open 3-in-1 Omni Console</ZiroButton>
          </Link>
          <Link href="/admin">
            <ZiroButton variant="secondary" size="lg">Merchant Admin</ZiroButton>
          </Link>
          <Link href="/onboarding">
            <ZiroButton variant="ghost" size="lg">Deploy Store in 60s</ZiroButton>
          </Link>
        </div>
      </section>

      {/* Metric Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 64 }}>
        <MetricCard label="Platform GMV Tax" value="0%" delta="Guaranteed Zero" deltaTone="mint" />
        <MetricCard label="Offline POS Latency" value="0 ms" delta="Local-first Serwist" deltaTone="mint" />
        <MetricCard label="Agent Transactability" value="Native" delta="UCP, ACP & WebMCP" deltaTone="mint" />
        <MetricCard label="Catalog Complexity" value="BOM + 3D" delta="Fitment Matrices" deltaTone="amber" />
      </section>

      {/* Interactive Savings Calculator */}
      <section style={{ marginBottom: 64 }}>
        <SavingsCalculator initialGmvDollars={1000000} />
      </section>

      {/* Protocol Playground */}
      <section style={{ marginBottom: 64 }}>
        <ProtocolPlayground />
      </section>

      {/* Flat-Tier Transparent Pricing */}
      <section style={{ marginBottom: 64 }}>
        <h2
          style={{
            fontSize: 32,
            fontWeight: 700,
            marginBottom: 32,
            textAlign: 'center',
            color: 'var(--ziro-text-primary, #F6DCE2)',
          }}
        >
          Flat-Tier Transparent Pricing
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {Object.values(SAAS_PLANS).map((plan) => (
            <div
              key={plan.tier}
              style={{
                background: 'var(--ziro-bg-card, #221016)',
                border:
                  plan.tier === 'GROWTH'
                    ? '1px solid var(--ziro-cta-bg, #E8A5B5)'
                    : '1px solid var(--ziro-border-hairline, #3D1C26)',
                borderRadius: 12,
                padding: 32,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h3 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ziro-text-primary, #F6DCE2)' }}>{plan.name}</h3>
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: 'monospace',
                      color: 'var(--ziro-cta-bg, #E8A5B5)',
                      background: 'var(--ziro-badge-bg, rgba(122,36,59,0.35))',
                      padding: '2px 8px',
                      borderRadius: 4,
                      border: '1px solid var(--ziro-badge-border, #7A243B)',
                    }}
                  >
                    0% GMV
                  </span>
                </div>
                <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--ziro-cta-bg, #E8A5B5)', marginBottom: 16 }}>
                  ${plan.monthly_price_usd}
                  <span style={{ fontSize: 16, color: 'var(--ziro-text-secondary, #C9A3AC)', fontWeight: 400 }}> / month</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', color: 'var(--ziro-text-secondary, #C9A3AC)', fontSize: 14 }}>
                  {plan.features.map((feat) => (
                    <li key={feat} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: 'var(--ziro-cta-bg, #E8A5B5)' }}>✓</span> {feat}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <Link href={`/onboarding?plan=${plan.tier === 'ENTERPRISE' ? 'scale' : plan.tier.toLowerCase()}`}>
                  <ZiroButton variant={plan.tier === 'GROWTH' ? 'primary' : 'secondary'} className="w-full">
                    Select {plan.tier}
                  </ZiroButton>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
