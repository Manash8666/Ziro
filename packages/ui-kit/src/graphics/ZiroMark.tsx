import React from 'react';

export interface ZiroMarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  tone?: 'mint' | 'amber' | 'alabaster';
  className?: string;
}

const SIZE_MAP: Record<'sm' | 'md' | 'lg' | 'xl', number> = {
  sm: 24,
  md: 36,
  lg: 48,
  xl: 64,
};

const TONE_MAP: Record<'mint' | 'amber' | 'alabaster', { stroke: string; accent: string }> = {
  mint: { stroke: '#00E599', accent: '#00B377' },
  amber: { stroke: '#F59E0B', accent: '#D97706' },
  alabaster: { stroke: '#F4F6F9', accent: '#8B95A5' },
};

export const ZiroMark: React.FC<ZiroMarkProps> = ({
  size = 'md',
  tone = 'mint',
  className = '',
}) => {
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size];
  const { stroke, accent } = TONE_MAP[tone];

  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Ziro Slashed-Zero Brandmark"
      role="img"
    >
      {/* Outer broken precision ring (Continuous online/offline loop) */}
      <path
        d="M 32 8 A 24 24 0 1 1 16 50"
        stroke={stroke}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Counter-arc closing loop gap */}
      <path
        d="M 12 40 A 24 24 0 0 1 24 10"
        stroke={accent}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 6"
      />
      {/* 45-degree precision slash representing 0% transaction tax */}
      <line
        x1="18"
        y1="46"
        x2="46"
        y2="18"
        stroke={stroke}
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Center zero core point */}
      <circle cx="32" cy="32" r="3" fill={stroke} />
    </svg>
  );
};
