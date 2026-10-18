# styleshopZ

An Indian marketplace demonstration with a responsive Next.js website and a signed Android application. Hosted on Cloudflare Workers with a Neon PostgreSQL database.

Website: https://styleshopz.srimantasutapa123.workers.dev
Android: https://styleshopz.srimantasutapa123.workers.dev/downloads/styleshopz-1.3.2.apk

## What works

- Department-aware search, synonyms, typo recovery, brand/price filters, sorting, pagination, product variants, image galleries, comparison and deals. Release 1.2 adds 102 curated sample products across 17 ranges.
- Automatic promotional carousel with pause controls, richer collection photography, responsive motion and reduced-motion support.
- Customer Google sign-in and email/password accounts; fixed owner credentials use a separate owner sign-in. Brevo verification and recovery use expiring, single-use email codes.
- Ola address search, movable map pin and optional GPS, with saved delivery coordinates and manual address entry.
- Customer registration and login, guest bag merge, saved items, multiple wishlists, addresses, profile, notification preferences and data export.
- Server-priced checkout with expiring stock reservations, idempotent orders, coupons, demo payment and simulated cash on delivery.
- Order tracking, cancellation, downloadable invoices, purchase-gated reviews and return requests with proof uploads.
- Seller onboarding and approval, catalogue editing, CSV drafts, stock management and sequential fulfilment with tracking.
- Admin moderation, users, sellers, orders, returns, coupons, deals, banners, categories, support replies and append-only audit records.
- A Gemini shopping assistant with Groq fallback for products, offers, orders, cart actions and policy questions. Mutations require a signed, single-use confirmation.
- Android navigation, an offline recovery screen and authenticated invoice/data downloads.

## Release scope

This is a demonstration marketplace. Catalogue photography and specifications are illustrative. Seed feedback is labelled as sample content. No real charges, shipments, seller payouts or manufacturer warranties are offered.

The hosted prototype has Gemini/Groq, Brevo, Google sign-in and Ola configured through server-side secrets. Razorpay accepts test credentials only. Cloning this public repository does not provide access to those credentials or the hosted database; configure your own values from .env.example. See PRD.md and SETUP_GUIDE.md for the release boundary.

## Development

Use Node.js 24. Copy .env.example to .env.local and configure DATABASE_URL, a random AUTH_SECRET of at least 32 characters, DEMO_MODE=true and NEXT_PUBLIC_APP_URL.

    npm ci
    npm run migrate
    npm run dev

The optional development seed needs ALLOW_DEMO_SEED=true and DEV_SEED_PASSWORD of at least 16 characters. It skips an existing non-seed catalogue, preserves existing accounts and repeats safely for its own DEMO SKUs. Never use development seed accounts in a real shop.

## Verification and deployment

    npm test
    npm run lint
    npm audit --audit-level=high
    npm run test:integration
    npm run test:discovery
    npm run build:cloudflare
    npx wrangler deploy

Integration tests require the configured prototype database and a running app. They create their own isolated customer/seller/admin fixtures, exercise actual HTTP/database flows, then remove their fixtures. Set TEST_BASE_URL to run against the deployed worker. Immutable audit records remain as evidence of administrative fixture actions.

GitHub Actions verifies dependencies, rules, TypeScript and the Cloudflare build on pushes and pull requests. Deployment is performed through authenticated Wrangler; the workflow does not store deployment credentials.

The Android release uses JDK 21, Android SDK 36 and the Gradle wrapper. Signing keys are supplied by environment variables and kept outside the repository. Build and copy the signed APK to public/downloads before the Cloudflare build to include the public download. See SETUP_GUIDE.md.

Generated image prompts and asset origins are recorded in IMAGE_PROMPTS.txt and embedded in raster metadata.

Detailed coverage, fixes, APK metadata and testing limits are recorded in [TEST_REPORT.md](TEST_REPORT.md).
