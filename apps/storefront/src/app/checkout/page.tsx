'use client';

import Link from 'next/link';
import { ZiroWordmark } from '@ziro/ui-kit';
import { CheckoutForm } from '../../components/CheckoutForm';

export default function CheckoutPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <header className="flex items-center justify-between border-b border-[#1F2633] pb-4">
        <ZiroWordmark />
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/" className="text-[#8B95A5] hover:text-[#F4F6F9]">Storefront</Link>
          <Link href="/configure" className="text-[#8B95A5] hover:text-[#F4F6F9]">3D Configurator</Link>
          <Link href="/checkout" className="text-[#00E599] font-medium">Checkout</Link>
        </nav>
      </header>
      <CheckoutForm />
    </main>
  );
}
