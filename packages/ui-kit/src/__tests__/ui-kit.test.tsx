import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  MetricCard,
  MonoCell,
  StatusBadge,
  ZiroButton,
  ZiroWordmark,
} from '../index.js';
import {
  ProductConfigurator3D,
  computeConfiguratorSelection,
  type BomConfiguratorOption,
  type MaterialFinishOption,
} from '../3d/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('@ziro/ui-kit Dark Precision design system', () => {
  it('defines required Dark Architectural Precision @theme tokens in tokens.css', () => {
    const tokensCss = readFileSync(resolve(__dirname, '../tokens.css'), 'utf8');
    expect(tokensCss).toContain('@theme');
    expect(tokensCss).toContain('--color-ziro-obsidian: #090B0E');
    expect(tokensCss).toContain('--color-ziro-slate: #12161E');
    expect(tokensCss).toContain('--color-ziro-border: #1F2633');
    expect(tokensCss).toContain('--color-ziro-mint: #00E599');
    expect(tokensCss).toContain('--color-ziro-amber: #F59E0B');
    expect(tokensCss).toContain('--color-ziro-alabaster: #F4F6F9');
    expect(tokensCss).toContain('Plus Jakarta Sans');
    expect(tokensCss).toContain('JetBrains Mono');
  });

  it('renders ZiroWordmark as an accessible RSC-safe geometric SVG with slashed-zero sync ring', () => {
    const html = renderToStaticMarkup(<ZiroWordmark showTagline />);
    expect(html).toContain('<svg');
    expect(html).toContain('ziro');
    expect(html).toContain('#00E599');
    expect(html).toContain('data-wordmark="ziro"');
    expect(html).toContain('0% GMV');
  });

  it('renders StatusBadge variants for live-sync, offline-queue, and zero-fee with accessible roles', () => {
    const liveHtml = renderToStaticMarkup(<StatusBadge variant="live-sync" />);
    expect(liveHtml).toContain('role="status"');
    expect(liveHtml).toContain('Live Sync');
    expect(liveHtml).toContain('#00E599');

    const offlineHtml = renderToStaticMarkup(
      <StatusBadge variant="offline-queue" queueCount={4} />,
    );
    expect(offlineHtml).toContain('role="status"');
    expect(offlineHtml).toContain('Offline Queue (4)');
    expect(offlineHtml).toContain('#F59E0B');

    const zeroFeeHtml = renderToStaticMarkup(<StatusBadge variant="zero-fee" />);
    expect(zeroFeeHtml).toContain('0% GMV Fee');
    expect(zeroFeeHtml).toContain('#00E599');
  });

  it('renders MetricCard and ZiroButton variants with Dark Precision tokens', () => {
    const cardHtml = renderToStaticMarkup(
      <MetricCard
        label="Platform Fee"
        value="₹0.00"
        delta="0% GMV Tax"
        deltaTone="mint"
        statusBadge={{ variant: 'zero-fee' }}
      />,
    );
    expect(cardHtml).toContain('#12161E');
    expect(cardHtml).toContain('#1F2633');
    expect(cardHtml).toContain('tabular-nums');
    expect(cardHtml).toContain('Platform Fee');
    expect(cardHtml).toContain('0% GMV Fee');

    const primaryBtn = renderToStaticMarkup(<ZiroButton variant="primary">Sync POS</ZiroButton>);
    expect(primaryBtn).toContain('#00E599');
    expect(primaryBtn).toContain('Sync POS');

    const amberBtn = renderToStaticMarkup(
      <ZiroButton variant="amber" loading>
        Resolve Conflict
      </ZiroButton>,
    );
    expect(amberBtn).toContain('#F59E0B');
    expect(amberBtn).toContain('aria-busy="true"');
    expect(amberBtn).toContain('disabled');
  });

  it('renders MonoCell for SKUs, HSN, GSTIN, and integer minor-unit currency while rejecting floats', () => {
    const skuHtml = renderToStaticMarkup(<MonoCell kind="sku" value="BRK-PAD-01" />);
    expect(skuHtml).toContain('JetBrains Mono');
    expect(skuHtml).toContain('tabular-nums');
    expect(skuHtml).toContain('BRK-PAD-01');

    const gstinHtml = renderToStaticMarkup(<MonoCell kind="gstin" value="29ABCDE1234F1ZW" />);
    expect(gstinHtml).toContain('29ABCDE1234F1ZW');

    const inrHtml = renderToStaticMarkup(
      <MonoCell kind="currency" amountMinor={199950} currency="INR" />,
    );
    expect(inrHtml).toContain('1,999.50');
    expect(inrHtml).toContain('₹');

    const usdHtml = renderToStaticMarkup(
      <MonoCell kind="currency" amountMinor={-500} currency="USD" />,
    );
    expect(usdHtml).toContain('-');
    expect(usdHtml).toContain('5.00');

    expect(() =>
      renderToStaticMarkup(<MonoCell kind="currency" amountMinor={19.99} currency="INR" />),
    ).toThrow();
  });
});

