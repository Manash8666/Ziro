import type { Metadata } from 'next';
import './globals.css';
import { SmoothScroll } from '../components/SmoothScroll';

export const metadata: Metadata = {
  title: 'Ziro Commerce OS — Zero-Tax D2C, B2B & Agentic Storefront',
  description: 'One unified ledger for online storefront, B2B wholesale, counter POS, and AI shopping agents with 0% GMV tax.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#090B0E] text-[#F4F6F9] antialiased">
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
