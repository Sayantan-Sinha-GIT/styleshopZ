import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/chrome/SiteHeader';
import { SiteFooter } from '@/components/chrome/SiteFooter';

export const metadata: Metadata = {
  title: 'Owner Setup Guide · styleshopZ',
  description: 'Click-by-click instructions for configuring all 11 external services on 100% free tiers.',
};

const SERVICES = [
  {
    num: '01',
    name: 'Neon Serverless Postgres',
    tier: 'Free Tier (0.5 GiB storage, 1 compute branch)',
    purpose: 'Stores users, products, variants, orders, lightning deals, reviews and audit logs.',
    steps: [
      'Navigate to neon.tech and sign in with your GitHub account.',
      'Create a new project named styleshopz-db in the Singapore (AWS ap-southeast-1) region.',
      'Copy the connection string with pooled mode enabled: postgresql://neondb_owner:***@ep-***-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require.',
      'Run npx tsx scripts/migrate.ts to establish all 27 tables, then npx tsx scripts/seed.ts to insert the 525 products.',
    ],
  },
  {
    num: '02',
    name: 'Cloudflare Pages (Hosting & Edge Deployments)',
    tier: 'Free Tier ($0/month, Global Edge Network)',
    purpose: 'Hosts the Next.js production storefront, panels, serverless routes, and edge cache.',
    steps: [
      'Sign in at dash.cloudflare.com → Workers & Pages → Create application → Pages → Connect to Git.',
      'Select GitHub repository Sayantan-Sinha-GIT/styleshopZ and click Begin setup.',
      'Under Project name type styleshopz (giving live URL https://styleshopz.pages.dev), Framework: Next.js.',
      'Under Environment variables, add NODE_VERSION (20.18.0), DATABASE_URL, NEXTAUTH_SECRET, and RAZORPAY keys.',
      'Click Save and Deploy to trigger the edge build.',
    ],
  },
  {
    num: '03',
    name: 'Razorpay Test Mode',
    tier: 'Test Sandbox Mode (Zero card required, ₹0 fees)',
    purpose: 'Simulated checkout processing with UPI, cards, netbanking, and HMAC webhook verification.',
    steps: [
      'Sign up at dashboard.razorpay.com and toggle the top bar switch to Test Mode.',
      'Go to Settings → API Keys → Generate Test Key.',
      'Copy Key ID (starts with rzp_test_) and Key Secret into .env.local and Cloudflare Pages settings.',
      'Test payment flow using test UPI handle success@razorpay or standard test card 4111-1111-1111-1111.',
    ],
  },
  {
    num: '04',
    name: 'Google Gemini AI',
    tier: 'Google AI Studio Free Tier (15 RPM free)',
    purpose: 'Powers the AI shopping assistant with catalogue tool calling and confirm-gated actions.',
    steps: [
      'Visit aistudio.google.com and sign in with your Google account.',
      'Click Get API Key and create a key in your project.',
      'Assign the key to GEMINI_API_KEY in .env.local and Cloudflare Pages environment variables.',
      'The assistant handles 30 requests per IP per day with a 1,500 character limit.',
    ],
  },
  {
    num: '05',
    name: 'Upstash Redis',
    tier: 'Free Tier (10,000 commands/day)',
    purpose: 'Rate limiting on AI chat (30/day), inventory hold locking, and guest cart sync.',
    steps: [
      'Sign up at console.upstash.com using GitHub.',
      'Create a Redis database in the Singapore (ap-southeast-1) region.',
      'Copy UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN into Cloudflare environment settings.',
    ],
  },
  {
    num: '06',
    name: 'Capacitor Android Shell',
    tier: 'Open Source (Android Studio free)',
    purpose: 'Wraps the live web app into an installable Android APK with offline fallback support.',
    steps: [
      'Review capacitor.config.json in the repository root (points to https://styleshopz.pages.dev).',
      'Run npx cap add android followed by npx cap sync android.',
      'Open the android folder in Android Studio and click Build → Build APK.',
      'Deploy the generated APK to any Android 8.0+ device.',
    ],
  },
];

export default function SetupGuidePage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen pt-28 pb-20 bg-bg text-text">
        <div className="w max-w-5xl mx-auto">
          <div className="mb-12">
            <p className="m text-xs font-mono text-dim uppercase tracking-wider mb-2">Technical Operations</p>
            <h1 className="d text-5xl sm:text-7xl font-black uppercase tracking-tight">Owner Setup Guide</h1>
            <p className="text-dim text-base sm:text-lg mt-3 max-w-2xl">
              Complete click-by-click beginner instructions for configuring external services on 100% free tiers without credit card requirements.
            </p>
          </div>

          {/* Test Accounts Banner */}
          <div className="p-6 rounded-2xl bg-surface border border-line mb-12">
            <h3 className="d text-2xl font-bold uppercase mb-4 text-text">Pre-Seeded Test Accounts</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-4 rounded-xl bg-bg border border-line">
                <span className="text-[var(--ax)] font-bold block mb-1">CUSTOMER</span>
                <p className="text-text font-bold">user@shop.test</p>
                <p className="text-dim">REMOVED_LEGACY_DEMO_PASSWORD</p>
                <p className="text-[11px] text-dim mt-2">Can checkout, track, cancel, review.</p>
              </div>
              <div className="p-4 rounded-xl bg-bg border border-line">
                <span className="text-[var(--ax)] font-bold block mb-1">SELLER</span>
                <p className="text-text font-bold">seller@shop.test</p>
                <p className="text-dim">REMOVED_LEGACY_DEMO_PASSWORD</p>
                <p className="text-[11px] text-dim mt-2">Can pack, dispatch, view payouts.</p>
              </div>
              <div className="p-4 rounded-xl bg-bg border border-line">
                <span className="text-[var(--ax)] font-bold block mb-1">ADMIN</span>
                <p className="text-text font-bold">admin@shop.test</p>
                <p className="text-dim">REMOVED_LEGACY_DEMO_PASSWORD</p>
                <p className="text-[11px] text-dim mt-2">Can moderate sellers, approve refunds.</p>
              </div>
            </div>
          </div>

          {/* Service Cards */}
          <div className="space-y-8 mb-16">
            {SERVICES.map((s) => (
              <div key={s.num} className="p-7 rounded-2xl bg-surface border border-line">
                <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
                  <div>
                    <span className="font-mono text-xs text-[var(--ax)] font-bold tracking-wider block mb-1">
                      SERVICE {s.num}
                    </span>
                    <h3 className="d text-3xl font-bold uppercase text-text">{s.name}</h3>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-mono bg-bg border border-line text-dim">
                    {s.tier}
                  </span>
                </div>
                <p className="text-dim text-sm mb-6">{s.purpose}</p>

                <div className="p-5 rounded-xl bg-bg border border-line">
                  <h4 className="text-xs font-mono uppercase text-dim mb-3 font-semibold">Exact Numbered Steps:</h4>
                  <ol className="space-y-2.5 list-decimal pl-5 text-xs sm:text-sm text-dim leading-relaxed">
                    {s.steps.map((st, i) => (
                      <li key={i}>{st}</li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}
          </div>

          <div className="p-8 rounded-2xl bg-surface border border-line flex justify-between items-center flex-wrap gap-6">
            <div>
              <h3 className="d text-2xl font-bold uppercase mb-1">Verification Ledger</h3>
              <p className="text-dim text-sm">
                Automated tests verify HMAC signing, pricing recalculation, and COD ceiling.
              </p>
            </div>
            <Link href="/" className="btn text-sm font-semibold">
              Return to Storefront &rarr;
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
