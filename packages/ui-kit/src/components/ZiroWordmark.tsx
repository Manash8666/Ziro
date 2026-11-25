import type { CSSProperties } from 'react';

export type ZiroWordmarkSize = 'sm' | 'md' | 'lg';

export interface ZiroWordmarkProps {
  size?: ZiroWordmarkSize;
  showTagline?: boolean;
  accentColor?: string;
  textColor?: string;
  className?: string;
  ariaLabel?: string;
}

const SIZE_DIMENSIONS: Record<ZiroWordmarkSize, { width: number; height: number; fontSize: string }> = {
  sm: { width: 92, height: 28, fontSize: '0.625rem' },
  md: { width: 120, height: 36, fontSize: '0.6875rem' },
  lg: { width: 156, height: 46, fontSize: '0.75rem' },
};

/**
 * Pure RSC-safe geometric precision wordmark for Ziro Commerce OS.
 * Renders "ziro" with a broken-ring slashed zero ("0") representing 0% GMV tax
 * and continuous offline-to-cloud synchronization.
 */
export function ZiroWordmark({
  size = 'md',
  showTagline = false,
  accentColor = '#00E599',
  textColor = '#F4F6F9',
  className,
  ariaLabel = 'ziro commerce os',
}: ZiroWordmarkProps) {
  const dims = SIZE_DIMENSIONS[size];
  const wrapperStyle: CSSProperties = {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '0.25rem',
  };

  return (
    <span className={className} style={wrapperStyle} data-wordmark="ziro">
      <svg
        width={dims.width}
        height={dims.height}
        viewBox="0 0 132 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={ariaLabel}
      >
        <title>{ariaLabel}</title>

        {/* z */}
        <path
          d="M6 12H26L8 30H27"
          stroke={textColor}
          strokeWidth="3.2"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />

        {/* i stem + mint precision dot */}
        <path
          d="M40 16V30"
          stroke={textColor}
          strokeWidth="3.2"
          strokeLinecap="square"
        />
        <rect x="38.2" y="8" width="3.6" height="3.6" rx="0.5" fill={accentColor} />

        {/* r */}
        <path
          d="M54 30V16M54 20.5C54 16.5 57.5 14 62.5 14H65"
          stroke={textColor}
          strokeWidth="3.2"
          strokeLinecap="square"
          strokeLinejoin="round"
        />

        {/* o: broken sync ring + slashed zero (0% tax) */}
        <path
          d="M90 10.5C82.5 10.5 76.5 15.8 76.5 22.5C76.5 25.1 77.4 27.5 79 29.5"
          stroke={accentColor}
          strokeWidth="3.2"
          strokeLinecap="square"
        />
        <path
          d="M90 34.5C97.5 34.5 103.5 29.2 103.5 22.5C103.5 19.9 102.6 17.5 101 15.5"
          stroke={accentColor}
          strokeWidth="3.2"
          strokeLinecap="square"
        />
        {/* Sync directional ticks */}
        <path
          d="M87.5 7.5L91.5 10.5L87.5 13.5"
          stroke={accentColor}
          strokeWidth="2.2"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        <path
          d="M92.5 31.5L88.5 34.5L92.5 37.5"
          stroke={accentColor}
          strokeWidth="2.2"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        {/* Slashed zero core */}
        <line
          x1="81.5"
          y1="30.5"
          x2="98.5"
          y2="14.5"
          stroke={textColor}
          strokeWidth="2.8"
          strokeLinecap="square"
        />
      </svg>

      {showTagline ? (
        <span
          style={{
            fontFamily: 'var(--font-mono, "JetBrains Mono", ui-monospace, monospace)',
            fontSize: dims.fontSize,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: accentColor,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          COMMERCE OS · 0% GMV
        </span>
      ) : null}
    </span>
  );
}
