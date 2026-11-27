import type { CSSProperties } from 'react';
import { StatusBadge, type StatusBadgeProps } from './StatusBadge.js';

export type MetricDeltaTone = 'mint' | 'amber' | 'neutral';

export interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaTone?: MetricDeltaTone;
  statusBadge?: StatusBadgeProps;
  hint?: string;
  monospaceValue?: boolean;
  className?: string;
}

const DELTA_STYLES: Record<MetricDeltaTone, { color: string; bg: string; border: string }> = {
  mint: {
    color: '#00E599',
    bg: 'rgba(0, 229, 153, 0.1)',
    border: 'rgba(0, 229, 153, 0.35)',
  },
  amber: {
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.4)',
  },
  neutral: {
    color: '#94A3B8',
    bg: 'rgba(148, 163, 184, 0.1)',
    border: 'rgba(148, 163, 184, 0.3)',
  },
};

/**
 * Dark Precision Slate Graphite metric card with 1px architectural border and tabular-nums value.
 */
export function MetricCard({
  label,
  value,
  delta,
  deltaTone = 'neutral',
  statusBadge,
  hint,
  monospaceValue = true,
  className,
}: MetricCardProps) {
  const deltaStyle = DELTA_STYLES[deltaTone];

  const cardStyle: CSSProperties = {
    backgroundColor: 'var(--ziro-bg-card, var(--color-ziro-slate, #12161E))',
    border: '1px solid var(--ziro-border-hairline, var(--color-ziro-border, #1F2633))',
    borderRadius: '8px',
    padding: '1rem 1.25rem',
    color: 'var(--ziro-text-primary, var(--color-ziro-alabaster, #F4F6F9))',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.625rem',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
  };

  const labelStyle: CSSProperties = {
    fontFamily: 'var(--font-sans, "Plus Jakarta Sans", "Inter", system-ui, sans-serif)',
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--ziro-text-secondary, var(--color-ziro-muted, #94A3B8))',
  };

  const valueRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: '0.75rem',
    flexWrap: 'wrap',
  };

  const valueStyle: CSSProperties = {
    fontFamily: monospaceValue
      ? 'var(--font-mono, "JetBrains Mono", ui-monospace, monospace)'
      : 'var(--font-sans, "Plus Jakarta Sans", "Inter", system-ui, sans-serif)',
    fontSize: '1.625rem',
    fontWeight: 700,
    lineHeight: 1.15,
    fontVariantNumeric: 'tabular-nums',
    color: 'var(--ziro-text-primary, var(--color-ziro-alabaster, #F4F6F9))',
  };

  const pillStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.1875rem 0.5rem',
    borderRadius: '4px',
    border: `1px solid ${deltaStyle.border}`,
    backgroundColor: deltaStyle.bg,
    color: deltaStyle.color,
    fontFamily: 'var(--font-mono, "JetBrains Mono", ui-monospace, monospace)',
    fontSize: '0.75rem',
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  };

  return (
    <section className={className} style={cardStyle} aria-label={label}>
      <div style={headerStyle}>
        <span style={labelStyle}>{label}</span>
        {statusBadge ? <StatusBadge {...statusBadge} /> : null}
      </div>

      <div style={valueRowStyle}>
        <span style={valueStyle}>{value}</span>
        {delta ? <span style={pillStyle}>{delta}</span> : null}
      </div>

      {hint ? (
        <span
          style={{
            fontFamily: 'var(--font-sans, "Plus Jakarta Sans", "Inter", system-ui, sans-serif)',
            fontSize: '0.75rem',
            color: 'var(--color-ziro-muted, #94A3B8)',
          }}
        >
          {hint}
        </span>
      ) : null}
    </section>
  );
}
