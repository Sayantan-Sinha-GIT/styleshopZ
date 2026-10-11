# Amazon-Style Shopping App: Product Requirements Document (v3.0)

## 0. What changed

- **Vague → exact.** "Feature parity with Amazon" became a numbered feature table with Must / Should / Nice, plus testable success criteria.
- **Missing flows added.** Empty, error, slow-network, offline and wrong-input behaviour is defined per flow (§6, §7). Payment timeout, double-tap on Pay, stock gone at checkout and expired holds are covered.
- **Data without rules.** Every entity now has fields, limits and lifecycle rules (§8). Money is stored as integer paise.
- **Rules that could break** (overselling, client-set prices, order confirmed by client callback, cross-user access) are now hard rules (§9) with a named test each.
- **AI limits.** The assistant has an allowed-tools list, forbidden actions, daily caps and fallback behaviour (§10).
- **Paid → free.**
  - Cloudflare R2 asks for a card, so user uploads go to Supabase Storage free tier (default). Static seed images ship with the web app.
  - Google Play ($25) and iOS ($99/yr) are dropped. Android APK only; iOS is deferred.
  - Leftover Stripe wording is removed. Razorpay test mode is the only payment path.
  - "Keep Supabase active" is replaced by Neon wake-up handling and a scheduled health ping.
- **Hosting changed (owner request).** Vercel is replaced by Cloudflare everywhere (Workers for the API, Pages for the web and panels). The word-for-word line in §15 reflects this.
- **Owner setup guide added.** The owner has never used Cloudflare, Razorpay or the other services, so the builder must produce `SETUP_GUIDE.md` with click-by-click steps (§5 F-30, §15).
- **Image prompts file confirmed.** The builder must deliver `IMAGE_PROMPTS.txt` (§5 F-31).
- **Look and feel was missing.** Sections 11 and 12 add a cinematic dark design direction, a signature moment and scroll-story moments.
- **Dropped:** timelines, team roles and costs. Phases are removed; priorities replace them.

## 1. Summary

A mobile-first marketplace app modelled on Amazon.in. Customers browse, search, buy and track products; sellers list and ship; admins moderate and run promotions. It ships as an Android app (APK) wrapping a web app, plus web panels for sellers and admins. It includes an AI shopping assistant. Payments run in Razorpay test mode only. Shipping and payouts are simulated.

## 2. Problem

Shopping apps are heavy and generic, and a builder cannot practise the full loop (catalogue, cart, payment, fulfilment, returns, support) without a real business. This product delivers that complete loop with zero running cost, test-mode payments and realistic seeded data, so it can be demoed and later switched to live.

## 3. Users and roles

| Role | Can do | Cannot do |
|---|---|---|
| Guest | Browse, search, view products, keep a local cart | Checkout, review, wishlist sync |
| Customer | Everything in the shopping loop, reviews, support, AI assistant | See other users' data, seller or admin tools |
| Seller | Own catalogue, own orders, returns, sales dashboard, payout ledger (view) | Other sellers' data, moderation, refunds |
| Admin | Users, sellers, moderation, promotions, refunds, support inbox, analytics, audit log | Edit audit log entries |

A new seller starts as "pending" and cannot list products until an admin approves them. (default)

## 4. Goals and non-goals

**Goals**
- Complete core shopping loop in the Android app: sign up → search → buy (test) → track → return.
- Seller and admin panels sufficient to run the marketplace.
- No overselling, no cross-user data access, no client-set prices.
- Everything runs on free tiers with no credit card.

**Non-goals:** Amazon Pay, Prime Video/Music, Alexa, Kindle, real couriers, real payouts, live payments, iOS build, Google Play release, image search, AR/3D, Subscribe & Save, two-step verification.

## 5. Features

