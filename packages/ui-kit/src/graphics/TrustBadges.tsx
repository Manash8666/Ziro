import React from 'react';

export interface TrustBadgeProps {
  className?: string;
  size?: number;
}

export const ZeroTaxBadge: React.FC<TrustBadgeProps> = ({ className = '', size = 120 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="0% GMV Tax Badge"
  >
    <circle cx="60" cy="60" r="54" fill="#12161E" stroke="#00E599" strokeWidth="2" />
    <circle cx="60" cy="60" r="48" stroke="#1F2633" strokeWidth="1" strokeDasharray="3 3" />
    <path d="M 40 75 L 80 45" stroke="#00E599" strokeWidth="3" strokeLinecap="round" />
    <circle cx="48" cy="50" r="6" stroke="#00E599" strokeWidth="2.5" />
    <circle cx="72" cy="70" r="6" stroke="#00E599" strokeWidth="2.5" />
    <text x="60" y="96" textAnchor="middle" fill="#F4F6F9" fontSize="9" fontWeight="700" fontFamily="JetBrains Mono">
      0% GMV TAX
    </text>
  </svg>
);

export const KyaShieldBadge: React.FC<TrustBadgeProps> = ({ className = '', size = 120 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="KYA Verified Badge"
  >
    <path
      d="M 60 15 L 95 30 V 65 C 95 85 60 105 60 105 C 60 105 25 85 25 65 V 30 Z"
      fill="#12161E"
      stroke="#00E599"
      strokeWidth="2"
    />
    <path d="M 45 60 L 55 70 L 75 48" stroke="#00E599" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <text x="60" y="92" textAnchor="middle" fill="#F4F6F9" fontSize="8" fontWeight="700" fontFamily="JetBrains Mono">
      KYA VERIFIED
    </text>
  </svg>
);

export const LocalFirstSeal: React.FC<TrustBadgeProps> = ({ className = '', size = 120 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Local First POS Seal"
  >
    <circle cx="60" cy="60" r="54" fill="#12161E" stroke="#F59E0B" strokeWidth="2" />
    {/* Sync circle loop arrows */}
    <path d="M 60 30 A 30 30 0 0 1 90 60" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
    <path d="M 60 90 A 30 30 0 0 1 30 60" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
    <polygon points="90,52 96,62 84,62" fill="#F59E0B" />
    <polygon points="30,68 24,58 36,58" fill="#F59E0B" />
    <text x="60" y="64" textAnchor="middle" fill="#F4F6F9" fontSize="9" fontWeight="700" fontFamily="JetBrains Mono">
      LOCAL FIRST
    </text>
    <text x="60" y="96" textAnchor="middle" fill="#8B95A5" fontSize="7" fontWeight="600" fontFamily="JetBrains Mono">
      0ms DOWNTIME
    </text>
  </svg>
);

export const GstComplianceStamp: React.FC<TrustBadgeProps> = ({ className = '', size = 120 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="GST 38+1 Compliant Stamp"
  >
    <rect x="10" y="10" width="100" height="100" rx="8" fill="#12161E" stroke="#00E599" strokeWidth="2" strokeDasharray="4 2" />
    <text x="60" y="45" textAnchor="middle" fill="#00E599" fontSize="16" fontWeight="800" fontFamily="JetBrains Mono">
      GSTIN
    </text>
    <text x="60" y="68" textAnchor="middle" fill="#F4F6F9" fontSize="8" fontWeight="700" fontFamily="JetBrains Mono">
      GST 38+1 COMPLIANT
    </text>
    <text x="60" y="86" textAnchor="middle" fill="#8B95A5" fontSize="7" fontFamily="JetBrains Mono">
      e-Way Bill Ready
    </text>
  </svg>
);
