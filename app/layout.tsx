import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Outfit } from "next/font/google";
import { Suspense } from "react";
import { StoreProvider } from "@/components/shop/Store";
import { SiteHeader } from "@/components/chrome/SiteHeader";
import { SiteFooter } from "@/components/chrome/SiteFooter";
import { THEME_BOOT_SCRIPT } from "@/lib/themeScript";
import "./globals.css";
const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});
const display = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});
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
      <body className={`${body.variable} ${display.variable}`}>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <StoreProvider>
          <Suspense fallback={null}>
            <SiteHeader />
          </Suspense>
          <main id="main" className="shop-main">
            {children}
          </main>
          <SiteFooter />
        </StoreProvider>
      </body>
    </html>
  );
}
