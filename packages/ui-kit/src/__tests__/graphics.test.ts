import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  ZiroMark,
  ArchitectureDiagram,
  TaxComparisonGraphic,
  AgenticFlowDiagram,
  ZeroTaxBadge,
  KyaShieldBadge,
  LocalFirstSeal,
  GstComplianceStamp,
} from '../graphics/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Task 1: @ziro/ui-kit Graphic Design Suite & Tokens', () => {
  it('defines Stage 3 extended surface, elevation, and glass tokens in tokens.css', () => {
    const tokensCss = readFileSync(resolve(__dirname, '../tokens.css'), 'utf8');
    expect(tokensCss).toContain('--surface-glass:');
    expect(tokensCss).toContain('--border-hairline:');
    expect(tokensCss).toContain('--border-glow-mint:');
    expect(tokensCss).toContain('Plus Jakarta Sans');
  });

  it('renders ZiroMark with broken-ring slashed-zero vector geometry', () => {
    const htmlDefault = renderToStaticMarkup(React.createElement(ZiroMark));
    expect(htmlDefault).toContain('<svg');
    expect(htmlDefault).toContain('viewBox');
    expect(htmlDefault).toContain('#00E599');

    const htmlAmber = renderToStaticMarkup(
      React.createElement(ZiroMark, { size: 'lg', tone: 'amber' })
    );
    expect(htmlAmber).toContain('#F59E0B');
  });

  it('renders ArchitectureDiagram with monorepo stack layers', () => {
    const html = renderToStaticMarkup(React.createElement(ArchitectureDiagram));
    expect(html).toContain('<svg');
    expect(html).toContain('Caddy');
    expect(html).toContain('Storefront');
    expect(html).toContain('Medusa');
    expect(html).toContain('Valkey');
    expect(html).toContain('PostgreSQL 17');
    expect(html).toContain('Pulse AI');
  });

  it('renders TaxComparisonGraphic contrasting legacy take-rate with Ziro 0% fee', () => {
    const html = renderToStaticMarkup(React.createElement(TaxComparisonGraphic));
    expect(html).toContain('<svg');
    expect(html).toContain('Legacy SaaS (2.9% + 30¢)');
    expect(html).toContain('Ziro (0% GMV Fee)');
    expect(html).toContain('$0 Tax');
  });

  it('renders AgenticFlowDiagram detailing autonomous agent checkout loop', () => {
    const html = renderToStaticMarkup(React.createElement(AgenticFlowDiagram));
    expect(html).toContain('<svg');
    expect(html).toContain('Autonomous Buyer Agent');
    expect(html).toContain('KYA Verification');
    expect(html).toContain('Margin Guardrail');
    expect(html).toContain('0% Fee Settlement');
  });

  it('renders all trust and compliance badges with semantic vector paths', () => {
    const zeroTaxHtml = renderToStaticMarkup(React.createElement(ZeroTaxBadge));
    expect(zeroTaxHtml).toContain('0% GMV TAX');

    const kyaHtml = renderToStaticMarkup(React.createElement(KyaShieldBadge));
    expect(kyaHtml).toContain('KYA VERIFIED');

    const localFirstHtml = renderToStaticMarkup(React.createElement(LocalFirstSeal));
    expect(localFirstHtml).toContain('LOCAL FIRST');

    const gstHtml = renderToStaticMarkup(React.createElement(GstComplianceStamp));
    expect(gstHtml).toContain('GST 38+1 COMPLIANT');
  });
});
