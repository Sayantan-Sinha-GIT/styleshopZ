import type { Metadata } from 'next';
import { SiteHeader } from '@/components/chrome/SiteHeader';
import { SiteFooter } from '@/components/chrome/SiteFooter';

export const metadata: Metadata = {
  title: 'Terms of Service · styleshopZ',
  description: 'Legal terms and conditions governing the use of the styleshopZ e-commerce marketplace.',
};

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen pt-28 pb-20 bg-bg text-text">
        <div className="w max-w-4xl mx-auto">
          <div className="mb-12">
            <p className="m text-xs font-mono text-dim uppercase tracking-wider mb-2">Legal Documentation</p>
            <h1 className="d text-5xl sm:text-7xl font-black uppercase tracking-tight">Terms of Service</h1>
            <p className="text-dim text-base sm:text-lg mt-3 max-w-2xl">
              Last updated: October 2026. Please read these terms carefully before placing orders or operating as a seller on styleshopZ.
            </p>
          </div>

          <div className="space-y-10 text-dim leading-relaxed text-sm sm:text-base">
            <section className="p-7 rounded-2xl bg-surface border border-line">
              <h2 className="d text-2xl font-bold uppercase text-text mb-3">1. Demonstration &amp; Sandbox Environment</h2>
              <p>
                styleshopZ is configured with Razorpay test mode payment keys. All financial transactions, deliveries, seller payouts, and GST invoices are simulated demonstrations. No real currency is charged to buyers, and test cards or UPI handles do not process real debits.
              </p>
            </section>

            <section className="p-7 rounded-2xl bg-surface border border-line">
              <h2 className="d text-2xl font-bold uppercase text-text mb-3">2. Atomic Inventory &amp; 15-Minute Stock Reservation</h2>
              <p>
                When a buyer initiates a checkout session, the database locks requested units for exactly 15 minutes. During this period, other shoppers cannot purchase the held stock. If payment confirmation fails, times out, or is cancelled by the buyer, the hold expires and stock returns automatically to public availability. The client application never determines price; all line items, coupons, and delivery fees are recalculated on the server.
              </p>
            </section>

            <section className="p-7 rounded-2xl bg-surface border border-line">
              <h2 className="d text-2xl font-bold uppercase text-text mb-3">3. Lightning Deals &amp; Quantity Limitations</h2>
              <p>
                Lightning deals and promotional coupons are strictly governed by server-side verification:
              </p>
              <ul className="list-disc pl-6 space-y-1.5 mt-3 text-sm">
                <li>Each user is limited to designated quantity caps on active lightning deals.</li>
                <li>Coupons check active expiration timestamps, minimum cart value thresholds, and lifetime usage limits.</li>
                <li>Cash on Delivery (COD) is capped at ₹50,000 per order for security and verification standards.</li>
              </ul>
            </section>

            <section className="p-7 rounded-2xl bg-surface border border-line">
              <h2 className="d text-2xl font-bold uppercase text-text mb-3">4. Order Cancellation &amp; 7-Day Returns</h2>
              <p>
                Orders may be cancelled freely by the buyer prior to package dispatch (stages: Placed, Packed). Once marked Shipped with an active logistics tracking identifier, cancellation is locked. Buyers receive a 7-day post-delivery inspection window during which return requests with optional condition photographs may be lodged. Approved returns trigger automated simulated refunds.
              </p>
            </section>

            <section className="p-7 rounded-2xl bg-surface border border-line">
              <h2 className="d text-2xl font-bold uppercase text-text mb-3">5. Seller Conduct &amp; Moderation</h2>
              <p>
                All merchants must pass administrative KYC verification prior to product publishing. Product listings must contain accurate variant specifications, genuine brand attributions, and real stock balances. Administrative moderators retain absolute authority to suspend non-compliant seller stores and review disputed returns.
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
