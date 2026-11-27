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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('ziro-theme')||'dark';document.documentElement.setAttribute('data-theme',t);if(t==='light'){document.documentElement.classList.add('light-theme');document.documentElement.classList.remove('dark-theme');}else{document.documentElement.classList.add('dark-theme');document.documentElement.classList.remove('light-theme');}if(window.self!==window.top){document.documentElement.classList.add('is-embedded');}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[var(--ziro-bg-canvas,#14090D)] text-[var(--ziro-text-primary,#F6DCE2)] antialiased transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
