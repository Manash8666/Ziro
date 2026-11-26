import crypto from 'node:crypto';
import { AbstractPaymentProvider, PaymentActions, PaymentSessionStatus } from '@medusajs/framework/utils';
import { ZIRO_PLATFORM_FEE_BPS } from '@ziro/shared-types';

export interface Net30AccountRecord {
  account_id: string;
  tenant_id: string;
  company_name: string;
  tax_id: string;
  tax_id_type: 'GSTIN' | 'EIN' | 'VAT';
  credit_limit_minor: number;
  credit_used_minor: number;
  net_terms_days: number;
  status: 'ACTIVE' | 'ON_HOLD' | 'SUSPENDED';
}

export class InMemoryNet30CreditStore {
  private accounts = new Map<string, Net30AccountRecord>();

  constructor(initialAccounts?: Net30AccountRecord[]) {
    if (initialAccounts) {
      for (const acc of initialAccounts) {
        this.accounts.set(acc.account_id, { ...acc });
      }
    }
  }

  getAccount(accountId: string): Net30AccountRecord | undefined {
    return this.accounts.get(accountId);
  }

  setAccount(account: Net30AccountRecord): void {
    this.accounts.set(account.account_id, { ...account });
  }

  updateCreditUsed(accountId: string, newUsedMinor: number): void {
    const acc = this.accounts.get(accountId);
    if (acc) {
      acc.credit_used_minor = newUsedMinor;
    }
  }
}

export interface ZiroNet30Options {
  creditStore: InMemoryNet30CreditStore;
}

export interface Net30PaymentInput {
  amount: number;
  currency_code: string;
  data?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export class ZiroNet30Provider extends AbstractPaymentProvider<ZiroNet30Options> {
  static identifier = 'ziro-net30';
  protected creditStore: InMemoryNet30CreditStore;

  constructor(
    containerOrOptions?: Record<string, unknown> | ZiroNet30Options,
    maybeOptions?: ZiroNet30Options,
  ) {
    const options = (maybeOptions ?? containerOrOptions ?? {}) as ZiroNet30Options;
    const container = maybeOptions ? (containerOrOptions as Record<string, unknown>) : {};
    super(container, options);
    this.creditStore = options.creditStore ?? new InMemoryNet30CreditStore();
  }

  private assertIntegerMinorUnits(amount: number): void {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new Error(`Amount must be a non-negative integer in minor units (received: ${amount})`);
    }
  }