| ID | Feature | Detail | Priority |
|---|---|---|---|
| F-01 | Email + password auth | Sign up, log in, log out, reset by email link (expires 30 min). Password min 8 chars. | Must |
| F-02 | Google sign-in | Native flow; links to an existing account by verified email. | Must |
| F-03 | Role routing | Customer, seller and admin logins route to their own areas; server checks role on every request. | Must |
| F-04 | Profile and addresses | Name, photo, phone; up to 10 addresses; one default; 6-digit pincode check. | Must |
| F-05 | Biometric unlock | Optional, app-lock after 5 min in background; secure token storage. | Should |
| F-06 | Home feed | Hero carousel, category tiles, Deals of the day with countdown, Recommended, Recently viewed, Buy again. | Must |
| F-07 | Categories | 3-level tree and landing pages. | Must |
| F-08 | Offers | Lightning deals, coupons, simulated bank offers, seasonal pages, price-drop badges. | Must |
| F-09 | Search | Autocomplete, recent searches, typo tolerance, filters (price, rating, brand, attributes, delivery speed, discount, availability), sorting. | Must |
| F-10 | Voice and barcode search | Phone speech recognition and camera barcode. | Nice |
| F-11 | Product page | Pinch-zoom gallery, variants with own price and stock, MRP/discount, pincode delivery estimate, seller, specs, FAQs. | Must |
| F-12 | Reviews | Verified purchasers only, photos (max 4), helpful votes, sort and filter, report abuse. | Must |
| F-13 | Product Q&A | Customers ask; sellers and customers answer. | Must |
| F-14 | Share, compare, similar, price history | Native share; the rest are secondary. | Should |
| F-15 | Cart | Quantity, remove, save for later, stock check, price-change notice, coupon, price breakdown; syncs across devices; guest cart merges at login. | Must |
| F-16 | Wishlists | Multiple lists, move to cart, price-drop and back-in-stock alerts. | Must |
| F-17 | Checkout | Address, standard/express delivery (simulated fee), summary, coupon or gift card. | Must |
| F-18 | Razorpay payment | Cards, UPI, netbanking, wallets in test mode; server-verified; retry on failure. | Must |
| F-19 | Cash on Delivery | Per-order limit ₹50,000 (default). | Must |
| F-20 | Stock hold | 15-minute reservation at checkout. | Must |
| F-21 | Orders | History with search/filter, detail, timeline (Placed, Packed, Shipped, Out for delivery, Delivered), invoice PDF (placeholder business details). | Must |
| F-22 | Cancel, return, replace, refund | Cancel before shipment; return within 7 days of delivery (default) with reason and photos; Razorpay refund (full or partial). | Must |
| F-23 | Notifications | Push + email on every order status change; in-app centre; per-category settings. | Must |
| F-24 | Support | Help centre, tickets, in-app support chat (polling), ticket history. | Must |
| F-25 | AI shopping assistant | See §10. | Must |
| F-26 | Seller portal | Onboarding with KYC upload, product CRUD with variants, CSV bulk upload, inventory, orders (accept, pack, ship with tracking ID), returns, sales dashboard, payout ledger. | Must |
| F-27 | Admin panel | Users, sellers, moderation queue, categories, banners, homepage layout, coupons and deals, orders and refunds, support inbox, analytics, audit log. | Must |
| F-28 | Settings | English and Hindi, dark mode, legal pages, clear cache. | Must |
| F-29 | Seed data and tests | Idempotent seed (dev only): admin@shop.test, seller@shop.test, user@shop.test, plus extra users; 500+ products with variants and stock, banners, deals, coupons, reviews, Q&A, orders in every status, returns, tickets. Builder writes and runs unit, integration and end-to-end tests and reports in `TEST_REPORT.md`. | Must |
| F-30 | Owner setup guide | Builder delivers `SETUP_GUIDE.md` (see §15). | Must |
| F-31 | Image prompts file | Builder delivers `IMAGE_PROMPTS.txt` (see below). | Must |
| F-32 | Deep links, rating prompt, update prompt | Product, order and deal links. | Should |
| F-33 | Referral and reward points, gift cards, store credit | Points ledger and balance. | Nice |
| F-34 | Phone OTP, device list, account deletion and data export | Deletion and export are Should; OTP is Nice. | Should |
| F-35 | Fraud flags, feature flags, CMS pages | Repeated COD refusals flagged. | Nice |

**F-31 detail (`IMAGE_PROMPTS.txt`, plain text):** one prompt per image, covering banners, category tiles, one per seeded product (angle, background, aspect ratio), app icon, splash screen, empty states, avatars and the scroll-story visuals of §12. Every prompt has the exact folder and filename the app expects, one shared style block, and aspect ratio and size. Placeholders show until real images are dropped in. The file is a deliverable checked in §16.

## 6. Main user flows

