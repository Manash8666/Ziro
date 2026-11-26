import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { AbstractPaymentProvider, PaymentActions, PaymentSessionStatus } from '@medusajs/framework/utils';
import { ZIRO_PLATFORM_FEE_BPS } from '@ziro/shared-types';
import { verifyRazorpayWebhook } from './webhook-verifier.js';

export interface ZiroRazorpayOptions {
  key_id: string;
  key_secret: string;
  webhook_secret?: string;
  sandbox?: boolean;
}

export interface PaymentInput {
  amount: number;
  currency_code: string;
  data?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export class ZiroRazorpayProvider extends AbstractPaymentProvider<ZiroRazorpayOptions> {
  static identifier = 'ziro-razorpay';
  protected options: ZiroRazorpayOptions;
  protected client: Razorpay | null = null;

  constructor(
    containerOrOptions?: Record<string, unknown> | ZiroRazorpayOptions,
    maybeOptions?: ZiroRazorpayOptions,
  ) {
    const options = (maybeOptions ?? containerOrOptions ?? {}) as ZiroRazorpayOptions;
    const container = maybeOptions ? (containerOrOptions as Record<string, unknown>) : {};
    super(container, options);
    this.options = options;

    if (options.key_id && options.key_secret && !this.isSandbox()) {
      this.client = new Razorpay({
        key_id: options.key_id,
        key_secret: options.key_secret,
      });
    }
  }

  private isSandbox(): boolean {
    if (this.options.sandbox === true) return true;
    return !this.options.key_id || this.options.key_id.startsWith('rzp_test_');
  }

  private assertIntegerMinorUnits(amount: number): void {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new Error(`Amount must be a non-negative integer in minor units (received: ${amount})`);
    }
  }

  async initiatePayment(input: PaymentInput): Promise<{ id: string; data: Record<string, unknown> }> {
    this.assertIntegerMinorUnits(input.amount);
    const currency = (input.currency_code || 'INR').toUpperCase();
    const id = `order_rzp_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const mode = this.isSandbox() ? 'sandbox' : 'live';

    let upiIntent: Record<string, unknown> | undefined;
    if (input.data?.payment_method === 'upi_intent') {
      const amountDecimal = (input.amount / 100).toFixed(2);
      const vpa = typeof input.data.vpa === 'string' ? input.data.vpa : 'merchant@okaxis';
      const receipt = typeof input.data.receipt === 'string' ? input.data.receipt : id;
      upiIntent = {
        enabled: true,
        vpa,
        intent_uri: `upi://pay?pa=${encodeURIComponent(vpa)}&pn=ZiroMerchant&tr=${encodeURIComponent(receipt)}&am=${amountDecimal}&cu=${currency}`,
      };
    }

    if (this.client && mode === 'live') {
      const order = await this.client.orders.create({
        amount: input.amount,
        currency,
        receipt: typeof input.data?.receipt === 'string' ? input.data.receipt : id,
      });
      return {
        id: order.id,
        data: {
          ...input.data,
          id: order.id,
          amount_minor: input.amount,
          currency_code: currency,
          platform_fee_bps: ZIRO_PLATFORM_FEE_BPS,
          mode,
          status: 'created',
          ...(upiIntent ? { upi_intent: upiIntent } : {}),
        },
      };
    }

    return {
      id,
      data: {
        ...input.data,
        id,
        amount_minor: input.amount,
        currency_code: currency,
        platform_fee_bps: ZIRO_PLATFORM_FEE_BPS,
        mode,
        status: 'created',
        ...(upiIntent ? { upi_intent: upiIntent } : {}),
      },
    };
  }

  async authorizePayment(
    paymentSessionData: { data?: Record<string, unknown> },
  ): Promise<{ status: PaymentSessionStatus; data: Record<string, unknown> }> {
    return {
      status: PaymentSessionStatus.AUTHORIZED,
      data: {
        ...paymentSessionData.data,
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
    return {
      data: {
        ...paymentSessionData.data,
        status: 'canceled',
        platform_fee_bps: ZIRO_PLATFORM_FEE_BPS,
      },
    };
  }

  async refundPayment(
    paymentSessionData: { data?: Record<string, unknown>; amount?: any },
  ): Promise<{ data: Record<string, unknown> }> {
    const amountNum =
      paymentSessionData.amount !== undefined ? Number(paymentSessionData.amount) : undefined;
    if (amountNum !== undefined) {
      this.assertIntegerMinorUnits(amountNum);
    }
    return {
      data: {
        ...paymentSessionData.data,
        status: 'refunded',
        refund_amount_minor: amountNum ?? paymentSessionData.data?.amount_minor,
        platform_fee_bps: ZIRO_PLATFORM_FEE_BPS,
      },
    };
  }

  async retrievePayment(
    paymentSessionData: { data?: Record<string, unknown> },
  ): Promise<Record<string, unknown>> {
    return paymentSessionData.data ?? {};
  }

  async updatePayment(input: PaymentInput): Promise<{ data: Record<string, unknown> }> {
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

  async getWebhookActionAndData(payload: {
    data: Record<string, unknown>;
    rawData: string | Buffer;
    headers: Record<string, unknown>;
  }): Promise<{ action: PaymentActions; data?: { session_id: string; amount: number } }> {
    const sig = String(payload.headers['x-razorpay-signature'] ?? '');
    const secret = this.options.webhook_secret ?? '';
    if (!verifyRazorpayWebhook(payload.rawData, sig, secret)) {
      return { action: PaymentActions.NOT_SUPPORTED };
    }
    const event = String(payload.data?.event ?? '');
    if (event === 'payment.captured') {
      return { action: PaymentActions.SUCCESSFUL };
    }
    if (event === 'payment.authorized') {
      return { action: PaymentActions.AUTHORIZED };
    }
    return { action: PaymentActions.NOT_SUPPORTED };
  }
}
