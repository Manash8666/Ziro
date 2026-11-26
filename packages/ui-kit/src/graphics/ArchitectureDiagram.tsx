import React from 'react';

export interface ArchitectureDiagramProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

export const ArchitectureDiagram: React.FC<ArchitectureDiagramProps> = ({
  className = '',
  width = '100%',
  height = 'auto',
}) => {
  return (
    <svg
      viewBox="0 0 900 420"
      width={width}
      height={height}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Ziro Unified Commerce Architecture Diagram"
    >
      <rect width="900" height="420" rx="12" fill="#090B0E" stroke="#1F2633" strokeWidth="2" />

      {/* Grid pattern background */}
      <defs>
        <pattern id="arch-grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#12161E" strokeWidth="1" />
        </pattern>
        <linearGradient id="mint-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00E599" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#00E599" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <rect width="900" height="420" fill="url(#arch-grid)" opacity="0.6" />

      {/* Top Layer: Entry / Routing */}
      <g transform="translate(60, 40)">
        <rect width="780" height="60" rx="8" fill="#12161E" stroke="#1F2633" strokeWidth="1.5" />
        <circle cx="30" cy="30" r="10" fill="#00E599" fillOpacity="0.2" stroke="#00E599" strokeWidth="1.5" />
        <text x="55" y="35" fill="#F4F6F9" fontSize="14" fontWeight="600" fontFamily="Plus Jakarta Sans, sans-serif">
          Caddy Edge Reverse Proxy (Automated On-Demand TLS & Custom Domains)
        </text>
        <text x="640" y="35" fill="#00E599" fontSize="12" fontFamily="JetBrains Mono, monospace">
          0ms TLS Handshake
        </text>
      </g>

      {/* Connecting line 1 */}
      <line x1="450" y1="100" x2="450" y2="140" stroke="#00E599" strokeWidth="2" strokeDasharray="4 4" />

      {/* Middle Layer: Client Presentation */}
      <g transform="translate(60, 140)">
        {/* Next.js Storefront */}
        <rect x="0" y="0" width="240" height="90" rx="8" fill="#12161E" stroke="#1F2633" strokeWidth="1.5" />
        <text x="20" y="32" fill="#F4F6F9" fontSize="14" fontWeight="600" fontFamily="Plus Jakarta Sans, sans-serif">
          Storefront (Next.js 16)
        </text>
        <text x="20" y="55" fill="#8B95A5" fontSize="11" fontFamily="Plus Jakarta Sans, sans-serif">
          Payload CMS v3 + 3D Three.js
        </text>
        <text x="20" y="75" fill="#00E599" fontSize="10" fontFamily="JetBrains Mono, monospace">
          TURBOPACK SSR
        </text>

        {/* Serwist POS */}
        <rect x="270" y="0" width="240" height="90" rx="8" fill="#12161E" stroke="#1F2633" strokeWidth="1.5" />
        <text x="290" y="32" fill="#F4F6F9" fontSize="14" fontWeight="600" fontFamily="Plus Jakarta Sans, sans-serif">
          POS Terminal (@ziro/pos)
        </text>
        <text x="290" y="55" fill="#8B95A5" fontSize="11" fontFamily="Plus Jakarta Sans, sans-serif">
          Local Dexie DB + ESC/POS
        </text>
        <text x="290" y="75" fill="#F59E0B" fontSize="10" fontFamily="JetBrains Mono, monospace">
          ZERO-DOWNTIME OFFLINE
        </text>

        {/* Cloud Portal */}
        <rect x="540" y="0" width="240" height="90" rx="8" fill="#12161E" stroke="#1F2633" strokeWidth="1.5" />
        <text x="560" y="32" fill="#F4F6F9" fontSize="14" fontWeight="600" fontFamily="Plus Jakarta Sans, sans-serif">
          Cloud Portal (@ziro/cloud-portal)
        </text>
        <text x="560" y="55" fill="#8B95A5" fontSize="11" fontFamily="Plus Jakarta Sans, sans-serif">
          SaaS Billing & Domain Manager
        </text>
        <text x="560" y="75" fill="#00E599" fontSize="10" fontFamily="JetBrains Mono, monospace">
          0% GMV PLATFORM TAX
        </text>
      </g>

      {/* Connecting lines 2 */}
      <line x1="180" y1="230" x2="350" y2="270" stroke="#1F2633" strokeWidth="1.5" />
      <line x1="390" y1="230" x2="450" y2="270" stroke="#00E599" strokeWidth="2" />
      <line x1="660" y1="230" x2="550" y2="270" stroke="#1F2633" strokeWidth="1.5" />

      {/* Core Layer: Medusa & Valkey & Pulse */}
      <g transform="translate(60, 270)">
        {/* Medusa v2 Engine */}
        <rect x="0" y="0" width="240" height="100" rx="8" fill="#12161E" stroke="#1F2633" strokeWidth="1.5" />
        <text x="20" y="32" fill="#F4F6F9" fontSize="14" fontWeight="600" fontFamily="Plus Jakarta Sans, sans-serif">
          Medusa v2 (@ziro/core)
        </text>
        <text x="20" y="55" fill="#8B95A5" fontSize="11" fontFamily="Plus Jakarta Sans, sans-serif">
          Workflows SDK + Catalog Seeds
        </text>
        <text x="20" y="80" fill="#00E599" fontSize="10" fontFamily="JetBrains Mono, monospace">
          ROLLBACK-SAFE WORKFLOWS
        </text>

        {/* Valkey Cart Locks */}
        <rect x="270" y="0" width="240" height="100" rx="8" fill="#12161E" stroke="#1F2633" strokeWidth="1.5" />
        <text x="290" y="32" fill="#F4F6F9" fontSize="14" fontWeight="600" fontFamily="Plus Jakarta Sans, sans-serif">
          Valkey & PostgreSQL 17
        </text>
        <text x="290" y="55" fill="#8B95A5" fontSize="11" fontFamily="Plus Jakarta Sans, sans-serif">
          Atomic Cart Locks + TimescaleDB
        </text>
        <text x="290" y="80" fill="#00E599" fontSize="10" fontFamily="JetBrains Mono, monospace">
          SINGLE OPERATIONAL LEDGER
        </text>

        {/* Pulse AI */}
        <rect x="540" y="0" width="240" height="100" rx="8" fill="#12161E" stroke="#1F2633" strokeWidth="1.5" />
        <text x="560" y="32" fill="#F4F6F9" fontSize="14" fontWeight="600" fontFamily="Plus Jakarta Sans, sans-serif">
          Pulse AI (FastAPI)
        </text>
        <text x="560" y="55" fill="#8B95A5" fontSize="11" fontFamily="Plus Jakarta Sans, sans-serif">
          pgvector + RTO + UCP/ACP
        </text>
        <text x="560" y="80" fill="#00E599" fontSize="10" fontFamily="JetBrains Mono, monospace">
          NATIVE AGENT COMMERCE
        </text>
      </g>
    </svg>
  );
};
