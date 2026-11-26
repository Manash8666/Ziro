import React from 'react';

export interface AgenticFlowDiagramProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

export const AgenticFlowDiagram: React.FC<AgenticFlowDiagramProps> = ({
  className = '',
  width = '100%',
  height = 'auto',
}) => {
  return (
    <svg
      viewBox="0 0 880 220"
      width={width}
      height={height}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Ziro Autonomous Agentic Commerce Flow"
    >
      <rect width="880" height="220" rx="12" fill="#090B0E" stroke="#1F2633" strokeWidth="2" />

      {/* Step 1: Autonomous Agent */}
      <g transform="translate(30, 45)">
        <rect width="180" height="130" rx="8" fill="#12161E" stroke="#1F2633" strokeWidth="1.5" />
        <circle cx="28" cy="28" r="10" fill="#00E599" fillOpacity="0.1" stroke="#00E599" strokeWidth="1.5" />
        <text x="28" y="32" textAnchor="middle" fill="#00E599" fontSize="10" fontWeight="700" fontFamily="JetBrains Mono">1</text>
        <text x="20" y="65" fill="#F4F6F9" fontSize="13" fontWeight="600" fontFamily="Plus Jakarta Sans">
          Autonomous Buyer Agent
        </text>
        <text x="20" y="90" fill="#8B95A5" fontSize="11" fontFamily="Plus Jakarta Sans">
          Gemini / ChatGPT / WebMCP query
        </text>
        <text x="20" y="115" fill="#00E599" fontSize="10" fontFamily="JetBrains Mono">
          /ucp/manifest.json
        </text>
      </g>

      {/* Arrow 1 */}
      <path d="M 220 110 L 250 110" stroke="#00E599" strokeWidth="2" markerEnd="url(#arrow)" />

      {/* Step 2: KYA Verification */}
      <g transform="translate(250, 45)">
        <rect width="180" height="130" rx="8" fill="#12161E" stroke="#1F2633" strokeWidth="1.5" />
        <circle cx="28" cy="28" r="10" fill="#00E599" fillOpacity="0.1" stroke="#00E599" strokeWidth="1.5" />
        <text x="28" y="32" textAnchor="middle" fill="#00E599" fontSize="10" fontWeight="700" fontFamily="JetBrains Mono">2</text>
        <text x="20" y="65" fill="#F4F6F9" fontSize="13" fontWeight="600" fontFamily="Plus Jakarta Sans">
          KYA Verification
        </text>
        <text x="20" y="90" fill="#8B95A5" fontSize="11" fontFamily="Plus Jakarta Sans">
          ECDSA signature check & bot filter
        </text>
        <text x="20" y="115" fill="#00E599" fontSize="10" fontFamily="JetBrains Mono">
          SECURE AGENT IDENTITY
        </text>
      </g>

      {/* Arrow 2 */}
      <path d="M 440 110 L 470 110" stroke="#00E599" strokeWidth="2" />

      {/* Step 3: Margin Guardrail */}
      <g transform="translate(470, 45)">
        <rect width="180" height="130" rx="8" fill="#12161E" stroke="#1F2633" strokeWidth="1.5" />
        <circle cx="28" cy="28" r="10" fill="#F59E0B" fillOpacity="0.1" stroke="#F59E0B" strokeWidth="1.5" />
        <text x="28" y="32" textAnchor="middle" fill="#F59E0B" fontSize="10" fontWeight="700" fontFamily="JetBrains Mono">3</text>
        <text x="20" y="65" fill="#F4F6F9" fontSize="13" fontWeight="600" fontFamily="Plus Jakarta Sans">
          Margin Guardrail
        </text>
        <text x="20" y="90" fill="#8B95A5" fontSize="11" fontFamily="Plus Jakarta Sans">
          Floor price lock protects profit
        </text>
        <text x="20" y="115" fill="#F59E0B" fontSize="10" fontFamily="JetBrains Mono">
          PREVENT ARBITRAGE
        </text>
      </g>

      {/* Arrow 3 */}
      <path d="M 660 110 L 690 110" stroke="#00E599" strokeWidth="2" />

      {/* Step 4: 0% Fee Settlement */}
      <g transform="translate(690, 45)">
        <rect width="160" height="130" rx="8" fill="#12161E" stroke="#00E599" strokeWidth="1.5" />
        <circle cx="28" cy="28" r="10" fill="#00E599" fillOpacity="0.2" stroke="#00E599" strokeWidth="1.5" />
        <text x="28" y="32" textAnchor="middle" fill="#00E599" fontSize="10" fontWeight="700" fontFamily="JetBrains Mono">4</text>
        <text x="20" y="65" fill="#F4F6F9" fontSize="13" fontWeight="600" fontFamily="Plus Jakarta Sans">
          0% Fee Settlement
        </text>
        <text x="20" y="90" fill="#8B95A5" fontSize="11" fontFamily="Plus Jakarta Sans">
          Direct UPI / Stripe execution
        </text>
        <text x="20" y="115" fill="#00E599" fontSize="10" fontFamily="JetBrains Mono">
          INSTANT LEDGER SYNC
        </text>
      </g>
    </svg>
  );
};
