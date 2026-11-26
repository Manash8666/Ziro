import React from 'react';
import { ZiroWordmark, ZiroButton, StatusBadge, MetricCard } from '@ziro/ui-kit';
import { SAAS_PLANS } from '../lib/subscription-billing';

export default function CloudPortalHome() {
  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 64 }}>
        <ZiroWordmark size="lg" />
        <StatusBadge variant="zero-fee" label="0% GMV Tax Infrastructure" />
      </header>

      <section style={{ textAlign: 'center', marginBottom: 64 }}>
        <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 16 }}>
          The Zero-Tax Commerce Operating System
        </h1>
        <p style={{ fontSize: 20, color: '#9CA3AF', maxWidth: 700, margin: '0 auto 32px auto' }}>
          One unified multi-tenant ledger for your online storefront, B2B wholesale portal, counter POS, and AI shopping agents—with flat-fee pricing and 0% GMV fees.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <ZiroButton variant="primary" size="lg">Deploy Store in 60s</ZiroButton>
          <ZiroButton variant="secondary" size="lg">Explore Docs</ZiroButton>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 64 }}>
        <MetricCard label="Platform GMV Tax" value="0%" delta="Guaranteed Zero" deltaTone="mint" />
        <MetricCard label="Offline POS Latency" value="0 ms" delta="Local-first Serwist" deltaTone="mint" />
        <MetricCard label="Agent Transactability" value="Native" delta="UCP, ACP & WebMCP" deltaTone="mint" />
        <MetricCard label="Catalog Complexity" value="BOM + 3D" delta="Fitment Matrices" deltaTone="amber" />
      </section>

      <section style={{ marginBottom: 64 }}>
        <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 32, textAlign: 'center' }}>Flat-Tier Transparent Pricing</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {Object.values(SAAS_PLANS).map((plan) => (
            <div
              key={plan.tier}
              style={{
                background: '#12161E',
                border: '1px solid #1F2633',
                borderRadius: 12,
                padding: 32,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{plan.name}</h3>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#00E599', marginBottom: 16 }}>
                  ${plan.monthly_price_usd}
                  <span style={{ fontSize: 16, color: '#9CA3AF', fontWeight: 400 }}> / month</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', color: '#D1D5DB', fontSize: 14 }}>
                  {plan.features.map((feat) => (
                    <li key={feat} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#00E599' }}>✓</span> {feat}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <ZiroButton variant={plan.tier === 'GROWTH' ? 'primary' : 'secondary'}>
                  Select {plan.tier}
                </ZiroButton>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
