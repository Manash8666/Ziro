import crypto from 'node:crypto';
import Stripe from 'stripe';
import { AbstractPaymentProvider, PaymentActions, PaymentSessionStatus } from '@medusajs/framework/utils';
import { ZIRO_PLATFORM_FEE_BPS } from '@ziro/shared-types';
import { verifyStripeWebhook } from './webhook-verifier.js';

export interface ZiroStripeOptions {
  api_key: string;
  webhook_secret?: string;
  sandbox?: boolean;
}

export interface StripePaymentInput {
  amount: number;
  currency_code: string;
  data?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export class ZiroStripeProvider extends AbstractPaymentProvider<ZiroStripeOptions> {
  static identifier = 'ziro-stripe';
  protected options: ZiroStripeOptions;
  protected client: Stripe | null = null;

  constructor(
    containerOrOptions?: Record<string, unknown> | ZiroStripeOptions,
    maybeOptions?: ZiroStripeOptions,
  ) {
    const options = (maybeOptions ?? containerOrOptions ?? {}) as ZiroStripeOptions;
    const container = maybeOptions ? (containerOrOptions as Record<string, unknown>) : {};
    super(container, options);
    this.options = options;

    if (options.api_key && !this.isSandbox()) {
      this.client = new Stripe(options.api_key);
    }
  }

  private isSandbox(): boolean {
    if (this.options.sandbox === true) return true;
    return !this.options.api_key || this.options.api_key.startsWith('sk_test_');
  }

  private assertIntegerMinorUnits(amount: number): void {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new Error(`Amount must be a non-negative integer in minor units (received: ${amount})`);
    }
  }

  async initiatePayment(input: StripePaymentInput): Promise<{ id: string; data: Record<string, unknown> }> {
    this.assertIntegerMinorUnits(input.amount);
    const currency = (input.currency_code || 'USD').toUpperCase();
    const id = `pi_ziro_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const mode = this.isSandbox() ? 'sandbox' : 'live';

    if (this.client && mode === 'live') {
      const pi = await this.client.paymentIntents.create({
        amount: input.amount,
        currency: currency.toLowerCase(),
        capture_method: input.data?.capture_method === 'manual' ? 'manual' : 'automatic',
      });
      return {
        id: pi.id,
        data: {
          ...input.data,
          id: pi.id,
          amount_minor: input.amount,
          currency_code: currency,
          platform_fee_bps: ZIRO_PLATFORM_FEE_BPS,
          mode,
          status: pi.status,
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
        status: 'requires_confirmation',
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
        status: 'requires_capture',
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
        status: 'succeeded',
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

  async updatePayment(input: StripePaymentInput): Promise<{ data: Record<string, unknown> }> {
    this.assertIntegerMinorUnits(input.amount);
    return {
      data: {
        ...input.data,
        amount_minor: input.amount,
        currency_code: (input.currency_code || 'USD').toUpperCase(),
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
    if (status === 'succeeded') return { status: PaymentSessionStatus.CAPTURED, data: paymentSessionData.data };
    if (status === 'requires_capture') return { status: PaymentSessionStatus.AUTHORIZED, data: paymentSessionData.data };
    if (status === 'canceled') return { status: PaymentSessionStatus.CANCELED, data: paymentSessionData.data };
    return { status: PaymentSessionStatus.PENDING, data: paymentSessionData.data };
  }

  async getWebhookActionAndData(payload: {
    data: Record<string, unknown>;
    rawData: string | Buffer;
    headers: Record<string, unknown>;
  }): Promise<{ action: PaymentActions; data?: { session_id: string; amount: number } }> {
    const sig = String(payload.headers['stripe-signature'] ?? '');
    const secret = this.options.webhook_secret ?? '';
    if (!verifyStripeWebhook(payload.rawData, sig, secret)) {
      return { action: PaymentActions.NOT_SUPPORTED };
    }
    const type = String(payload.data?.type ?? '');
    if (type === 'payment_intent.succeeded') {
      return { action: PaymentActions.SUCCESSFUL };
    }
    if (type === 'payment_intent.amount_capturable_updated') {
      return { action: PaymentActions.AUTHORIZED };
    }
    return { action: PaymentActions.NOT_SUPPORTED };
  }
}
