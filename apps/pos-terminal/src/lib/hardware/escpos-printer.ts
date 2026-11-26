import type { EscPosReceiptRequest } from '@ziro/shared-types';
import { CashDrawerController } from './cash-drawer.js';

export class EscPosPrinterDriver {
  private textEncoder = new TextEncoder();

  private concat(arrays: Uint8Array[]): Uint8Array {
    const totalLen = arrays.reduce((acc, a) => acc + a.length, 0);
    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }
    return result;
  }

  private str(text: string): Uint8Array {
    return this.textEncoder.encode(text);
  }

  private align(mode: 'left' | 'center' | 'right'): Uint8Array {
    const code = mode === 'center' ? 0x01 : mode === 'right' ? 0x02 : 0x00;
    return new Uint8Array([0x1b, 0x61, code]);
  }

  private bold(enable: boolean): Uint8Array {
    return new Uint8Array([0x1b, 0x45, enable ? 0x01 : 0x00]);
  }

  private divider(width: number): Uint8Array {
    return this.str('-'.repeat(width) + '\n');
  }

  buildReceipt(req: EscPosReceiptRequest): Uint8Array {
    const chunks: Uint8Array[] = [];
    const colWidth = req.paper_width === 58 ? 32 : 48;

    // 1. Initialize printer
    chunks.push(new Uint8Array([0x1b, 0x40]));

    // 2. Open Cash Drawer if requested
    if (req.open_cash_drawer) {
      chunks.push(CashDrawerController.getKickCommand(2));
    }

    // 3. Header
    chunks.push(this.align('center'));
    chunks.push(this.bold(true));
    chunks.push(this.str(`${req.store_name}\n`));
    chunks.push(this.bold(false));

    if (req.gstin) {
      chunks.push(this.str(`GSTIN: ${req.gstin}\n`));
    }
    chunks.push(this.str(`Invoice: ${req.invoice_no}\n`));
    chunks.push(this.str(`Date: ${req.date}\n`));
    if (req.cashier_name) {
      chunks.push(this.str(`Cashier: ${req.cashier_name}\n`));
    }

    // 4. Items Table
    chunks.push(this.align('left'));
    chunks.push(this.divider(colWidth));

    for (const item of req.items) {
      const priceFormatted = (item.total_minor / 100).toFixed(2);
      const qtyStr = `${item.qty}x ${(item.unit_price_minor / 100).toFixed(2)}`;
      chunks.push(this.bold(true));
      chunks.push(this.str(`${item.name}\n`));
      chunks.push(this.bold(false));

      // Right align price
      const spaces = Math.max(1, colWidth - qtyStr.length - priceFormatted.length);
      chunks.push(this.str(`${qtyStr}${' '.repeat(spaces)}${priceFormatted}\n`));
    }

    chunks.push(this.divider(colWidth));

    // 5. Tax Breakdown
    const subtotalFormatted = (req.subtotal_minor / 100).toFixed(2);
    const subLabel = 'Subtotal:';
    const subSpaces = Math.max(1, colWidth - subLabel.length - subtotalFormatted.length);
    chunks.push(this.str(`${subLabel}${' '.repeat(subSpaces)}${subtotalFormatted}\n`));

    for (const tax of req.tax_lines) {
      const taxLabel = `${tax.code} (${tax.rate_pct}%):`;
      const taxAmount = (tax.amount_minor / 100).toFixed(2);
      const spaces = Math.max(1, colWidth - taxLabel.length - taxAmount.length);
      chunks.push(this.str(`${taxLabel}${' '.repeat(spaces)}${taxAmount}\n`));
    }

    chunks.push(this.divider(colWidth));

    // 6. Total
    const totalFormatted = (req.total_minor / 100).toFixed(2);
    const totalLabel = `TOTAL (${req.tender_type}):`;
    const totalSpaces = Math.max(1, colWidth - totalLabel.length - totalFormatted.length);
    chunks.push(this.bold(true));
    chunks.push(this.str(`${totalLabel}${' '.repeat(totalSpaces)}${totalFormatted}\n`));
    chunks.push(this.bold(false));

    chunks.push(this.divider(colWidth));

    // 7. QR / Barcode placeholders
    if (req.qr_payload) {
      chunks.push(this.align('center'));
      chunks.push(this.str(`[UPI QR: ${req.qr_payload}]\n`));
    }
    if (req.barcode_payload) {
      chunks.push(this.align('center'));
      chunks.push(this.str(`*${req.barcode_payload}*\n`));
    }

    chunks.push(this.align('center'));
    chunks.push(this.str('Thank You For Shopping With Ziro!\n\n\n'));

    // 8. Cut Paper
    if (req.cut_paper) {
      chunks.push(new Uint8Array([0x1d, 0x56, 0x41, 0x03]));
    }

    return this.concat(chunks);
  }
}
