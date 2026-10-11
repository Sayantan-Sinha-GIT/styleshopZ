import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/chrome/SiteHeader';
import { SiteFooter } from '@/components/chrome/SiteFooter';

export const metadata: Metadata = {
  title: 'Help Centre · styleshopZ',
  description: 'Frequently asked questions, shipping rules, return policy, and payment assistance for styleshopZ.',
};

const FAQS = [
  {
    q: 'How does the 15-minute stock hold work?',
    a: 'When you initiate checkout, our Neon Postgres database creates an atomic inventory hold for 15 minutes. Other shoppers cannot buy those reserved units while your hold is active. If payment is completed within 15 minutes, the stock is permanently decremented. If the timer expires or you abandon checkout, the hold is released back into the live inventory automatically.',
  },
  {
    q: 'What are the delivery charges and delivery times?',
    a: 'Standard delivery is free on all orders above ₹499. For orders below ₹499, a flat delivery fee of ₹49 is applied. Express delivery is available for eligible pin codes in metro regions. You can check pincode delivery estimates directly on every product page.',
  },
  {
    q: 'How do I track my order?',
    a: 'Every confirmed order displays our 5-stage tracking timeline: Placed → Packed → Shipped → Out for Delivery → Delivered. Status updates refresh in real time with 30-second polling and fallback cache support so you can always check your parcel even if offline.',
  },
  {
    q: 'What is the return and refund policy?',
    a: 'Eligible items can be returned within 7 days of delivery. To request a return, navigate to Orders, choose your delivered parcel, select the return reason, and optionally attach photos. Once verified by our moderation team, simulated refunds are processed to your original payment method.',
  },
  {
    q: 'Can I cancel an order before it ships?',
    a: 'Yes! Orders in Placed or Packed state can be cancelled instantly with a single tap. Once an order enters Shipped state with an assigned tracking number, it cannot be cancelled in-transit, but you can request a return after delivery.',
  },
  {
    q: 'What payment methods are supported?',
    a: 'styleshopZ supports Razorpay test mode (UPI QR & handles, credit/debit cards, Netbanking across 50+ Indian banks, wallets) and Cash on Delivery (COD) for orders up to ₹50,000. All transactions run on simulated sandbox keys with zero real money deducted.',
  },
];

export default function HelpPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen pt-28 pb-20 bg-bg text-text">
        <div className="w max-w-4xl mx-auto">
          <div className="mb-12">
            <p className="m text-xs font-mono text-dim uppercase tracking-wider mb-2">Customer Support</p>
            <h1 className="d text-5xl sm:text-7xl font-black uppercase tracking-tight">Help Centre</h1>
            <p className="text-dim text-base sm:text-lg mt-3 max-w-2xl">
              Answers to common questions regarding orders, inventory holds, payments, and 7-day returns.
            </p>
          </div>

          <div className="space-y-6 mb-16">
            {FAQS.map((item, idx) => (
              <details
                key={idx}
                className="group p-6 rounded-2xl bg-surface border border-line open:border-[var(--ax)] transition-colors"
              >
                <summary className="font-bold text-lg sm:text-xl text-text cursor-pointer list-none flex justify-between items-center gap-4">
                  <span>{item.q}</span>
                  <span className="font-mono text-xl text-dim group-open:rotate-45 transition-transform flex-none">
                    +
                  </span>
                </summary>
                <p className="text-dim text-sm sm:text-base leading-relaxed mt-4 pt-4 border-t border-line/60">
                  {item.a}
                </p>
              </details>
            ))}
          </div>

          <div className="p-8 rounded-2xl bg-surface border border-line flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="d text-2xl font-bold uppercase mb-1">Still need assistance?</h3>
              <p className="text-dim text-sm">
                Our support team and AI concierge are available 24/7 to resolve queries.
              </p>
            </div>
            <div className="flex gap-3 flex-none">
              <Link href="/support" className="btn text-sm font-semibold">
                Submit Ticket
              </Link>
              <Link href="/assistant" className="btn g text-sm font-semibold">
                Ask AI Assistant
              </Link>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
