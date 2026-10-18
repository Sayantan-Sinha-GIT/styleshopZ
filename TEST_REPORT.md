# styleshopZ 1.3.2 — prototype verification

Verified 18 October 2026. This release provides a working prototype website and directly installable signed Android APK. Payments and fulfilment are demonstrations; no live charges, shipping integration, seller payouts or Play Store publication are included. The broad integration results below were completed for the preceding release; the 1.3.2 changes were checked with the focused mobile, build, regression and native tests described here.

## Automated and integration checks

| Check | Result |
| --- | --- |
| Vitest regression tests | 35 passed across 9 files |
| TypeScript and Cloudflare production build | Passed |
| Dependency audit | 0 vulnerabilities |
| Broad HTTP/database integration scenarios | 24 passed |
| Discovery, email-code and real Ola integration scenarios | 5 passed |
| Focused seller/admin/promotion integration scenarios | 11 passed |
| Browser shopping/account scenarios | 23 verified |
| Additional banner/browser scenarios | 5 passed |
| Seller editor and CSV browser scenarios | 4 passed |
| Catalogue integrity | All 102 product-detail APIs and 22 distinct product images passed |
| Android release instrumentation | 6 passed on Android 15, including system-bar geometry |

The browser suite covers desktop and phone layouts, both themes, reduced motion, long Unicode content, unavailable services and corrupt local storage. A full run passed 22 scenarios; its remaining carousel failure was caused by exact duplicate legacy sample banners. Migration 011 archives those duplicates without deleting them. The homepage scenario was then rerun successfully, including visible six-second autoplay, pause controls, sticky search, and reduced-motion hydration.

## Exercised behavior

- Email registration/login/logout, Google identity validation, owner-only sign-in restrictions, session tampering and revocation, password reset and account deletion.
- Search terms, synonyms, typo recovery, brands, price/rating/discount/stock filters, sorting, pagination, variants, galleries, comparisons and unavailable products.
- Guest-cart persistence and merge, quantities, saved-for-later items, multiple wishlists and list assignment.
- Real Ola landmark search and reverse geocoding, saved delivery coordinates, manual addresses, address editing and default selection.
- Server-priced checkout, address requirements, coupons, stock reservations, idempotent requests, demo/COD orders, invoices, cancellation, simulated fulfilment, reviews, questions and returns.
- Fifty concurrent buyers competed for ten units: exactly ten orders succeeded. Repeated cancellation restored stock only once.
- Razorpay test-order creation, provider checkout display, signature checks, malformed/duplicate/delayed captured callbacks and pending-order cancellation. Pending quotes now reserve promotional quantity; later shoppers receive the normal price when the offer cap is reserved, and an existing quote retains its price after the offer expires.
- Concurrent discounted returns allocate the exact total in paise, avoid duplicate restocking and update payment/ledger figures consistently. Invalid cancellation reasons are rejected before any provider refund request.
- Single-use assistant confirmations, cross-account action rejection, product budgets, history and individually delivered item returns. Actual Gemini and Groq requests both returned answers; failure/empty/timeout fallback is covered by regression tests.
- Seller approval, owned/private KYC documents, product/variant editing, active stock holds, CSV quoted fields and malformed rows, archiving and owner-scoped operations.
- Admin categories, coupons, deals, banner publication/disable, internal links, Q&A answers, review votes/reports/moderation and scoped notifications.
- Upload size/type restrictions, private file ownership, credential-free account export, deletion confirmation and session invalidation.

The owner separately confirmed successful Google sign-in on the website and their physical Android phone with the preceding 1.3.0 APK, and receipt of both real Brevo verification and password-reset emails. Release 1.3.2 retains the same signing certificate and Google login plugin. The dispatched codes were exercised against the application; expired/incorrect/reused codes and old sessions were rejected.

The deployed release also passed an actual Razorpay sandbox card payment, browser callback and provider-generated captured webhook, followed by invoice download and a full cancellation/refund through the UI. Razorpay independently reported one processed refund for the full 33,900 paise, and stock returned exactly once. The initial refund was rejected because the sandbox needed a virtual balance reserve; one separate fake payment supplied that reserve. No real money was involved. The live Gemini assistant returned a relevant answer with catalogue product cards, and live Ola search saved delivery coordinates.

## Android artifact

- File: `styleshopz-1.3.2.apk`
- Version name/code: `1.3.2` / `6`
- SHA-256: `59348c4129164b14cc9d0ab16952552b1bb81cd87cb3649d73f6d85d24f7c314`
- Existing release signing certificate retained; signature verified.
- Emulator checks include installation/update, email login, session persistence, navigation, offline recovery and authenticated PDF/JSON downloads. The owner completed native Google sign-in on their phone with 1.3.0.
- The 1.3.2 APK installed over 1.3.1 with the same signing certificate. The Android activity now measures system-bar and cutout insets and keeps its WebView within the unobscured area; a new instrumentation test verifies the content bounds. The WebView continues to clear stale HTTP cache and reload online at startup.
- A follow-up 360/412 px mobile pass verified matching 20 px left edges for the header, department heading, carousel card and product shelf, including after the carousel snaps to the next card. Even-numbered department cards now share the same top edge. The installed app hides its own APK download links.
- APK downloads retain their `.apk` extension. HTTPS-only settings, disabled backups/debugging and location permission configuration are verified.
- Native lint: zero errors, 27 resource/dependency advisories.

The APK loads the hosted app. Web fixes arrive through deployment; native changes require a new signed build. Native Google account authentication was confirmed by the owner on a physical phone; the emulator tests alone cannot establish compatibility with every device.

## Publication and data boundaries

Active provider credentials, database URLs, authentication secrets, signing material and owner passwords are excluded from Git and the APK. The published branch/tag history was sanitized and independently scanned. Retired historical secrets are inactive, and the old sample passwords no longer authenticate. GitHub release assets/bodies and workflow log archives were also scanned. GitHub may retain historical cached objects by old SHA; cleaning reachable history is not a guarantee of physical server-side erasure.

QA scenarios use isolated users, products, orders and promotions. Their operational fixtures are removed afterward. Actors referenced by immutable audit records are disabled and retained with the audit trail; real owner accounts and catalogue stock are preserved.

Terms and conditions and the privacy policy describe the prototype, Google/Firebase, Brevo, AI providers, Ola/OpenStreetMap, device storage and account controls.

## Reproduce

Use Node.js 24 and a configured prototype database. With the application running:

```text
npm test
npm run lint
npm audit --audit-level=high
npm run test:integration
npm run test:discovery
npm run test:management
npm run build:cloudflare
```

Integration runners accept `TEST_BASE_URL`. They require the owner's configured secrets and are not run against an unrelated store. Private browser screenshots, provider diagnostics and native runtime evidence stay in the ignored `.qa` directory.

The production build retains a known non-blocking Big Shoulders fallback-font metrics warning and the OpenNext Windows advisory. Actual fonts, rendered layouts and the deployed Worker are checked independently. No test run establishes that software will remain defect-free under every possible future input or provider outage.
