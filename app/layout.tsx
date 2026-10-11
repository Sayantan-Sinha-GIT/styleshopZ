import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Background } from '@/components/chrome/Background';
import { Providers } from '@/components/chrome/Providers';
import { SiteFooter } from '@/components/chrome/SiteFooter';
import { SiteHeader } from '@/components/chrome/SiteHeader';
import { THEME_BOOT_SCRIPT } from '@/lib/themeScript';
import './globals.css';

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'https://styleshopz.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'styleshopZ · Order in motion', template: '%s · styleshopZ' },
  description: 'A mobile-first marketplace modelled on Amazon.in with live search, held stock checkout, order tracking, and AI assistant.',
  openGraph: { title: 'styleshopZ', description: 'Order in motion marketplace', type: 'website' },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0e0f11' },
    { media: '(prefers-color-scheme: light)', color: '#ecedef' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        {/* Google Fonts fallback CDN link for exact Big Shoulders Display weights */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800;900&family=DM+Mono:wght@500&family=Hanken+Grotesk:wght@400;600&family=Instrument+Serif:ital@1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-dvh flex flex-col justify-between">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:text-on-brand font-semibold text-sm"
        >
          Skip to content
        </a>
        <Providers>
          <Background />
          <Suspense fallback={<header className="fixed inset-x-0 top-0 z-50 h-16" />}>
            <SiteHeader />
          </Suspense>
          <div className="flex-1 w-full">
            {children}
          </div>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
