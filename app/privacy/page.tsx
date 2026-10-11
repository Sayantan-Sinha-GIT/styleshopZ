import type { Metadata } from 'next';
import { SiteHeader } from '@/components/chrome/SiteHeader';
import { SiteFooter } from '@/components/chrome/SiteFooter';

export const metadata: Metadata = {
  title: 'Privacy Policy · styleshopZ',
  description: 'Our commitment to data minimization, cookie encryption, and zero payment credential retention.',
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen pt-28 pb-20 bg-bg text-text">
        <div className="w max-w-4xl mx-auto">
          <div className="mb-12">
            <p className="m text-xs font-mono text-dim uppercase tracking-wider mb-2">Privacy &amp; Data Security</p>
            <h1 className="d text-5xl sm:text-7xl font-black uppercase tracking-tight">Privacy Policy</h1>
            <p className="text-dim text-base sm:text-lg mt-3 max-w-2xl">
              We practice strict data minimization. Here is exactly what data styleshopZ collects, how it is secured, and your rights as a customer.
            </p>
          </div>

          <div className="space-y-10 text-dim leading-relaxed text-sm sm:text-base">
            <section className="p-7 rounded-2xl bg-surface border border-line">
              <h2 className="d text-2xl font-bold uppercase text-text mb-3">1. Zero Card Data Retention</h2>
              <p>
                styleshopZ does not store, log, or transmit raw credit card numbers, CVVs, or Netbanking passwords. All payment transactions in test mode communicate directly with Razorpay through client-side SDK integration and server-side HMAC-SHA256 signature verification.
              </p>
            </section>

            <section className="p-7 rounded-2xl bg-surface border border-line">
              <h2 className="d text-2xl font-bold uppercase text-text mb-3">2. Authentication &amp; Cookie Security</h2>
              <p>
                Customer and merchant sessions are authenticated using cryptographic session tokens stored in <code className="px-1.5 py-0.5 rounded bg-bg text-[var(--ax)] font-mono text-xs">HttpOnly</code>, <code className="px-1.5 py-0.5 rounded bg-bg text-[var(--ax)] font-mono text-xs">SameSite=Lax</code>, and <code className="px-1.5 py-0.5 rounded bg-bg text-[var(--ax)] font-mono text-xs">Secure</code> cookies. Client scripts cannot access authentication tokens, protecting against cross-site scripting (XSS) attacks.
              </p>
            </section>

            <section className="p-7 rounded-2xl bg-surface border border-line">
              <h2 className="d text-2xl font-bold uppercase text-text mb-3">3. AI Assistant Privacy Boundaries</h2>
              <p>
                Queries submitted to the AI Shopping Assistant are used solely to generate in-session shopping guidance (catalogue search, deals lookups, return filing assistance). Shopping queries are never sold to external data brokers or used to build third-party advertising profiles.
              </p>
            </section>

            <section className="p-7 rounded-2xl bg-surface border border-line">
              <h2 className="d text-2xl font-bold uppercase text-text mb-3">4. Customer Rights &amp; Data Deletion</h2>
              <p>
                You retain complete rights to inspect your order history, modify delivery addresses, or request full account erasure at any time by contacting our support desk at <span className="font-mono text-text">support@styleshopz.test</span>.
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
