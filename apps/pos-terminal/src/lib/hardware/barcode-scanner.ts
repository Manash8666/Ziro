import type { BarcodeScannerScanEvent } from '@ziro/shared-types';

export interface BarcodeScannerListenerOptions {
  maxInterKeyMs?: number;
  minBarcodeLength?: number;
}

export type ScanEventHandler = (event: BarcodeScannerScanEvent) => void;

export class HardwareBarcodeScannerListener {
  private maxInterKeyMs: number;
  private minBarcodeLength: number;
  private buffer: string[] = [];
  private lastKeyTimestamp = 0;
  private startTime = 0;
  private handlers = new Map<string, ScanEventHandler[]>();

  constructor(options?: BarcodeScannerListenerOptions) {
    this.maxInterKeyMs = options?.maxInterKeyMs ?? 30;
    this.minBarcodeLength = options?.minBarcodeLength ?? 3;
  }

  on(event: 'scan', handler: ScanEventHandler): void {
    const list = this.handlers.get(event) ?? [];
    list.push(handler);
    this.handlers.set(event, list);
  }

  handleKeyEvent(event: { key: string; timestamp?: number }): void {
    const now = event.timestamp ?? Date.now();
    const key = event.key;

    if (key === 'Enter') {
      const barcode = this.buffer.join('').trim();
      const duration = now - this.startTime;

      if (barcode.length >= this.minBarcodeLength) {
        const scanEvent: BarcodeScannerScanEvent = {
          barcode,
          symbology: barcode.length === 13 ? 'EAN13' : 'CODE128',
          duration_ms: duration,
          timestamp: now,
        };

        const scanHandlers = this.handlers.get('scan') ?? [];
        for (const handler of scanHandlers) {
          handler(scanEvent);
        }
      }

      this.buffer = [];
      this.lastKeyTimestamp = 0;
      this.startTime = 0;
      return;
    }

    // Printable single character check
    if (key.length === 1) {
      if (this.buffer.length === 0) {
        this.startTime = now;
        this.buffer.push(key);
      } else {
        const delta = now - this.lastKeyTimestamp;
        if (delta <= this.maxInterKeyMs) {
          this.buffer.push(key);
        } else {
          // Exceeded inter-key time: reset buffer to start new input (human typing)
          this.startTime = now;
          this.buffer = [key];
        }
      }
      this.lastKeyTimestamp = now;
    }
  }
}
