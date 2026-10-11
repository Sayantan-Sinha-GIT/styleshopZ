import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/chrome/SiteHeader';
import { SiteFooter } from '@/components/chrome/SiteFooter';

export const metadata: Metadata = {
  title: 'Customer Account · styleshopZ',
  description: 'Manage your styleshopZ customer profile, addresses, tracked orders, and shopping preferences.',
};

export default function CustomerPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen pt-28 pb-20 bg-bg text-text">
        <div className="w max-w-5xl mx-auto">
          <div className="mb-10">
            <p className="m text-xs font-mono text-dim uppercase tracking-wider mb-2">Account Management</p>
            <h1 className="d text-5xl sm:text-7xl font-black uppercase tracking-tight">Customer Dashboard</h1>
            <p className="text-dim text-base sm:text-lg mt-3 max-w-2xl">
              Welcome back to styleshopZ. Track active deliveries, review transaction receipts, and manage your delivery addresses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Profile Overview */}
            <div className="p-6 rounded-2xl bg-surface border border-line flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-brand text-on-brand font-bold flex items-center justify-center font-mono text-lg">
                    CS
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-text">Demo Customer</h3>
                    <p className="text-xs font-mono text-dim">user@shop.test</p>
                  </div>
                </div>
                <div className="space-y-2 text-xs font-mono pt-4 border-t border-line/60 text-dim">
                  <p><b className="text-text">Role:</b> Verified Buyer</p>
                  <p><b className="text-text">KYC:</b> Not required for buyers</p>
                  <p><b className="text-text">Password:</b> REMOVED_LEGACY_DEMO_PASSWORD</p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-line/60">
                <span className="inline-block px-2.5 py-1 rounded-full text-xs font-mono bg-brand/15 text-[var(--ax)] font-semibold">
                  Active Session
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-6 rounded-2xl bg-surface border border-line flex flex-col justify-between">
              <div>
                <p className="m text-xs font-mono text-dim mb-2">Live Orders</p>
                <h3 className="text-xl font-bold mb-3 text-text">Deliveries &amp; Returns</h3>
                <p className="text-dim text-sm mb-4">
                  Track parcels through our 5-stage timeline tracker. Pre-shipment cancellations and 7-day post-delivery returns.
                </p>
              </div>
              <div className="space-y-2 pt-4 border-t border-line/60">
                <Link href="/orders" className="btn w-full text-sm font-semibold">
                  View All Orders &rarr;
                </Link>
                <Link href="/cart" className="btn g w-full text-sm font-semibold">
                  Open Shopping Cart
                </Link>
              </div>
            </div>

            {/* AI Assistant Shortcut */}
            <div className="p-6 rounded-2xl bg-surface border border-line flex flex-col justify-between">
              <div>
                <p className="m text-xs font-mono text-dim mb-2">24/7 Concierge</p>
                <h3 className="text-xl font-bold mb-3 text-text">AI Shopping Assistant</h3>
                <p className="text-dim text-sm mb-4">
                  Query the catalogue, compare specs, find active coupon codes, and draft return requests with confirmation guards.
                </p>
              </div>
              <div className="pt-4 border-t border-line/60">
                <Link href="/assistant" className="btn g w-full text-sm font-semibold">
                  Launch Assistant &rarr;
                </Link>
              </div>
            </div>
          </div>

          {/* Account Details & Preferences */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-7 rounded-2xl bg-surface border border-line">
              <h3 className="d text-2xl font-bold uppercase mb-4">Default Delivery Address</h3>
              <div className="p-4 rounded-xl bg-bg border border-line text-sm space-y-1 mb-4">
                <p className="font-semibold text-text">Sayantan Sinha</p>
                <p className="text-dim">Flat 402, Skyline Residency, Outer Ring Road</p>
                <p className="text-dim">Bengaluru, Karnataka - 560103</p>
                <p className="text-xs font-mono text-dim pt-2">Phone: +91 98765 43210</p>
              </div>
              <p className="text-xs text-dim">
                Deliveries are verified by service pincode checks during checkout.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-surface border border-line">
              <h3 className="d text-2xl font-bold uppercase mb-4">Security &amp; Privacy</h3>
              <ul className="space-y-3 text-sm text-dim list-none p-0">
                <li className="flex items-start gap-2">
                  <span className="text-[var(--ax)] font-mono font-bold">—</span>
                  <span>Session authentication via HttpOnly encrypted cookies.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--ax)] font-mono font-bold">—</span>
                  <span>Zero credit card data stored on our servers; handled strictly by Razorpay test mode.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--ax)] font-mono font-bold">—</span>
                  <span>All prices and coupons are verified server-side with atomic inventory holds.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
