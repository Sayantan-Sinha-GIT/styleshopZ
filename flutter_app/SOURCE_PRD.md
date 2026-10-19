# styleshopZ — release 1.2

## Product and audience

A practical Amazon/Flipkart-style demonstration marketplace for Indian shoppers, sellers and an owner administrator. Prioritise finding products, understanding prices and completing recoverable shopping tasks. Use warm, readable charcoal/amber interfaces, light/dark themes, responsive grids, richer photography and purposeful animation that respects reduced-motion preferences.

This document records the release boundary. Cloudflare and Neon host the app. A dedicated Firebase project supplies Google identity, Ola supplies address lookup, and Brevo supplies verification/recovery email when the owner adds its credentials.

## Customer journey

Browse the sample catalogue without an account. Home highlights curated products and animated campaigns; full catalogue and department pages provide discovery beyond home. Search supports department scope, suggestions, recent searches, weighted full-text matching, common shopping synonyms and labelled typo recovery. Filter by category, brand, price, rating, discount and stock; sort and paginate results. Release 1.2 adds 102 curated products, 17 ranges and five leaf categories. Inspect variants, images, illustrative specifications, price observations, reviews and questions. Compare products, save items and use multiple wishlists.

Register or sign in using Google or email/password to persist the bag, saved items, addresses and preferences. Google identities are verified server-side. Email verification and password recovery use expiring, rate-limited, single-use Brevo codes; delivery awaits owner credentials. Once enabled, new email accounts must verify before checkout. The fixed owner account uses its private password and has no Google access.

Every order requires a complete delivery address. Ola search, reverse lookup, a movable map pin and optional GPS help fill the address; coordinates persist with the address and order snapshot. Manual entry remains available if location services fail. The server validates availability, holds exact quantities for 15 minutes and calculates prices and discounts from database records. Checkout supports clearly labelled demo payment and simulated cash on delivery. An idempotency key protects repeated submissions.

Customers can view their own orders, item-level fulfilment and tracking, cancel eligible orders, download invoices, submit verified demo-purchase reviews after delivery, and request a return within seven days of item delivery. Support conversations persist and can receive administrator replies. Account export and customer deletion are available.

## Seller and owner journeys

New sellers require administrator approval. Approved sellers can create and edit products/variants, manage stock, import up to 50 CSV rows as drafts, upload sample verification material and progress their own order items through the permitted fulfilment sequence. The ledger describes demonstration sales, not transferred money.

Administrators can approve sellers and products, moderate reviews, manage catalogue categories/promotions/banners, inspect orders, resolve returns and support tickets, manage users and view immutable audit records. Return approval and cancellation restore inventory only once.

## Trust and correctness

Use HTTP-only signed sessions with expiry and session revocation; hash passwords; enforce server-side ownership and role checks. Check origin on mutations, validate uploads by type/size, restrict private verification uploads, rate-limit authentication and keep secrets on the server. Lock inventory inside a shared database transaction; disregard client-supplied prices. Purchase checks control reviews, and return eligibility is calculated per delivered item.

The catalogue is sample content. Generated images and descriptions are illustrative; imported seed reviews and Q&A are visibly labelled. Demo payment never charges a card. Seller tracking and delivery are manually simulated. No real shipping, payouts or tax-compliance service is represented.

## Assistant

Without provider keys, the guided assistant searches the real catalogue, shows offers and the signed-in customer's orders, explains policies and proposes supported cart actions. It requires explicit signed confirmation before mutation. Open-ended chat is unavailable until Gemini or Groq is configured. Daily request limits and persisted chat history apply.

## Website and Android

Ship the responsive website and a signed release APK for Android 8 or later. The Capacitor application loads the same deployed HTTPS app, supports hardware-back navigation, handles authenticated PDF/JSON downloads and offers a bundled recovery screen when the server cannot load. Shopping and checkout require connectivity. The APK is distributed directly; Play Store publication is outside this release.

## Deferred integrations and features

- Gemini/Groq open-ended chat: pending owner keys and live provider validation.
- Brevo email delivery: verification/recovery implementation complete; pending owner API key, verified sender and actual email delivery validation.
- Razorpay test checkout: guarded test-key/webhook configuration; pending external verification. Live-money processing is deliberately disabled.
- Real carrier booking/tracking, seller settlements, real GST invoicing, production KYC, phone OTP, push notifications, biometric login, loyalty programmes and complete Hindi translation are future work.

## Acceptance

Pass server rule tests, TypeScript, dependency audit, production Cloudflare build, role/ownership checks, checkout/cancellation/return integration tests and a 50-buyer/10-unit inventory race. Verify desktop/mobile customer screens, actual browser checkout and the installed signed Android release. Record observed results and remaining external dependencies in TEST_REPORT.md.