describe('@ziro/ui-kit/3d configurator', () => {
  const finishes: MaterialFinishOption[] = [
    {
      id: 'anodized-obsidian',
      label: 'Anodized Obsidian',
      swatchHex: '#1F2633',
      metalness: 0.85,
      roughness: 0.25,
      priceDeltaMinor: 0,
    },
    {
      id: 'mint-ceramic',
      label: 'Electric Mint Ceramic',
      swatchHex: '#00E599',
      metalness: 0.4,
      roughness: 0.35,
      priceDeltaMinor: 75_000,
    },
  ];

  const bomOptions: BomConfiguratorOption[] = [
    {
      id: 'pad-ceramic',
      childSku: 'PAD-CERAMIC-01',
      label: 'High-Temp Ceramic Pad Set',
      optionGroup: 'pads',
      priceDeltaMinor: 150_000,
      defaultSelected: true,
    },
    {
      id: 'line-braided',
      childSku: 'LINE-SS-01',
      label: 'Braided Stainless Hydraulic Line',
      optionGroup: 'lines',
      priceDeltaMinor: 85_000,
    },
    {
      id: 'fleet-rebate',
      childSku: 'REBATE-B2B-01',
      label: 'Core Exchange Credit',
      optionGroup: 'credit',
      priceDeltaMinor: -25_000,
    },
  ];

  it('computes exact integer minor-unit configurator selections and deduplicates selectedIds', () => {
    const res = computeConfiguratorSelection(
      1_200_000,
      bomOptions,
      ['pad-ceramic', 'line-braided', 'pad-ceramic'],
      finishes[1],
    );

    expect(res.basePriceMinor).toBe(1_200_000);
    expect(res.deltaMinor).toBe(150_000 + 85_000 + 75_000);
    expect(res.totalPriceMinor).toBe(1_510_000);
    expect(res.selectedOptionalSkus).toEqual(['PAD-CERAMIC-01', 'LINE-SS-01']);
    expect(res.selectedOptions).toHaveLength(2);
    expect(Number.isSafeInteger(res.totalPriceMinor)).toBe(true);
  });

  it('supports negative deltas and rejects non-integer minor-unit prices', () => {
    const discounted = computeConfiguratorSelection(500_000, bomOptions, ['fleet-rebate']);
    expect(discounted.deltaMinor).toBe(-25_000);
    expect(discounted.totalPriceMinor).toBe(475_000);

    expect(() =>
      computeConfiguratorSelection(199.5, bomOptions, ['pad-ceramic']),
    ).toThrow();

    expect(() =>
      computeConfiguratorSelection(
        500_000,
        [{ id: 'bad', childSku: 'BAD', label: 'Bad', priceDeltaMinor: 12.34 }],
        ['bad'],
      ),
    ).toThrow();
  });

  it('renders ProductConfigurator3D cleanly in SSR/non-WebGL mode with Dark Precision schematic fallback', () => {
    const html = renderToStaticMarkup(
      <ProductConfigurator3D
        sku="KIT-BRAKE-01"
        title="Apex Ventilated Brake Kit"
        basePriceMinor={1_200_000}
        currency="INR"
        finishes={finishes}
        bomOptions={bomOptions}
      />,
    );

    expect(html).toContain('Apex Ventilated Brake Kit');
    expect(html).toContain('KIT-BRAKE-01');
    expect(html).toContain('Anodized Obsidian');
    expect(html).toContain('Electric Mint Ceramic');
    expect(html).toContain('High-Temp Ceramic Pad Set');
    expect(html).toContain('PAD-CERAMIC-01');
    expect(html).toContain('13,500.00');
    expect(html).toContain('data-webgl-fallback="true"');
    expect(html).toContain('<svg');

    const configuratorSource = readFileSync(
      resolve(__dirname, '../3d/ProductConfigurator3D.tsx'),
      'utf8',
    );
    expect(configuratorSource.startsWith('"use client";')).toBe(true);
  });

  it('renders ProductConfigurator3D cleanly with custom initialFinishId and initialSelectedOptionIds', () => {
    const html = renderToStaticMarkup(
      <ProductConfigurator3D
        sku="KIT-BRAKE-01"
        title="Apex Ventilated Brake Kit"
        basePriceMinor={1_200_000}
        currency="INR"
        finishes={finishes}
        bomOptions={bomOptions}
        initialFinishId="mint-ceramic"
        initialSelectedOptionIds={['pad-ceramic', 'line-braided']}
        onAddToCart={() => {}}
      />,
    );

    expect(html).toContain('15,100.00');
    expect(html).toContain('Add Configured Assembly');
    expect(html).toContain('2 BOM Add-ons');
  });
});
