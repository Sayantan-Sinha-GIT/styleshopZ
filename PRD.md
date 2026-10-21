# styleshopZ — prototype release 1.7.0

## Product and audience

styleshopZ is an Indian marketplace demonstration for shoppers, sellers and one owner administrator. It is a working software prototype with sample merchandise. The experience should make product discovery, checkout, order follow-up and support understandable on both phones and desktop screens. The visual language uses warm charcoal and amber, clear typography, product photography, purposeful motion and reduced-motion support.

The website is hosted on Cloudflare Workers with Neon PostgreSQL. A native Flutter app serves shoppers and sellers. A separate Capacitor app opens the owner console. Both Android APKs are distributed directly through GitHub Releases; there is no Play Store listing.

## Shopper journey

Visitors can browse more than 150 sample products across 17 catalogue ranges, inspect variants and reviews, compare items, and use category-aware search, synonyms, typo recovery, suggestions, sorting and filters. Curated collections and an automatically rotating campaign carousel support discovery without making the home page the entire catalogue.

Shoppers can register with email/password or Google. Email verification and password recovery use expiring, single-use codes delivered through Brevo. Signed-in shoppers can keep a bag, saved items, wishlists, addresses and notification preferences. Every order needs a complete address; Ola search, reverse lookup, a movable map pin and optional GPS assist entry, while manual entry remains available.

The server calculates prices and discounts, reserves exact stock quantities, and uses idempotency keys to protect checkout retries. The prototype offers demo and simulated cash-on-delivery checkout plus Razorpay test-mode checkout. Shoppers can follow orders, download invoices, cancel eligible orders, review delivered purchases, request eligible returns with private evidence, and export or delete their account.

## Seller and owner journeys

Sellers can apply, submit sample verification details, upload their own product photos, maintain listings and variants, import CSV drafts, edit inventory and handle their order items. Demo Courier creates a simulated tracking number at shipment and reflects later delivery stages to the shopper. The seller workspace is available on the website and in the Flutter app.

The owner uses a separate email/password entrance and role-checked console on the website or owner-only Capacitor app. The owner can review sellers and products, moderate feedback, manage catalogue categories and campaigns, inspect orders and returns, respond to support, manage users and inspect the audit trail. Owner credentials and Android signing material stay outside the public repository.

## Support and assistant

Shoppers and sellers can open categorized support cases, optionally link an owned order, attach private evidence, reply and resolve or reopen the conversation. The owner can search and filter a paginated queue, set priority, send public replies and keep internal notes hidden from customers. Cross-account case access and private-file access are denied by the server.

The shopping assistant answers catalogue, offer, order and policy questions using the configured Gemini provider with Groq fallback. Supported cart mutations require explicit, signed, single-use confirmation. The guided catalogue assistant remains available when an AI provider is unavailable.

## Trust and release boundary

Sessions are signed, HTTP-only and revocable; passwords are hashed; server checks roles, ownership, origin, input and upload limits. Prices and stock are authoritative on the server. Private verification and return images are access-controlled. Authentication and support creation are rate-limited. The sample catalogue, photographs, specifications, feedback and seller data are illustrative.

No real card charges, carrier bookings, seller payouts or warranties are offered. Razorpay uses test credentials; delivery and refunds are prototype simulations. A real commercial launch would need production KYC, tax, carrier, payment-settlement and operational processes. Provider availability and quotas still apply.

## Acceptance and verification

The release must pass TypeScript, unit and Flutter widget tests, Android builds and signature checks, Cloudflare production build, dependency audit, role/ownership checks, checkout/cancellation/return integrations, the 50-buyer stock race, customer/seller/owner browser journeys, and support edge cases. Install both APKs on an Android emulator, inspect the screens and system bars, and exercise native support and owner sign-out. The actual case inventory, observed results and limits are in [QA_MATRIX.md](QA_MATRIX.md) and [TEST_REPORT.md](TEST_REPORT.md).
