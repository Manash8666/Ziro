import React from 'react';

export interface TaxComparisonGraphicProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

export const TaxComparisonGraphic: React.FC<TaxComparisonGraphicProps> = ({
  className = '',
  width = '100%',
  height = 'auto',
}) => {
  return (
    <svg
      viewBox="0 0 800 360"
      width={width}
      height={height}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Ziro 0% GMV Fee vs Legacy Platforms"
    >
      <rect width="800" height="360" rx="12" fill="#090B0E" stroke="#1F2633" strokeWidth="2" />

      {/* Header */}
      <text x="40" y="45" fill="#F4F6F9" fontSize="16" fontWeight="600" fontFamily="Plus Jakarta Sans, sans-serif">
        Transaction Tax on $1,000,000 Annual Online GMV
      </text>
      <text x="40" y="70" fill="#8B95A5" fontSize="12" fontFamily="Plus Jakarta Sans, sans-serif">
        See how transaction commissions erode gross profit margins on legacy monoliths.
      </text>

      {/* Row 1: Legacy SaaS */}
      <g transform="translate(40, 110)">
        <text x="0" y="16" fill="#F4F6F9" fontSize="13" fontWeight="500" fontFamily="Plus Jakarta Sans, sans-serif">
          Legacy SaaS (2.9% + 30¢)
        </text>
        {/* Background bar */}
        <rect x="250" y="0" width="480" height="32" rx="4" fill="#12161E" />
        {/* Filled fee bar */}
        <rect x="250" y="0" width="380" height="32" rx="4" fill="#EF4444" fillOpacity="0.85" />
        <text x="640" y="21" fill="#F4F6F9" fontSize="12" fontWeight="600" fontFamily="JetBrains Mono, monospace">
          $32,000 / yr
        </text>
      </g>

      {/* Row 2: Marketplace Monopolies */}
      <g transform="translate(40, 170)">
        <text x="0" y="16" fill="#F4F6F9" fontSize="13" fontWeight="500" fontFamily="Plus Jakarta Sans, sans-serif">
          Marketplace Platform (15% Cut)
        </text>
        <rect x="250" y="0" width="480" height="32" rx="4" fill="#12161E" />
        <rect x="250" y="0" width="480" height="32" rx="4" fill="#F59E0B" fillOpacity="0.85" />
        <text x="640" y="21" fill="#F4F6F9" fontSize="12" fontWeight="600" fontFamily="JetBrains Mono, monospace">
          $150,000 / yr
        </text>
      </g>

      {/* Row 3: Ziro */}
      <g transform="translate(40, 230)">
        <text x="0" y="16" fill="#00E599" fontSize="14" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif">
          Ziro (0% GMV Fee)
        </text>
        <rect x="250" y="0" width="480" height="36" rx="4" fill="#12161E" stroke="#00E599" strokeWidth="1.5" />
        {/* Zero Tax Bar */}
        <rect x="250" y="0" width="8" height="36" rx="4" fill="#00E599" />
        <text x="275" y="23" fill="#00E599" fontSize="14" fontWeight="700" fontFamily="JetBrains Mono, monospace">
          $0 Tax (Flat Hosting Only)
        </text>
        <text x="640" y="23" fill="#00E599" fontSize="12" fontWeight="700" fontFamily="JetBrains Mono, monospace">
          $0 / yr
        </text>
      </g>

      {/* Footer Callout */}
      <line x1="40" y1="300" x2="760" y2="300" stroke="#1F2633" strokeWidth="1" />
      <text x="40" y="330" fill="#00E599" fontSize="12" fontWeight="600" fontFamily="JetBrains Mono, monospace">
        100% Gross Revenue Retention: All merchant capital remains in the business.
      </text>
    </svg>
  );
};
