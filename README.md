# styleshopZ

An Indian marketplace demonstration with a responsive Next.js website and a signed Android application. Hosted on Cloudflare Workers with a Neon PostgreSQL database.

Website: https://styleshopz.srimantasutapa123.workers.dev
Android: https://styleshopz.srimantasutapa123.workers.dev/downloads/styleshopz-1.1.0.apk

## What works

- Search, category browsing, filters, sorting, product variants, image galleries, comparison and deals.
- Customer registration and login, guest bag merge, saved items, multiple wishlists, addresses, profile, notification preferences and data export.
- Server-priced checkout with expiring stock reservations, idempotent orders, coupons, demo payment and simulated cash on delivery.
- Order tracking, cancellation, downloadable invoices, purchase-gated reviews and return requests with proof uploads.
- Seller onboarding and approval, catalogue editing, CSV drafts, stock management and sequential fulfilment with tracking.
- Admin moderation, users, sellers, orders, returns, coupons, deals, banners, categories, support replies and append-only audit records.
- A guided shopping assistant for products, offers, orders, cart actions and policy questions. Mutations require a signed confirmation.
- Android navigation, an offline recovery screen and authenticated invoice/data downloads.

## Release scope

This is a demonstration marketplace. Catalogue photography and specifications are illustrative. Seed feedback is labelled as sample content. No real charges, shipments, seller payouts or manufacturer warranties are offered.

Gemini/Groq chat is optional and awaits provider keys. Razorpay test-mode processing and password-reset email adapters are implemented but require credentials and external end-to-end validation before enabling them. See PRD.md and SETUP_GUIDE.md for the explicit release boundary.

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
    npm run build:cloudflare
    npx wrangler deploy

Integration tests require the configured database, an approved seller/admin and a running app. They create isolated fixtures, exercise actual HTTP/database flows, then remove their fixtures. Set TEST_BASE_URL to run against the deployed worker. Immutable audit records remain as evidence of administrative fixture actions.

GitHub Actions verifies dependencies, rules, TypeScript and the Cloudflare build on pushes and pull requests. Deployment is performed through authenticated Wrangler; the workflow does not store deployment credentials.

The Android release uses JDK 21, Android SDK 36 and the Gradle wrapper. Signing keys are supplied by environment variables and kept outside the repository. Build and copy the signed APK to public/downloads before the Cloudflare build to include the public download. See SETUP_GUIDE.md.

Generated image prompts and asset origins are recorded in IMAGE_PROMPTS.txt and embedded in raster metadata.