| Flow | Happy path | Edge cases |
|---|---|---|
| Sign up / log in | Email or Google → home | Wrong password: generic error, 5 tries then 15-min lock; email taken: offer log in; Google cancelled: back to login silently |
| Search | Type → suggestions → results → filter | No results: show "did you mean" and popular items; slow network: skeleton cards then retry button; query over 100 chars is trimmed |
| Add to cart | Pick variant → Add | Variant not chosen: highlight picker; out of stock: disable and offer back-in-stock alert; quantity max 10 per item (default) |
| Checkout | Cart → address → delivery → pay → confirmation | Stock gone: item flagged, user chooses remove or reduce; hold expires: "Your hold ended" with refresh; double-tap Pay: one order only (idempotency); no address: force add |
| Razorpay payment | Open Checkout → pay → server verifies → order confirmed | User closes sheet: order stays "awaiting payment", retry offered; payment fails: reason shown, hold kept until expiry; client says success but server not verified: show "Confirming…" up to 60 s, then "We'll notify you" |
| COD | Select COD → order placed "Pay on delivery" | Over limit: COD hidden with reason |
| Track order | Order → timeline | Status updates arrive by polling every 30 s; offline: last known status with "Offline" banner |
| Cancel / return | Pick items, reason, photos → submit | Already shipped: cancel hidden, return offered after delivery; past window: explain; photo over 5 MB: compressed or rejected with message |
| Review | Purchased item → rate → text and photos → publish | Not purchased: button hidden; profanity or abuse: held for moderation |
| Seller fulfils | Accept → pack → ship with tracking ID | Out of stock after accept: seller cancels with reason, customer refunded |
| Admin moderation | Queue → approve / reject with reason | Action is written to the audit log |
| AI assistant | Ask → streamed answer → confirm action | Cap hit or model busy: friendly message, plain search still works |
| First launch while backend asleep | Skeleton and "Waking up the shop…" after 3 s | Retry automatically up to 3 times, then error with retry button |

## 7. Pages / screens

| Area | Screens |
|---|---|
| Customer app | Splash, onboarding (3 cards), login/signup, home, category, search and results, product, cart, checkout, payment result, orders, order detail with tracking, return flow, wishlists, notifications, profile, addresses, settings, help, ticket chat, assistant chat |
| Seller panel | Login, onboarding/KYC, dashboard, products, product editor, CSV upload, inventory, orders, returns, ledger |
| Admin panel | Login, dashboard, users, sellers (approvals), moderation, catalogue, banners and layout, coupons and deals, orders and refunds, tickets, audit log |

Every list screen has a designed empty state, a loading skeleton and an error state with retry.

## 8. Data

| Entity | Key fields and rules |
|---|---|
| User / profile | id, email (unique, verified), role, name, phone, photo; soft delete |
| Address | user, name, phone, line1, line2, city, state, 6-digit pincode, default flag; max 10 |
| Seller | user, shop name, status (pending / approved / suspended), KYC files |
| Category | parent, level 1–3, name, slug, attribute definitions |
| Product | seller, category, title (≤150), brand, description, status (draft / live / hidden), soft delete |
| Variant | product, options, SKU (unique), price and MRP in paise (price ≤ MRP), stock ≥ 0 |
| Product image | product, order, URL, alt text |
| Cart / item | user, variant, quantity 1–10, saved-for-later flag; price is never stored client-side |
| Wishlist / item | user, name, variant |
| Order | user, address snapshot, status, totals in paise, payment method, created time |
| Order item | variant snapshot (title, price), quantity, seller |
| Status event | order, status, time, actor |
| Payment | order, provider, provider ids, status, amount, idempotency key |
| Refund / return | order item, reason, photos, status, amount |
| Coupon | code (unique), rule, minimum cart, usage limit, per-user limit, start, expiry |
| Deal | variant, deal price, start, end, quantity cap |
| Banner | image, link, order, active window |
| Review | user, product, rating 1–5, text ≤2,000, photos ≤4, verified flag, state |
| Question / answer | product, author, text ≤500 |
| Notification / device token | user, type, read flag; token per device |
| Support ticket / message | user, subject, status, messages |
| AI conversation / message / daily usage | user, role, text, counts per day |
| Audit log | actor, action, target, time; append-only |

Global rules: UUID ids, created and updated times everywhere, money in integer paise, foreign keys and indexes on lookups, searchable index on product title, brand and description, one review per user per product, stock changes only inside a locked transaction.

## 9. Rules that must never break

