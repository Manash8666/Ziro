'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { validateGstin } from '@ziro/shared-types';
import { ZiroButton, formatMinorCurrency } from '@ziro/ui-kit';
import { useCartStore } from '../store/cart';

export const CheckoutFormSchema = z
  .object({
    fullName: z.string().min(2),
    email: z.string().email(),
    countryCode: z.string().length(2),
    stateCode: z.string().optional(),
    postalCode: z.string().min(3),
    line1: z.string().min(3),
    paymentMode: z.enum(['UPI_INTENT', 'CARD', 'COD', 'NET30']),
    gstin: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.gstin && val.gstin.trim().length > 0) {
      const check = validateGstin(val.gstin.trim().toUpperCase());
      if (!check.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['gstin'],
          message: check.error ?? 'Invalid Indian GSTIN checksum',
        });
      }
    }
  });

export type CheckoutFormValues = z.infer<typeof CheckoutFormSchema>;

export function CheckoutForm() {
  const { items, upiNudgeDiscountInr, setUpiNudgeDiscountInr, clear } = useCartStore();
  const [submittedOrder, setSubmittedOrder] = useState<string | null>(null);

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(CheckoutFormSchema),
    defaultValues: {
      fullName: '',
      email: '',
      countryCode: 'IN',
      stateCode: '29',
      postalCode: '560001',
      line1: '',
      paymentMode: 'UPI_INTENT',
      gstin: '',
    },
  });

  const paymentMode = form.watch('paymentMode');
  const subtotalMinor = items.reduce((sum, i) => sum + i.unitPriceMinor * i.qty, 0);
  const effectiveMinor = Math.max(0, subtotalMinor - upiNudgeDiscountInr * 100);

  const onSubmit = (values: CheckoutFormValues) => {
    setSubmittedOrder(
      `Order confirmed via ${values.paymentMode} (${values.countryCode}) — 0% GMV platform fee`,
    );
    clear();
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="rounded-lg border border-[#1F2633] bg-[#12161E] p-6 space-y-5"
    >
      <h1 className="text-xl font-semibold text-[#F4F6F9]">Unified Checkout (0% GMV Tax)</h1>

      {paymentMode === 'COD' && (
        <div className="rounded-lg border border-[#F59E0B]/40 bg-[#090B0E] p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-[#F59E0B]">
            Ziro Pulse RTO Shield: Switch from COD to instant UPI Intent and save ₹75.00!
          </div>
          <ZiroButton
            type="button"
            variant="primary"
            onClick={() => {
              form.setValue('paymentMode', 'UPI_INTENT');
              setUpiNudgeDiscountInr(75);
            }}
          >
            Switch to UPI (-₹75)
          </ZiroButton>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="space-y-1 text-sm">
          <span className="text-[#8B95A5]">Full Name</span>
          <input
            {...form.register('fullName')}
            className="w-full rounded border border-[#1F2633] bg-[#090B0E] px-3 py-2"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-[#8B95A5]">Email</span>
          <input
            {...form.register('email')}
            className="w-full rounded border border-[#1F2633] bg-[#090B0E] px-3 py-2"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-[#8B95A5]">Country (IN / GB / US / AE)</span>
          <input
            {...form.register('countryCode')}
            className="w-full rounded border border-[#1F2633] bg-[#090B0E] px-3 py-2 font-mono uppercase"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-[#8B95A5]">Postal / PIN Code</span>
          <input
            {...form.register('postalCode')}
            className="w-full rounded border border-[#1F2633] bg-[#090B0E] px-3 py-2 font-mono"
          />
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="text-[#8B95A5]">Street Address</span>
          <input
            {...form.register('line1')}
            className="w-full rounded border border-[#1F2633] bg-[#090B0E] px-3 py-2"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-[#8B95A5]">B2B GSTIN (Optional, Mod-36 Verified)</span>
          <input
            {...form.register('gstin')}
            placeholder="29ABCDE1234F1ZW"
            className="w-full rounded border border-[#1F2633] bg-[#090B0E] px-3 py-2 font-mono uppercase"
          />
          {form.formState.errors.gstin && (
            <span className="text-xs text-[#F59E0B]">{form.formState.errors.gstin.message}</span>
          )}
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-[#8B95A5]">Payment Method</span>
          <select
            {...form.register('paymentMode')}
            className="w-full rounded border border-[#1F2633] bg-[#090B0E] px-3 py-2"
          >
            <option value="UPI_INTENT">Razorpay UPI Intent</option>
            <option value="CARD">Stripe / Card</option>
            <option value="COD">Cash on Delivery (RTO Screened)</option>
            <option value="NET30">B2B Net-30 Credit</option>
          </select>
        </label>
      </div>

      <div className="border-t border-[#1F2633] pt-4 flex items-center justify-between">
        <div className="font-mono text-sm">
          Payable: <span className="text-[#00E599]">{formatMinorCurrency(effectiveMinor, 'INR')}</span>
        </div>
        <ZiroButton type="submit" variant="primary">
          Complete Order
        </ZiroButton>
      </div>

      {submittedOrder && (
        <p className="text-sm font-mono text-[#00E599]">{submittedOrder}</p>
      )}
    </form>
  );
}
