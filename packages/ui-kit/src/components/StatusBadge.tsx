import type { CSSProperties } from 'react';
import { CheckCircle2, Clock, ShieldCheck } from 'lucide-react';

export type StatusBadgeVariant = 'live-sync' | 'offline-queue' | 'zero-fee';

export interface StatusBadgeProps {
  variant: StatusBadgeVariant;
  label?: string;
  queueCount?: number;
  ariaLabel?: string;
  className?: string;
}

interface VariantMeta {
  color: string;
  background: string;
  borderColor: string;
  defaultLabel: string;
  defaultAriaPrefix: string;
}

const VARIANT_META: Record<StatusBadgeVariant, VariantMeta> = {
  'live-sync': {
    color: '#00E599',
    background: 'rgba(0, 229, 153, 0.1)',
    borderColor: 'rgba(0, 229, 153, 0.35)',
    defaultLabel: 'Live Sync',
    defaultAriaPrefix: 'Synchronization status',
  },
  'offline-queue': {
    color: '#F59E0B',
    background: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    defaultLabel: 'Offline Queue',
    defaultAriaPrefix: 'Offline queue status',
  },
  'zero-fee': {
    color: '#00E599',
    background: 'rgba(0, 229, 153, 0.1)',
    borderColor: 'rgba(0, 229, 153, 0.35)',
    defaultLabel: '0% GMV Fee',
    defaultAriaPrefix: 'Platform fee policy',
  },
};

function renderVariantIcon(variant: StatusBadgeVariant, color: string) {
  switch (variant) {
    case 'live-sync':
      return <CheckCircle2 size={14} color={color} aria-hidden="true" />;
    case 'offline-queue':
      return <Clock size={14} color={color} aria-hidden="true" />;
    case 'zero-fee':
      return <ShieldCheck size={14} color={color} aria-hidden="true" />;
  }
}

/**
 * Operational status pill for POS sync state, offline mutation queues, and 0% GMV fee guarantee.
 */
export function StatusBadge({
  variant,
  label,
  queueCount,
  ariaLabel,
  className,
}: StatusBadgeProps) {
  const meta = VARIANT_META[variant];
  const resolvedLabel =
    label ??
    (variant === 'offline-queue' && queueCount !== undefined
      ? `${meta.defaultLabel} (${queueCount})`
      : meta.defaultLabel);

  const badgeStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.25rem 0.625rem',
    borderRadius: '9999px',
    border: `1px solid ${meta.borderColor}`,
    backgroundColor: meta.background,
    color: meta.color,
    fontFamily: 'var(--font-mono, "JetBrains Mono", ui-monospace, monospace)',
    fontSize: '0.75rem',
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: '0.02em',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  };

  const dotStyle: CSSProperties = {
    width: '6px',
    height: '6px',
    borderRadius: '9999px',
    backgroundColor: meta.color,
    flexShrink: 0,
  };

  return (
    <span
      role="status"
      aria-label={ariaLabel ?? `${meta.defaultAriaPrefix}: ${resolvedLabel}`}
      data-variant={variant}
      className={className}
      style={badgeStyle}
    >
      <span style={dotStyle} aria-hidden="true" />
      {renderVariantIcon(variant, meta.color)}
      <span>{resolvedLabel}</span>
    </span>
  );
}