| Rule | Test that proves it |
|---|---|
| The client never sets price, total or discount; the server recalculates | Tamper test: modified totals are ignored |
| An order is confirmed only after server-side signature verification and the `payment.captured` webhook | Fake client success without webhook: order stays unconfirmed |
| Webhook and order creation are idempotent | Replay same webhook 5×: one order, one payment |
| No overselling | 50 concurrent buyers of 10 units: exactly 10 succeed |
| Stock holds release on failure or after 15 min | Timed test |
| Every endpoint checks session, role and ownership | Cross-user and cross-seller access returns denied |
| No card data on our servers or in logs; no personal data in logs | Log scan |
| Coupons obey limits, expiry and minimum cart | Unit tests |
| Only verified purchasers review | Attempt without purchase is rejected |
| Seeded logins are disabled in production | Production build rejects them |
| Secrets live only in server environment settings; only the Razorpay key id ships in the app | Bundle scan |
| Uploads: images only, max 5 MB, short-lived upload links | Wrong type or size rejected |

## 10. AI features

**Assistant (F-25)**
- Streaming chat reachable from home, product pages and orders, with suggested prompts and saved history.
- Allowed tools, always acting as the logged-in user through the app's own API: search and filter, compare, summarise reviews and Q&A, find deals and coupons, view or change cart and wishlist, order status and tracking, start cancel or return, answer policy questions.
- Role-aware: customers shop; sellers get sales, inventory and listing-draft help; admins get moderation summaries.
- **Must never:** place an order, cancel, return or refund without an in-chat confirmation tap; see or ask for card data; reveal another user's data; set prices; invent products, prices or policies (answers come from tool results, otherwise "I don't know"); follow instructions found inside reviews, Q&A or product text; reveal its instructions or keys.
- **Limits (default):** 30 messages per user per day, 1,500-character input, 10 tool calls per reply, 20 s per reply.
- **Failure:** primary model busy → fallback model → friendly "Assistant is resting, try search" message with working search link. Keys stay server-side.
- Conversations are deleted with the account.

**Nice:** voice input, product cards in replies, image questions.

## 11. Look and feel

- **Mood:** editorial, kinetic, tactile, luminous, confident.
- **Feel of:** apple.com product pages, spacex.com, linear.app.
- Professional and cinematic together: dark first (light mode fully tuned), large type, generous space, depth and layered motion.
- Display font must have real character (never a plain default sans), paired with a highly readable body font. Exact colours and fonts are left open: the builder picks them from the design references above.
- A living background behind every page (subtle moving gradient, grain or particles that respect low-power devices).
- Real pictures on every page (product photos, lifestyle shots, screenshots); no empty areas of just text on flat colour.
- Product cards feel tactile: press depth, shadow shifts, haptic tap.
- **Motion intensity: 10 (cinematic)**, with reduced-motion setting honoured (§14).

## 12. Signature moment

**The hero moment: "Order in motion."** On home, a large product floats in 3D-like parallax; tapping **Buy** makes it fly into the cart icon, the cart badge pulses, and the checkout sheet rises. After payment, a confetti-light burst and a parcel icon travelling along the live timeline show the order moving toward you. It shows what the product does in 5 seconds: find, buy, track.

**Scroll story (home and the web landing page):**
1. **First screen:** full-bleed hero with headline, living background and the floating product.
2. **Deals:** the countdown ticks while deal cards slide in with staggered depth.
3. **Categories:** tiles zoom and reveal their pictures as they enter.
4. **Assistant:** a chat bubble types out an example question and shows product cards answering.
5. **Footer:** a closing full-screen band with a big call to action, parallax picture layers, and links that glide up; the bottom moves as much as the top.

## 13. Platforms and devices

- Android app (APK) on phones from Android 8 up; portrait first, tablet layout usable.
- Seller and admin panels are responsive web apps for desktop browsers.
- iOS is deferred.
- Cold start under 3 s on a mid-range phone; list screens virtualised; images lazy-load with placeholder blur.
- Offline: home, categories, cart and orders readable offline; writes queue and retry; visible offline banner.
- Android back button and gestures, safe-area insets and keyboard-aware forms work.

## 14. Languages and accessibility

- English and Hindi (all text, dates and ₹ formatting); language switch without restart.
- Tap targets ≥44 px, screen-reader labels, AA contrast in both themes, visible focus.
- Reduced-motion setting calms animations but keeps the layout.
- Text scales to 200% without breaking.

## 15. Constraints