  async initiatePayment(input: Net30PaymentInput): Promise<{ id: string; data: Record<string, unknown> }> {
    this.assertIntegerMinorUnits(input.amount);
    const id = `net30_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    return {
      id,
      data: {
        ...input.data,
        id,
        amount_minor: input.amount,
        currency_code: (input.currency_code || 'INR').toUpperCase(),
        platform_fee_bps: ZIRO_PLATFORM_FEE_BPS,
        status: 'pending',
      },
    };
  }

  async authorizePayment(
    paymentSessionData: { data?: Record<string, unknown> },
  ): Promise<{ status: PaymentSessionStatus; data: Record<string, unknown> }> {
    const data = paymentSessionData.data ?? {};
    const accountId = typeof data.account_id === 'string' ? data.account_id : '';
    const amountMinor = typeof data.amount_minor === 'number' ? data.amount_minor : 0;

    this.assertIntegerMinorUnits(amountMinor);

    const account = this.creditStore.getAccount(accountId);
    if (!account) {
      throw new Error(`B2B Net-30 account '${accountId}' not found`);
    }

    if (account.status !== 'ACTIVE') {
      throw new Error(`B2B account '${accountId}' is not active (status: ${account.status})`);
    }

    const availableCredit = account.credit_limit_minor - account.credit_used_minor;
    if (amountMinor > availableCredit) {
      throw new Error(
        `Insufficient B2B credit for account '${accountId}': requested ${amountMinor} exceeds available credit ${availableCredit}`,
      );
    }

    this.creditStore.updateCreditUsed(accountId, account.credit_used_minor + amountMinor);

    return {
      status: PaymentSessionStatus.AUTHORIZED,
      data: {
        ...data,
        status: 'authorized',
        platform_fee_bps: ZIRO_PLATFORM_FEE_BPS,
      },
    };
  }

  async capturePayment(
    paymentSessionData: { data?: Record<string, unknown> },
  ): Promise<{ data: Record<string, unknown> }> {
    return {
      data: {
        ...paymentSessionData.data,
        status: 'captured',
        platform_fee_bps: ZIRO_PLATFORM_FEE_BPS,
      },
    };
  }

  async cancelPayment(
    paymentSessionData: { data?: Record<string, unknown> },
  ): Promise<{ data: Record<string, unknown> }> {
    const data = paymentSessionData.data ?? {};
    const accountId = typeof data.account_id === 'string' ? data.account_id : '';
    const amountMinor = typeof data.amount_minor === 'number' ? data.amount_minor : 0;

    if (data.status === 'authorized' && accountId && amountMinor > 0) {
      const account = this.creditStore.getAccount(accountId);
      if (account) {
        this.creditStore.updateCreditUsed(
          accountId,
          Math.max(0, account.credit_used_minor - amountMinor),
        );
      }
    }

    return {
      data: {
        ...data,
        status: 'canceled',
        platform_fee_bps: ZIRO_PLATFORM_FEE_BPS,
      },
    };
  }

  async refundPayment(
    paymentSessionData: { data?: Record<string, unknown>; amount?: any },
  ): Promise<{ data: Record<string, unknown> }> {
    const data = paymentSessionData.data ?? {};
    const accountId = typeof data.account_id === 'string' ? data.account_id : '';
    const refundAmount =
      paymentSessionData.amount !== undefined
        ? Number(paymentSessionData.amount)
        : typeof data.amount_minor === 'number'
          ? data.amount_minor
          : 0;

    if (accountId && refundAmount > 0) {
      const account = this.creditStore.getAccount(accountId);
      if (account) {
        this.creditStore.updateCreditUsed(
          accountId,
          Math.max(0, account.credit_used_minor - refundAmount),
        );
      }
    }

    return {
      data: {
        ...data,
        status: 'refunded',
        refund_amount_minor: refundAmount,
        platform_fee_bps: ZIRO_PLATFORM_FEE_BPS,
      },
    };
  }

  async retrievePayment(
    paymentSessionData: { data?: Record<string, unknown> },
  ): Promise<Record<string, unknown>> {
    return paymentSessionData.data ?? {};
  }

  async updatePayment(input: Net30PaymentInput): Promise<{ data: Record<string, unknown> }> {
    this.assertIntegerMinorUnits(input.amount);
    return {
      data: {
        ...input.data,
        amount_minor: input.amount,
        currency_code: (input.currency_code || 'INR').toUpperCase(),
        platform_fee_bps: ZIRO_PLATFORM_FEE_BPS,
      },
    };
  }

  async deletePayment(
    _paymentSessionData: { data?: Record<string, unknown> },
  ): Promise<Record<string, unknown>> {
    return {};
  }

  async getPaymentStatus(
    paymentSessionData: { data?: Record<string, unknown> },
  ): Promise<{ status: PaymentSessionStatus; data?: Record<string, unknown> }> {
    const status = paymentSessionData.data?.status;
    if (status === 'captured') return { status: PaymentSessionStatus.CAPTURED, data: paymentSessionData.data };
    if (status === 'authorized') return { status: PaymentSessionStatus.AUTHORIZED, data: paymentSessionData.data };
    if (status === 'canceled') return { status: PaymentSessionStatus.CANCELED, data: paymentSessionData.data };
    return { status: PaymentSessionStatus.PENDING, data: paymentSessionData.data };
  }

  async getWebhookActionAndData(): Promise<{ action: PaymentActions }> {
    return { action: PaymentActions.NOT_SUPPORTED };
  }
}
