import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    expect(html).toContain('aria-label="3D Viewport Status: Interactive Schematic"');
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

  describe('client DOM interactions & WebGL fallback boundary', () => {
    let happyWindow: Window;
    let container: HTMLDivElement;
    let root: Root | null = null;
    const prevActFlag = (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT;

    beforeEach(() => {
      happyWindow = new Window();
      (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
      Object.assign(globalThis, {
        window: happyWindow,
        document: happyWindow.document,
        screen: happyWindow.screen,
        ResizeObserver: happyWindow.ResizeObserver,
        HTMLElement: happyWindow.HTMLElement,
        HTMLCanvasElement: happyWindow.HTMLCanvasElement,
        Node: happyWindow.Node,
        Event: happyWindow.Event,
      });
      container = happyWindow.document.createElement('div') as unknown as HTMLDivElement;
      happyWindow.document.body.appendChild(container as unknown as Node);
    });

    afterEach(async () => {
      if (root) {
        await act(async () => {
          root?.unmount();
        });
        root = null;
      }
      await happyWindow.close();
      (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = prevActFlag;
      Reflect.deleteProperty(globalThis, 'window');
      Reflect.deleteProperty(globalThis, 'document');
      Reflect.deleteProperty(globalThis, 'screen');
      Reflect.deleteProperty(globalThis, 'ResizeObserver');
      Reflect.deleteProperty(globalThis, 'HTMLElement');
      Reflect.deleteProperty(globalThis, 'HTMLCanvasElement');
      Reflect.deleteProperty(globalThis, 'Node');
      Reflect.deleteProperty(globalThis, 'Event');
    });

    it('updates finish, toggles BOM options, and fires onSelectionChange + onAddToCart with integer minor pricing', async () => {
      const onSelectionChange = vi.fn();
      const onAddToCart = vi.fn();

      await act(async () => {
        root = createRoot(container);
        root.render(
          <ProductConfigurator3D
            sku="KIT-BRAKE-01"
            title="Apex Ventilated Brake Kit"
            basePriceMinor={1_200_000}
            currency="INR"
            finishes={finishes}
            bomOptions={bomOptions}
            onSelectionChange={onSelectionChange}
            onAddToCart={onAddToCart}
          />,
        );
      });

      const mintFinishBtn = container.querySelector('button[role="radio"]:nth-of-type(2)') as HTMLButtonElement;
      expect(mintFinishBtn.textContent).toContain('Electric Mint Ceramic');

      await act(async () => {
        mintFinishBtn.click();
      });

      expect(mintFinishBtn.getAttribute('aria-checked')).toBe('true');
      expect(container.textContent).toContain('14,250.00');
      expect(onSelectionChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          sku: 'KIT-BRAKE-01',
          totalPriceMinor: 1_425_000,
          deltaMinor: 225_000,
          selectedOptionalSkus: ['PAD-CERAMIC-01'],
          materialVariant: 'mint-ceramic',
        }),
      );

      const bomButtons = Array.from(container.querySelectorAll('button[aria-pressed]')) as HTMLButtonElement[];
      const lineBtn = bomButtons.find((btn) => btn.textContent?.includes('Braided Stainless Hydraulic Line'));
      const padBtn = bomButtons.find((btn) => btn.textContent?.includes('High-Temp Ceramic Pad Set'));
      expect(lineBtn).toBeDefined();
      expect(padBtn).toBeDefined();

      await act(async () => {
        lineBtn?.click();
      });

      expect(lineBtn?.getAttribute('aria-pressed')).toBe('true');
      expect(container.textContent).toContain('15,100.00');
      expect(onSelectionChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          totalPriceMinor: 1_510_000,
          selectedOptionalSkus: ['PAD-CERAMIC-01', 'LINE-SS-01'],
          materialVariant: 'mint-ceramic',
        }),
      );

      await act(async () => {
        padBtn?.click();
      });

      expect(padBtn?.getAttribute('aria-pressed')).toBe('false');
      expect(container.textContent).toContain('13,600.00');

      const addToCartBtn = Array.from(container.querySelectorAll('button')).find((btn) =>
        btn.textContent?.includes('Add Configured Assembly'),
      ) as HTMLButtonElement;

      await act(async () => {
        addToCartBtn.click();
      });

      expect(onAddToCart).toHaveBeenCalledTimes(1);
      expect(onAddToCart).toHaveBeenCalledWith(
        expect.objectContaining({
          sku: 'KIT-BRAKE-01',
          totalPriceMinor: 1_360_000,
          selectedOptionalSkus: ['LINE-SS-01'],
          materialVariant: 'mint-ceramic',
        }),
      );
    });

    it('cleans up the WebGL probe context and falls back to schematic via ErrorBoundary if Canvas fails', async () => {
      const loseContextSpy = vi.fn();
      let probeCalls = 0;
      const canvasProto = happyWindow.HTMLCanvasElement.prototype as unknown as {
        getContext: (type: string) => unknown;
      };
      const htmlElProto = happyWindow.HTMLElement.prototype as unknown as {
        getBoundingClientRect: () => DOMRect;
      };
      const originalGetContext = canvasProto.getContext;
      const originalGetBoundingClientRect = htmlElProto.getBoundingClientRect;
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      htmlElProto.getBoundingClientRect = () =>
        ({
          width: 320,
          height: 260,
          top: 0,
          left: 0,
          bottom: 260,
          right: 320,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect;

      canvasProto.getContext = (contextId: string) => {
        if ((contextId === 'webgl2' || contextId === 'webgl') && probeCalls === 0) {
          probeCalls += 1;
          return {
            getExtension: (extName: string) =>
              extName === 'WEBGL_lose_context' ? { loseContext: loseContextSpy } : null,
          };
        }
        return null;
      };

      try {
        await act(async () => {
          root = createRoot(container);
          root.render(
            <ProductConfigurator3D
              sku="KIT-BRAKE-01"
              title="Apex Ventilated Brake Kit"
              basePriceMinor={1_200_000}
              currency="INR"
              finishes={finishes}
              bomOptions={bomOptions}
            />,
          );
        });

        await act(async () => {
          happyWindow.dispatchEvent(new happyWindow.Event('resize') as unknown as Event);
          await new Promise((resolvePromise) => setTimeout(resolvePromise, 20));
        });

        expect(loseContextSpy).toHaveBeenCalledTimes(1);
        expect(container.querySelector('[data-webgl-fallback="true"]')).not.toBeNull();
        expect(
          container.querySelector('[aria-label="3D Viewport Status: Interactive Schematic"]'),
        ).not.toBeNull();
      } finally {
        canvasProto.getContext = originalGetContext;
        htmlElProto.getBoundingClientRect = originalGetBoundingClientRect;
        errorSpy.mockRestore();
      }
    });
  });
});
