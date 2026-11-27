import { describe, it, expect } from 'vitest';
import { evaluateHidBurstSamples } from '../hooks/useHidBarcodeScanner';
import {
  encodeCashDrawerKickPulse,
  encodeEscPosReceiptPacket,
  type PosReceiptPayload,
} from '../lib/webserial-escpos';
import {
  calculatePosTicketTotals,
  type PosCartItem,
} from '../lib/pos-offline-db';

describe('POS Terminal Stage 5 Hardening & Hardware Drivers', () => {
  describe('Hardware HID Barcode Burst Detector', () => {
    it('detects valid hardware scanner burst under 30ms inter-key latency', () => {
      const barcode = '8901234001015';
      const samples: Array<{ key: string; time: number }> = [];
      let t = 1000;

      for (const char of barcode) {
        samples.push({ key: char, time: t });
        t += 12; // 12ms inter-key delay typical of laser/CCD scanner
      }
      samples.push({ key: 'Enter', time: t + 10 });

      const detected = evaluateHidBurstSamples(samples, 30, 3);
      expect(detected).toBe(barcode);
    });

    it('rejects human manual typing with inter-key latency exceeding 30ms', () => {
      const barcode = '8901234001015';
      const samples: Array<{ key: string; time: number }> = [];
      let t = 1000;

      for (const char of barcode) {
        samples.push({ key: char, time: t });
        t += 85; // 85ms human typing speed
      }
      samples.push({ key: 'Enter', time: t + 50 });

      const detected = evaluateHidBurstSamples(samples, 30, 3);
      expect(detected).toBeNull();
    });

    it('rejects bursts without trailing Enter key', () => {
      const samples = [
        { key: '8', time: 100 },
        { key: '9', time: 110 },
        { key: '0', time: 120 },
      ];
      expect(evaluateHidBurstSamples(samples, 30, 3)).toBeNull();
    });
  });

  describe('WebSerial ESC/POS Binary Encoder & Cash Drawer Driver', () => {
    it('generates standard ESC/POS 0x1B 0x70 cash drawer solenoid pulse', () => {
      const pulse = encodeCashDrawerKickPulse();
      expect(pulse).toBeInstanceOf(Uint8Array);
      expect(pulse.length).toBe(5);
      expect(Array.from(pulse)).toEqual([0x1b, 0x70, 0x00, 0x19, 0xfa]);
    });

    it('encodes full receipt packet containing 0% GMV fee guarantee and cash drawer kick', () => {
      const receipt: PosReceiptPayload = {
        storeName: 'ZIRO PERFORMANCE RETAIL',
        invoiceNo: 'INV-POS-998822',
        cashierName: 'Vikram S.',
        terminalId: 'POS-01',
        dateIso: '2026-11-27T10:00:00Z',
        items: [
          {
            sku: 'ZR-BRK-001',
            title: 'Brembo Ceramic Front Brake Pads',
            qty: 2,
            unitPricePaise: 485000,
            totalPaise: 970000,
            hsnCode: '87083000',
            gstPercent: 18,
          },
        ],
        subtotalPaise: 970000,
        cgstPaise: 87300,
        sgstPaise: 87300,
        igstPaise: 0,
        totalTaxPaise: 174600,
        totalPaise: 1144600,
        paymentMode: 'CASH',
        platformFeeBps: 0,
        openCashDrawer: true,
      };

      const packet = encodeEscPosReceiptPacket(receipt);
      expect(packet).toBeInstanceOf(Uint8Array);
      expect(packet.length).toBeGreaterThan(100);

      // Verify cash drawer kick command is included in the packet
      let foundKick = false;
      for (let i = 0; i < packet.length - 4; i++) {
        if (
          packet[i] === 0x1b &&
          packet[i + 1] === 0x70 &&
          packet[i + 2] === 0x00 &&
          packet[i + 3] === 0x19 &&
          packet[i + 4] === 0xfa
        ) {
          foundKick = true;
          break;
        }
      }
      expect(foundKick).toBe(true);

      // Verify 0% GMV fee text is present
      const decoder = new TextDecoder();
      const text = decoder.decode(packet);
      expect(text).toContain('0% GMV PLATFORM FEE GUARANTEED');
      expect(text).toContain('INV-POS-998822');
      expect(text).toContain('Brembo Ceramic Front Brake Pads');
    });
  });

  describe('POS Offline Ticket Math & GST Slabs', () => {
    const testItems: PosCartItem[] = [
      {
        sku: 'ZR-BRK-001',
        title: 'Brembo Brake Pads',
        barcode: '8901234001015',
        hsnCode: '87083000',
        gstSlabPercent: 18,
        unitPricePaise: 100000, // Rs. 1000.00
        qty: 2, // Subtotal 2000.00, Tax @18% = 360.00
      },
      {
        sku: 'ZR-SUS-006',
        title: 'Bilstein Coilovers',
        barcode: '8901234001060',
        hsnCode: '87088000',
        gstSlabPercent: 28,
        unitPricePaise: 500000, // Rs. 5000.00
        qty: 1, // Subtotal 5000.00, Tax @28% = 1400.00
      },
    ];

    it('calculates intra-state ticket with equal CGST and SGST splits', () => {
      const totals = calculatePosTicketTotals(testItems, { isInterState: false });

      // Subtotal = 2000 + 5000 = 7000 (700000 paise)
      expect(totals.subtotalPaise).toBe(700000);

      // Total tax = 360 + 1400 = 1760 (176000 paise)
      // CGST = 88000 paise, SGST = 88000 paise, IGST = 0
      expect(totals.cgstPaise).toBe(88000);
      expect(totals.sgstPaise).toBe(88000);
      expect(totals.igstPaise).toBe(0);
      expect(totals.totalTaxPaise).toBe(176000);

      // Total due = 7000 + 1760 = 8760 (876000 paise)
      expect(totals.totalPaise).toBe(876000);

      // Invariant: platformFeeBps must be 0
      expect(totals.platformFeeBps).toBe(0);
      expect(totals.platformFeePaise).toBe(0);
    });

    it('calculates inter-state ticket with combined IGST', () => {
      const totals = calculatePosTicketTotals(testItems, { isInterState: true });

      expect(totals.subtotalPaise).toBe(700000);
      expect(totals.cgstPaise).toBe(0);
      expect(totals.sgstPaise).toBe(0);
      expect(totals.igstPaise).toBe(176000);
      expect(totals.totalTaxPaise).toBe(176000);
      expect(totals.totalPaise).toBe(876000);
      expect(totals.platformFeeBps).toBe(0);
    });
  });
});
