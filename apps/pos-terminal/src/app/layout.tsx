import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ziro POS — Offline-First Counter & Warehouse Terminal',
  description: 'Zero-latency local-first POS terminal with Serwist PWA & delta sync',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#090B0E] text-[#F4F6F9] antialiased">
        {children}
      </body>
    </html>
  );
}
