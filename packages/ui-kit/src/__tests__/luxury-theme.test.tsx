import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ThemeToggle } from '../components/ThemeToggle.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Ziro Luxury Dual Palette (Day & Dark)', () => {
  it('defines the complete Day Mode luxury palette (Steamed Cream & Warm Latte)', () => {
    const tokensCss = readFileSync(resolve(__dirname, '../tokens.css'), 'utf8');

    // Steamed Cream / Soft Ivory: #F5EBE1
    expect(tokensCss).toContain('#F5EBE1');
    // Warm Latte / Oatmeal: #DBC1AC & #CBB69A
    expect(tokensCss).toContain('#DBC1AC');
    expect(tokensCss).toContain('#CBB69A');
    // Mocha / Hazelnut: #7B5A44 & #634832
    expect(tokensCss).toContain('#7B5A44');
    expect(tokensCss).toContain('#634832');
    // Espresso Brown: #452F23
    expect(tokensCss).toContain('#452F23');
    // Dark Roast / Charcoal: #1E1A17
    expect(tokensCss).toContain('#1E1A17');
  });

  it('defines the complete Dark Mode luxury palette (Wine & Luminous Blush)', () => {
    const tokensCss = readFileSync(resolve(__dirname, '../tokens.css'), 'utf8');

    // Deep Cellar: #14090D
    expect(tokensCss).toContain('#14090D');
    // Velvet Merlot: #221016
    expect(tokensCss).toContain('#221016');
    // Muted Cabernet: #3D1C26
    expect(tokensCss).toContain('#3D1C26');
    // Rich Bordeaux: #7A243B
    expect(tokensCss).toContain('#7A243B');
    // Soft Blush: #F6DCE2
    expect(tokensCss).toContain('#F6DCE2');
    // Dusty Rose: #C9A3AC
    expect(tokensCss).toContain('#C9A3AC');
    // Luminous Blush: #E8A5B5
    expect(tokensCss).toContain('#E8A5B5');
    // Radial hero gradient: #2E121B into #14090D
    expect(tokensCss).toContain('#2E121B');
  });

  it('renders ThemeToggle with accessible button and labels', () => {
    const html = renderToStaticMarkup(<ThemeToggle />);
    expect(html).toContain('button');
    expect(html).toContain('Wine &amp; Blush');
    expect(html).toContain('Switch to');
  });
});
