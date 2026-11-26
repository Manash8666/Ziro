import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ScanFeedbackBanner } from '../components/ScanFeedbackBanner';
import { QuickActionBar } from '../components/QuickActionBar';

describe('Task 6: POS Terminal Counter UX & Hardware Quick Actions', () => {
  it('renders ScanFeedbackBanner with barcode details and mint signal highlight', () => {
    const html = renderToStaticMarkup(
      React.createElement(ScanFeedbackBanner, {
        lastBarcode: '890123456001',
        lastItemTitle: 'Ceramic Brake Pad Kit',
        timestampMs: 1700000000,
      })
    );

    expect(html).toContain('890123456001');
    expect(html).toContain('Ceramic Brake Pad Kit');
    expect(html).toContain('BARCODE SCANNED');
  });

  it('renders QuickActionBar with cash drawer kick, receipt reprint, and sync trigger', () => {
    const html = renderToStaticMarkup(
      React.createElement(QuickActionBar, {
        onDrawerKick: () => {},
        onReprint: () => {},
        onSyncLedger: () => {},
        isSyncing: false,
        pendingCount: 3,
      })
    );

    expect(html).toContain('Open Drawer');
    expect(html).toContain('Print Receipt');
    expect(html).toContain('Sync 3 Offline Sales');
  });
});
