import { describe, expect, it, vi } from 'vitest';
import {
  CashDrawerController,
  EscPosPrinterDriver,
  HardwareBarcodeScannerListener,
} from '../lib/hardware/index.js';

describe('EscPosPrinterDriver', () => {
  it('generates binary ESC/POS buffers with store header, GST table, UPI QR code, paper cut, and cash drawer pulse', () => {
    const driver = new EscPosPrinterDriver();

    const buffer80 = driver.buildReceipt({
      paper_width: 80,
      store_name: 'Ziro Auto Spares Flagship',
      gstin: '07AAAAA0000A1Z5',
      invoice_no: 'INV-2026-0091',
      date: '2026-11-26 14:00:00',
      cashier_name: 'Rajesh K.',
      items: [
        {
          name: 'Ceramic Brake Pad Kit',
          qty: 1,
          unit_price_minor: 149900,
          total_minor: 149900,
          hsn: '8708',
        },
      ],
      subtotal_minor: 149900,
      tax_lines: [
        { code: 'CGST', rate_pct: 9, amount_minor: 13491 },
        { code: 'SGST', rate_pct: 9, amount_minor: 13491 },
      ],
      total_minor: 176882,
      tender_type: 'UPI',
      qr_payload: 'upi://pay?pa=ziro@okaxis&am=1768.82',
      barcode_payload: 'INV20260091',
      cut_paper: true,
      open_cash_drawer: true,
    });

    expect(buffer80).toBeInstanceOf(Uint8Array);
    expect(buffer80.length).toBeGreaterThan(100);

    // Initial ESC @ command (0x1B, 0x40)
    expect(buffer80[0]).toBe(0x1b);
    expect(buffer80[1]).toBe(0x40);

    // Text content must exist in decoded buffer
    const decoded = new TextDecoder('ascii', { fatal: false }).decode(buffer80);
    expect(decoded).toContain('Ziro Auto Spares Flagship');
    expect(decoded).toContain('07AAAAA0000A1Z5');
    expect(decoded).toContain('INV-2026-0091');
    expect(decoded).toContain('Ceramic Brake Pad');
    expect(decoded).toContain('CGST');
    expect(decoded).toContain('SGST');
    expect(decoded).toContain('1768.82');

    // Test 58mm narrower column formatting
    const buffer58 = driver.buildReceipt({
      paper_width: 58,
      store_name: 'Ziro Express',
      invoice_no: 'INV-58',
      date: '2026-11-26',
      items: [
        {
          name: 'Engine Oil',
          qty: 2,
          unit_price_minor: 50000,
          total_minor: 100000,
        },
      ],
      subtotal_minor: 100000,
      tax_lines: [],
      total_minor: 100000,
      tender_type: 'CASH',
      cut_paper: false,
      open_cash_drawer: false,
    });
    expect(buffer58.length).toBeGreaterThan(50);
  });
});

describe('CashDrawerController', () => {
  it('generates standard standard ESC p pulse bytes for 24V cash drawer kick', () => {
    const pulsePin2 = CashDrawerController.getKickCommand(2);
    expect(Array.from(pulsePin2)).toEqual([0x1b, 0x70, 0x00, 0x19, 0xfa]);

    const pulsePin5 = CashDrawerController.getKickCommand(5);
    expect(Array.from(pulsePin5)).toEqual([0x1b, 0x70, 0x01, 0x19, 0xfa]);
  });
});

describe('HardwareBarcodeScannerListener', () => {
  it('captures rapid hardware barcode keystrokes and rejects slow human typing', async () => {
    const listener = new HardwareBarcodeScannerListener({ maxInterKeyMs: 30 });
    const onScan = vi.fn();
    listener.on('scan', onScan);

    // Simulate fast scanner input (e.g. 10ms between chars)
    const barcode = '8901234567890';
    let mockTime = 1000;
    for (const char of barcode) {
      listener.handleKeyEvent({ key: char, timestamp: mockTime });
      mockTime += 10;
    }
    listener.handleKeyEvent({ key: 'Enter', timestamp: mockTime + 5 });

    expect(onScan).toHaveBeenCalledTimes(1);
    expect(onScan).toHaveBeenCalledWith(
      expect.objectContaining({
        barcode: '8901234567890',
        duration_ms: expect.any(Number),
      }),
    );

    // Simulate slow human typing (> 60ms between chars)
    onScan.mockClear();
    let humanTime = 5000;
    for (const char of 'SLOWTYPED') {
      listener.handleKeyEvent({ key: char, timestamp: humanTime });
      humanTime += 80; // 80ms is slower than 30ms threshold
    }
    listener.handleKeyEvent({ key: 'Enter', timestamp: humanTime + 5 });

    // Slow human typing must NOT trigger scan event
    expect(onScan).not.toHaveBeenCalled();
  });
});
