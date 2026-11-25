import type { ButtonHTMLAttributes, CSSProperties } from 'react';

export type ZiroButtonVariant = 'primary' | 'secondary' | 'amber' | 'ghost';
export type ZiroButtonSize = 'sm' | 'md' | 'lg';

export interface ZiroButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ZiroButtonVariant;
  size?: ZiroButtonSize;
  loading?: boolean;
}

const VARIANT_STYLES: Record<ZiroButtonVariant, CSSProperties> = {
  primary: {
    backgroundColor: 'var(--color-ziro-mint, #00E599)',
    color: 'var(--color-ziro-obsidian, #090B0E)',
    border: '1px solid var(--color-ziro-mint, #00E599)',
  },
  secondary: {
    backgroundColor: 'var(--color-ziro-slate, #12161E)',
    color: 'var(--color-ziro-alabaster, #F4F6F9)',
    border: '1px solid var(--color-ziro-border, #1F2633)',
  },
  amber: {
    backgroundColor: 'var(--color-ziro-amber, #F59E0B)',
    color: 'var(--color-ziro-obsidian, #090B0E)',
    border: '1px solid var(--color-ziro-amber, #F59E0B)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: 'var(--color-ziro-alabaster, #F4F6F9)',
    border: '1px solid var(--color-ziro-border, #1F2633)',
  },
};

const SIZE_STYLES: Record<ZiroButtonSize, CSSProperties> = {
  sm: { padding: '0.375rem 0.75rem', fontSize: '0.75rem' },
  md: { padding: '0.5rem 1rem', fontSize: '0.875rem' },
  lg: { padding: '0.75rem 1.375rem', fontSize: '0.9375rem' },
};

/**
 * Dark Precision action button with Electric Mint primary CTA, Slate secondary, and Amber operational alert variants.
 */
export function ZiroButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  className,
  style,
  children,
  ...rest
}: ZiroButtonProps) {
  const isDisabled = disabled || loading;
  const focusClass = variant === 'amber' ? 'ziro-focus-ring-amber' : 'ziro-focus-ring';
  const mergedClassName = className ? `${focusClass} ${className}` : focusClass;

  const buttonStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    borderRadius: '6px',
    fontFamily: 'var(--font-sans, "Plus Jakarta Sans", "Inter", system-ui, sans-serif)',
    fontWeight: 600,
    lineHeight: 1.25,
    letterSpacing: '0.01em',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.6 : 1,
    transition: 'opacity 120ms ease, transform 120ms ease',
    ...VARIANT_STYLES[variant],
    ...SIZE_STYLES[size],
    ...style,
  };

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      data-variant={variant}
      className={mergedClassName}
      style={buttonStyle}
      {...rest}
    >
      {children}
    </button>
  );
}