- Free tiers only. No credit card anywhere.
- The owner is not technical; the builder sets up and deploys everything.
- Code on GitHub (Sayantan-Sinha-GIT). Websites hosted on Cloudflare (replaces Vercel, owner's decision).
- AI features, if any: Gemini API free tier, Groq as fallback. Maps, if any: OpenStreetMap.
- Payments, if any: test mode only. (Razorpay)

**Other constraints (default)**
- Services chosen by the owner: Cloudflare (Workers for the API, Pages for the web and panels), Neon Postgres, Razorpay, Firebase push, Resend email, Sentry, Supabase Storage (replaces R2), GitHub Actions for builds and weekly backups.
- Free tiers are small: the database sleeps when idle, AI limits are low and change, Workers have short CPU time. Keep handlers light, paginate and cache.
- Android APK only, signed by the builder.
- Shipping, payouts and GST invoices are simulated and marked as such in the app.

**Owner setup guide (`SETUP_GUIDE.md`)**

Because the owner has never used these services, the builder writes the guide so a total beginner can follow it with no outside help.

- **Format:** numbered steps, one action each, exact button and menu names, exact value to type, what the screen should show afterwards, and "if you see X, do Y" for common problems. Steps are checked against the live websites at the time of writing.
- **Secrets:** each step says where a key is pasted (the builder's secret store), never in code, and never shared in chat.
- **Order and contents:**

| # | Service | The guide must cover |
|---|---|---|
| 1 | GitHub | Confirm repository under Sayantan-Sinha-GIT, add secrets for builds |
| 2 | Cloudflare | Free sign-up without a card, connect GitHub, create the API and web projects, set secrets, find the live addresses |
| 3 | Neon | Free sign-up, create database, copy connection string, run setup |
| 4 | Razorpay | Sign up, stay in **Test Mode**, generate test key id and secret, create the webhook (event `payment.captured` plus refund events) pointing at the Cloudflare API address, copy the webhook secret, run a test payment with Razorpay's test card and UPI test ID, and verify the order confirms |
| 5 | Google sign-in | Create a Google Cloud project, consent screen, OAuth client IDs for Android and web (no billing) |
| 6 | Firebase | Create project, add Android app, get push credentials |
| 7 | Resend | Sign up, API key, use the free sending address |
| 8 | Gemini and Groq | Create free API keys |
| 9 | Supabase Storage | Create free project and bucket for uploads |
| 10 | Sentry | Create free project and key |
| 11 | Android build | Download the signed APK, install on a phone, first login with test accounts |

- Ends with a **go-live note**: what changes for real payments (business verification, live keys) is explained but not done.
- The builder also provides a `.env.example`-style checklist that lists every secret by name with where to get it.

## 16. Success criteria

| # | Criterion | How to test |
|---|---|---|
| 1 | New user signs up, searches, buys with a Razorpay test card, gets a push, tracks to Delivered, and returns the item, all in the Android app | End-to-end test on emulator |
| 2 | Seller lists a product and fulfils that order from the panel | Scripted test |
| 3 | Cross-user and cross-seller access denied on every endpoint | Integration test list |
| 4 | No overselling under concurrent checkout | 50-buyer load test passes |
| 5 | Fake client payment success never confirms an order | Tamper test |
| 6 | Search and list responses under 500 ms p95 (after warm-up) | Timed test with 500+ products |
| 7 | Cold start under 3 s | Measured on mid-range emulator profile |
| 8 | `TEST_REPORT.md` shows all tests with pass/fail | File present, no unexplained failures |
| 9 | `IMAGE_PROMPTS.txt` exists, one prompt per required image, each with exact folder and filename | Count of prompts matches image list |
| 10 | `SETUP_GUIDE.md` covers all 11 services in order; a non-technical reader completes it | Walkthrough check against §15 |
| 11 | Zero card data or personal data in logs; no secrets in the app bundle | Scans |
| 12 | Every screen has empty, loading and error states | Screen checklist |
| 13 | AI assistant refuses forbidden actions and respects daily cap | Scripted prompts |
| 14 | Dark and light, English and Hindi, reduced-motion all work | Manual checklist |

## 17. Open questions

| Question | Answer |
|---|---|
| Where do user uploads go, since R2 needs a card? | Supabase Storage free tier (default) |
| iOS? | Deferred (default) |
| Return window? | 7 days after delivery (default) |
| COD limit? | ₹50,000 per order (default) |
| Cart item limit? | 10 per item (default) |
| Order tracking updates? | Polling every 30 s (default) |
| Seller approval? | Manual by admin (default) |
| Currency, tax? | INR; GST shown on invoice with placeholder business details (default) |
| Live payments? | Not now; test mode only (default) |
| Maps for live tracking? | OpenStreetMap, simulated courier (default) |
| Real product photos? | Generated from `IMAGE_PROMPTS.txt`; placeholders until then (default) |
