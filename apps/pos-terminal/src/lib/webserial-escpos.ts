export interface PosReceiptItem {
  sku: string;
  title: string;
  qty: number;
  unitPricePaise: number;
  totalPaise: number;
  hsnCode?: string;
  gstPercent?: number;
}

export interface PosReceiptPayload {
  storeName: string;
  invoiceNo: string;
  cashierName?: string;
  terminalId: string;
  dateIso?: string;
  items: PosReceiptItem[];
  subtotalPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalTaxPaise: number;
  totalPaise: number;
  paymentMode: 'CASH' | 'UPI' | 'CARD' | 'B2B_CREDIT';
  platformFeeBps: 0; // Invariant
  openCashDrawer?: boolean;
  paperWidthMm?: 58 | 80;
}

/**
 * Standard ESC/POS Cash Drawer Kick Command:
 * ESC p m t1 t2
 * 0x1B, 0x70, 0x00 (pin 2), 0x19 (25 * 2ms pulse on), 0xFA (250 * 2ms pulse off)
 */
export function encodeCashDrawerKickPulse(): Uint8Array {
  return new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]);
}

/**
 * Encodes a complete thermal receipt packet into ESC/POS binary format.
 */
export function encodeEscPosReceiptPacket(receipt: PosReceiptPayload): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];

  const str = (text: string) => encoder.encode(text);
  const align = (mode: 'left' | 'center' | 'right') => {
    const code = mode === 'center' ? 0x01 : mode === 'right' ? 0x02 : 0x00;
    return new Uint8Array([0x1b, 0x61, code]);
  };
  const bold = (enable: boolean) => new Uint8Array([0x1b, 0x45, enable ? 0x01 : 0x00]);
  const divider = (width: number) => str('-'.repeat(width) + '\n');

  const colWidth = receipt.paperWidthMm === 58 ? 32 : 48;

  // 1. Initialize printer
  chunks.push(new Uint8Array([0x1b, 0x40]));

  // 2. Open Cash Drawer if requested
  if (receipt.openCashDrawer) {
    chunks.push(encodeCashDrawerKickPulse());
  }

  // 3. Header
  chunks.push(align('center'));
  chunks.push(bold(true));
  chunks.push(str(`${receipt.storeName}\n`));
  chunks.push(bold(false));
  chunks.push(str(`INVOICE: ${receipt.invoiceNo}\n`));
  chunks.push(str(`TERMINAL: ${receipt.terminalId}\n`));
  if (receipt.cashierName) {
    chunks.push(str(`CASHIER: ${receipt.cashierName}\n`));
  }
  const dateStr = receipt.dateIso ? new Date(receipt.dateIso).toLocaleString('en-IN') : new Date().toLocaleString('en-IN');
  chunks.push(str(`DATE: ${dateStr}\n`));
  chunks.push(divider(colWidth));

  // 4. Line Items
  chunks.push(align('left'));
  for (const item of receipt.items) {
    const unitPrice = (item.unitPricePaise / 100).toFixed(2);
    const lineTotal = (item.totalPaise / 100).toFixed(2);
    chunks.push(bold(true));
    chunks.push(str(`${item.title}\n`));
    chunks.push(bold(false));
    chunks.push(str(`  ${item.qty} x Rs.${unitPrice} [HSN ${item.hsnCode || 'N/A'}] = Rs.${lineTotal}\n`));
  }
  chunks.push(divider(colWidth));

  // 5. Totals & Tax Breakdown
  const subtotal = (receipt.subtotalPaise / 100).toFixed(2);
  chunks.push(str(`Subtotal: Rs.${subtotal}\n`));

  if (receipt.cgstPaise > 0) {
    chunks.push(str(`CGST: Rs.${(receipt.cgstPaise / 100).toFixed(2)}\n`));
  }
  if (receipt.sgstPaise > 0) {
    chunks.push(str(`SGST: Rs.${(receipt.sgstPaise / 100).toFixed(2)}\n`));
  }
  if (receipt.igstPaise > 0) {
    chunks.push(str(`IGST: Rs.${(receipt.igstPaise / 100).toFixed(2)}\n`));
  }

  chunks.push(divider(colWidth));
  chunks.push(bold(true));
  chunks.push(str(`TOTAL: Rs.${(receipt.totalPaise / 100).toFixed(2)}\n`));
  chunks.push(str(`PAYMENT: ${receipt.paymentMode}\n`));
  chunks.push(bold(false));

  // 6. Invariant Guarantee
  chunks.push(divider(colWidth));
  chunks.push(align('center'));
  chunks.push(str('0% GMV PLATFORM FEE GUARANTEED\n'));
  chunks.push(str('POWERED BY ZIRO COMMERCE OS\n'));

  // 7. Feed 4 lines & partial cut
  chunks.push(new Uint8Array([0x1b, 0x64, 0x04]));
  chunks.push(new Uint8Array([0x1d, 0x56, 0x42, 0x00]));

  // Concatenate all chunks
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const out = new Uint8Array(totalLength);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/**
 * Browser WebSerial driver for thermal receipt printers and cash drawer solenoids.
 */
export class EscPosWebSerialDriver {
  private port: any = null;
  private writer: any = null;

  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  async connect(): Promise<boolean> {
    if (!EscPosWebSerialDriver.isSupported()) {
      return false;
    }

    try {
      // @ts-expect-error WebSerial API
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: 9600 });
      this.writer = this.port.writable.getWriter();
      return true;
    } catch {
      return false;
    }
  }

  async printReceipt(receipt: PosReceiptPayload): Promise<boolean> {
    const packet = encodeEscPosReceiptPacket(receipt);
    if (!this.writer) {
      return false;
    }
    try {
      await this.writer.write(packet);
      return true;
    } catch {
      return false;
    }
  }

  async kickCashDrawer(): Promise<boolean> {
    const pulse = encodeCashDrawerKickPulse();
    if (!this.writer) {
      return false;
    }
    try {
      await this.writer.write(pulse);
      return true;
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.writer) {
        await this.writer.close();
        this.writer = null;
      }
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
    } catch {
      // Ignore disconnect errors
    }
  }
}
