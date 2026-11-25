import type { CSSProperties } from 'react';
import { SignedMoneyMinorSchema } from '@ziro/shared-types';

export type MonoCellKind = 'sku' | 'hsn' | 'gstin' | 'currency' | 'text';
export type MonoCellHighlight = 'default' | 'mint' | 'amber';

export interface MonoCellProps {
  value?: string;
  amountMinor?: number;
  currency?: string;
  locale?: string;
  kind?: MonoCellKind;
  as?: 'span' | 'td' | 'div' | 'code';
  align?: 'left' | 'right';
  highlight?: MonoCellHighlight;
  className?: string;
  title?: string;
}

const HIGHLIGHT_COLORS: Record<MonoCellHighlight, string> = {
  default: 'var(--color-ziro-alabaster, #F4F6F9)',
  mint: 'var(--color-ziro-mint, #00E599)',
  amber: 'var(--color-ziro-amber, #F59E0B)',
};

/**
 * Formats an integer minor-unit currency amount (paise / cents) deterministically.
 * Rejects floating-point or unsafe integers via `SignedMoneyMinorSchema`.
 */
export function formatMinorCurrency(
  amountMinor: number,
  currency = 'INR',
  locale?: string,
): string {
  const safeMinor = SignedMoneyMinorSchema.parse(amountMinor);
  const normalizedMinor = safeMinor === 0 ? 0 : safeMinor;
  const normalizedCurrency = currency.trim().toUpperCase();
  const resolvedLocale = locale ?? (normalizedCurrency === 'INR' ? 'en-IN' : 'en-US');

  const formatter = new Intl.NumberFormat(resolvedLocale, {
    style: 'currency',
    currency: normalizedCurrency,
  });
  const fractionDigits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  const divisor = 10 ** fractionDigits;

  return new Intl.NumberFormat(resolvedLocale, {
    style: 'currency',
    currency: normalizedCurrency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(normalizedMinor / divisor);
}

/**
 * Monospace tabular-nums display cell for SKUs, HSN codes, GSTINs, and minor-unit currency.
 */
export function MonoCell({
  value,
  amountMinor,
  currency = 'INR',
  locale,
  kind = amountMinor !== undefined ? 'currency' : 'text',
  as = 'span',
  align,
  highlight = 'default',
  className,
  title,
}: MonoCellProps) {
  const displayText =
    amountMinor !== undefined
      ? formatMinorCurrency(amountMinor, currency, locale)
      : (value ?? '—');

  const resolvedAlign = align ?? (kind === 'currency' || amountMinor !== undefined ? 'right' : 'left');
  const style: CSSProperties = {
    fontFamily: 'var(--font-mono, "JetBrains Mono", ui-monospace, monospace)',
    fontVariantNumeric: 'tabular-nums',
    color: HIGHLIGHT_COLORS[highlight],
    textAlign: resolvedAlign,
    letterSpacing: kind === 'sku' || kind === 'gstin' || kind === 'hsn' ? '0.03em' : '0',
    whiteSpace: 'nowrap',
  };

  const Tag = as;
  return (
    <Tag
      className={className}
      style={style}
      data-kind={kind}
      title={title ?? displayText}
    >
      {displayText}
    </Tag>
  );
}
