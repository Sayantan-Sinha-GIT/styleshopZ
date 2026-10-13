import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Hanken_Grotesk, Instrument_Serif, DM_Mono, Noto_Sans_Devanagari } from "next/font/google";
import { Suspense } from "react";
import { StoreProvider } from "@/components/shop/Store";
import { SiteHeader } from "@/components/chrome/SiteHeader";
import { SiteFooter } from "@/components/chrome/SiteFooter";
import { THEME_BOOT_SCRIPT } from "@/lib/themeScript";
import { Providers } from "@/components/chrome/Providers";
import { Background } from "@/components/chrome/Background";
import { PageShell } from "@/components/chrome/PageShell";
import "./globals.css";
import "./storefront.css";
const body = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});
const display = Big_Shoulders({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});
const editorial = Instrument_Serif({ weight: "400", style: "italic", subsets: ["latin"], variable: "--font-editorial", display: "swap" });
const mono = DM_Mono({ weight: "500", subsets: ["latin"], variable: "--font-data", display: "swap" });
const hindi = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-hindi", display: "swap" });
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ||
      "https://styleshopz.srimantasutapa123.workers.dev",
  ),
  title: {
    default: "styleshopZ · Good finds, every day",
    template: "%s · styleshopZ",
  },
  description:
    "Explore electronics, fashion and everyday essentials. A working demonstration marketplace with a persistent bag, checkout, order tracking and seller workspace.",
  manifest: "/manifest.json",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#141619",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className={`${body.variable} ${display.variable} ${editorial.variable} ${mono.variable} ${hindi.variable}`}>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Providers><Background /><StoreProvider>
          <Suspense fallback={null}>
            <SiteHeader />
          </Suspense>
          <PageShell className="shop-main">
            {children}
          </PageShell>
          <SiteFooter />
        </StoreProvider></Providers>
      </body>
    </html>
  );
}
