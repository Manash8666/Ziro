'use client';

import React, { useState } from 'react';
import { ZiroButton } from '@ziro/ui-kit';

export function ProtocolPlayground() {
  const [activeTab, setActiveTab] = useState<'ucp' | 'webmcp' | 'kya'>('ucp');
  const [simulatedStatus, setSimulatedStatus] = useState<string>('Ready to query agent endpoint');

  const handleSimulate = () => {
    if (activeTab === 'ucp') {
      setSimulatedStatus('200 OK — Manifest delivered in 14ms (0% GMV fee enforced)');
    } else if (activeTab === 'webmcp') {
      setSimulatedStatus('200 OK — 3 WebMCP shopping agent tools exposed: search, quote, checkout');
    } else {
      setSimulatedStatus('200 OK — ECDSA signature verified, 20% margin guardrail passed');
    }
  };

  return (
    <div className="rounded-xl border border-[#1F2633] bg-[#12161E] p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1F2633] pb-4">
        <div>
          <h3 className="text-xl font-bold text-[#F4F6F9] font-sans">
            Autonomous Agent Protocol Playground
          </h3>
          <p className="text-xs text-[#8B95A5] mt-1">
            Test live UCP manifests, WebMCP agent tools, and KYA security verification without third-party middleware.
          </p>
        </div>
        <span className="font-mono text-xs text-[#00E599] bg-[#00E599]/10 px-3 py-1 rounded-full border border-[#00E599]/30">
          Agentic Native
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#1F2633] pb-2">
        {[
          { id: 'ucp', label: '/ucp/manifest.json' },
          { id: 'webmcp', label: 'WebMCP Tools' },
          { id: 'kya', label: 'KYA Signature Verification' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setSimulatedStatus('Ready to query agent endpoint');
            }}
            className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
              activeTab === tab.id
                ? 'bg-[#00E599] text-[#090B0E] font-bold'
                : 'bg-[#090B0E] border border-[#1F2633] text-[#8B95A5] hover:text-[#F4F6F9]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Interactive Code Preview */}
      <div className="rounded-lg border border-[#1F2633] bg-[#090B0E] p-4 font-mono text-xs text-[#F4F6F9] overflow-x-auto">
        {activeTab === 'ucp' && (
          <pre className="text-[#00E599]">
{`{
  "ucp_version": "2026-01",
  "store_name": "Ziro Demo Store",
  "platform_fee_bps": 0,
  "supported_currencies": ["INR", "USD"],
  "endpoints": {
    "catalog_search": "/v1/pulse/search",
    "agent_checkout": "/v1/pulse/checkout/acp"
  }
}`}
          </pre>
        )}

        {activeTab === 'webmcp' && (
          <pre className="text-[#F4F6F9]">
{`tools:
  - name: query_catalog
    description: Typo-tolerant semantic part search with vector ranking
  - name: get_shipping_quotes
    description: Live carrier rates (Shiprocket & Delhivery)
  - name: create_agent_cart
    description: Atomic Valkey cart reservation lock with 0% fee`}
          </pre>
        )}

        {activeTab === 'kya' && (
          <pre className="text-[#F59E0B]">
{`KYA-Agent-Verification:
  algorithm: "ECDSA_SECP256K1"
  agent_id: "agent_gemini_buyer_0492"
  margin_floor_pct: 15.0
  requested_discount_pct: 8.5
  status: "AUTHORIZED_WITHIN_GUARDRAIL"`}
          </pre>
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        <span className="text-xs font-mono text-[#00E599]">{simulatedStatus}</span>
        <ZiroButton variant="primary" size="sm" onClick={handleSimulate}>
          Simulate Agent Request
        </ZiroButton>
      </div>
    </div>
  );
}
