import crypto from 'node:crypto';
import { InMemoryNet30CreditStore } from '../providers/net30-provider.js';
import { FitmentBomService } from '../fitment/fitment-bom.service.js';

export type B2bQuoteStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface B2bQuoteRecord {
  quote_id: string;
  tenant_id: string;
  account_id: string;
  currency_code: string;
  items: Array<{ sku: string; quantity: number; unit_price_minor: number; selected_optional_skus?: string[] }>;
  total_minor: number;
  status: B2bQuoteStatus;
  order_id?: string;
  created_at: string;
}

export class InMemoryB2bStore {
  private quotes = new Map<string, B2bQuoteRecord>();

  saveQuote(quote: B2bQuoteRecord): void {
    this.quotes.set(quote.quote_id, { ...quote, items: quote.items.map((i) => ({ ...i })) });
  }

  getQuote(quoteId: string): B2bQuoteRecord | undefined {
    const q = this.quotes.get(quoteId);
    return q ? { ...q, items: q.items.map((i) => ({ ...i })) } : undefined;
  }

  updateQuoteStatus(quoteId: string, status: B2bQuoteStatus, orderId?: string): void {
    const q = this.quotes.get(quoteId);
    if (q) {
      q.status = status;
      if (orderId) q.order_id = orderId;
    }
  }
}

export interface B2bWholesaleServiceOptions {
  b2bStore?: InMemoryB2bStore;
  creditStore: InMemoryNet30CreditStore;
  fitmentBomService: FitmentBomService;
}

export interface CreateQuoteInput {
  tenant_id: string;
  account_id: string;
  currency_code?: string;
  items: Array<{ sku: string; quantity: number; unit_price_minor: number; selected_optional_skus?: string[] }>;
}

export class B2bWholesaleService {
  private static instances = new Map<string, B2bWholesaleService>();

  public static getInstance(id: string): B2bWholesaleService | undefined {
    return B2bWholesaleService.instances.get(id);
  }

  public readonly service_id: string;
  public readonly b2bStore: InMemoryB2bStore;
  public readonly creditStore: InMemoryNet30CreditStore;
  public readonly fitmentBomService: FitmentBomService;

  constructor(options: B2bWholesaleServiceOptions) {
    this.service_id = crypto.randomUUID();
    this.b2bStore = options.b2bStore ?? new InMemoryB2bStore();
    this.creditStore = options.creditStore;
    this.fitmentBomService = options.fitmentBomService;
    B2bWholesaleService.instances.set(this.service_id, this);
  }

  async createQuote(input: CreateQuoteInput): Promise<B2bQuoteRecord> {
    const quoteId = `qt_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const totalMinor = input.items.reduce(
      (sum, item) => sum + item.unit_price_minor * item.quantity,
      0,
    );

    const record: B2bQuoteRecord = {
      quote_id: quoteId,
      tenant_id: input.tenant_id,
      account_id: input.account_id,
      currency_code: input.currency_code ?? 'INR',
      items: input.items.map((i) => ({ ...i })),
      total_minor: totalMinor,
      status: 'SUBMITTED',
      created_at: new Date().toISOString(),
    };

    this.b2bStore.saveQuote(record);
    return record;
  }

  async reserveQuoteCredit(tenantId: string, quoteId: string): Promise<{
    quote_id: string;
    account_id: string;
    amount_minor: number;
    tenant_id: string;
  }> {
    const quote = this.b2bStore.getQuote(quoteId);
    if (!quote || quote.tenant_id !== tenantId) {
      throw new Error(`Quote '${quoteId}' not found for tenant '${tenantId}'`);
    }
    if (quote.status !== 'SUBMITTED') {
      throw new Error(`Quote '${quoteId}' is not in SUBMITTED status (current: ${quote.status})`);
    }

    const account = this.creditStore.getAccount(quote.account_id);
    if (!account) {
      throw new Error(`B2B account '${quote.account_id}' not found`);
    }
    if (account.status !== 'ACTIVE') {
      throw new Error(`B2B account '${quote.account_id}' is not ACTIVE (${account.status})`);
    }

    const available = account.credit_limit_minor - account.credit_used_minor;
    if (quote.total_minor > available) {
      throw new Error(
        `Insufficient credit: quote requires ${quote.total_minor}, available is ${available}`,
      );
    }

    this.creditStore.updateCreditUsed(
      account.account_id,
      account.credit_used_minor + quote.total_minor,
    );

    return {
      quote_id: quote.quote_id,
      account_id: account.account_id,
      amount_minor: quote.total_minor,
      tenant_id: quote.tenant_id,
    };
  }

  async releaseQuoteCredit(accountId: string, amountMinor: number): Promise<void> {
    const account = this.creditStore.getAccount(accountId);
    if (account) {
      this.creditStore.updateCreditUsed(
        accountId,
        Math.max(0, account.credit_used_minor - amountMinor),
      );
    }
  }

  async allocateQuoteInventory(
    tenantId: string,
    quoteId: string,
  ): Promise<Array<{ sku: string; delta: number }>> {
    const quote = this.b2bStore.getQuote(quoteId);
    if (!quote) {
      throw new Error(`Quote '${quoteId}' not found`);
    }
    return this.fitmentBomService.deductBomStock(
      tenantId,
      quote.items.map((i) => ({
        sku: i.sku,
        quantity: i.quantity,
        selected_optional_skus: i.selected_optional_skus,
      })),
    );
  }

  async restoreQuoteInventory(
    tenantId: string,
    deductions: Array<{ sku: string; delta: number }>,
  ): Promise<void> {
    await this.fitmentBomService.restoreBomStock(tenantId, deductions);
  }

  async emitNet30Order(
    tenantId: string,
    quoteId: string,
    simulateFailure?: boolean,
  ): Promise<{ order_id: string; quote_id: string; status: B2bQuoteStatus }> {
    if (simulateFailure) {
      throw new Error('Simulated Net-30 order emission failure');
    }
    const quote = this.b2bStore.getQuote(quoteId);
    if (!quote || quote.tenant_id !== tenantId) {
      throw new Error(`Quote '${quoteId}' not found`);
    }
    const orderId = `ord_b2b_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    this.b2bStore.updateQuoteStatus(quoteId, 'APPROVED', orderId);
    return {
      order_id: orderId,
      quote_id: quoteId,
      status: 'APPROVED',
    };
  }
}
