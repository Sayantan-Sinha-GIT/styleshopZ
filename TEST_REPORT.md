# styleshopZ 1.6.0 — catalogue, seller photos and demo courier

Verified 21 October 2026 against the Neon database, local production build, headless Chrome at desktop and phone widths, and an Android emulator running the signed Flutter APK. The owner account was rotated to the requested credentials outside Git, and its old session and email sign-in were rejected. Credentials are kept in the ignored `OWNER_ACCESS.txt` on the owner's machine.

| Release check | Result |
| --- | --- |
| Catalogue expansion | 51 new sample products across all 17 leaf categories; 153 live product detail APIs, 22 distinct image URLs, valid prices and nonnegative stock checked |
| Seller photo | Own public photo uploaded and displayed on a shopper product page; another seller's photo and private KYC photo rejected |
| Browser journey | 23/23 scenarios passed with no page errors: shopping, checkout, owner/seller views, mobile layouts, returns, support and Razorpay test checkout |
| API/database integration | 24 shopper/order, 12 management and 5 discovery/location scenarios passed |
| TypeScript, Vitest, Flutter | TypeScript passed, 35 Vitest tests passed, Flutter analyzer clean and 9 widget tests passed |
| Dependencies | `npm audit --audit-level=high`: 0 vulnerabilities |
| Android emulator | Flutter 1.2.0 installed and launched; home and search screens inspected, with clear system bars and no overlap |
| Signed APK | v2 signature verified; SHA-256 `2f476f53c642ff9f7762df5425b23f29020d9802f2e3fa253133dc662fe743d4` |

The built-in Demo Courier assigns a tracking ID when a seller marks an item shipped. The seller can progress it through out-for-delivery and delivered; the shopper sees the same status. This is a simulation and no real parcel is booked. Razorpay uses **test mode**: the hosted checkout widget opens and provider test transactions were previously captured and refunded, but no real money can be accepted with these keys. Seller image ownership is enforced server-side, including a ban on using private uploads as public product photos.

The Flutter shopper/seller APK is versionName 1.2.0, versionCode 3, package `com.styleshopz.styleshopz_flutter`. The owner-only Capacitor APK remains 1.5.0 and is committed under `releases/`; it loads the hosted owner console. The APKs have separate purposes. The web and phone screens were inspected, but this verification cannot prove behavior on every Android device or future provider availability.

## Previous release: 1.5.0

Verified 21 October 2026 against the live Cloudflare Worker, a real Neon test fixture set, headless Chrome at 390 px and 1365 px, and an Android 15 emulator running the signed owner APK. The public storefront signs in shoppers and sellers; owner email/password sign-in is at `/4632/admin/login`, and the old `/admin` page returns 404. The route is visible in public source, so role authorization, password validation and rate limiting remain the security boundary.

| Release check | Result |
| --- | --- |
| Cloudflare production build, TypeScript and 35 Vitest tests | Passed |
| Dependency audit | 0 vulnerabilities |
| Live shopper/order, seller/admin, and discovery/location integrations | 24 + 11 + 5 passed |
| Full live browser flows | 23 passed, no page errors |
| Owner credential and request-security probes | 8 passed: owner-only login, seller exclusion, old URL 404, anonymous denial, security headers, cross-site and non-JSON denial |
| Owner visual pass | Login and all eight sections viewed at phone and desktop widths; no horizontal overflow |
| Android 15 native check | Installed 1.5.0, signed in with the owner account, visually inspected status-bar clearance, dashboard, menu and seller cards; 6 release instrumentation tests passed |
| Signed admin APK secret scan | 0 private credentials in 533 APK entries; v2 signature verified |

The Android pass exposed two issues after the first build: the system-native section selector opened a bright dialog, and the bundled offline screen led to the storefront. The selector now opens a dark in-page menu, and offline recovery returns to owner sign-in. The seller console also hides deleted QA sellers, keeping them in account/audit history without presenting them as active approvals. Large user, moderation and audit lists render 30 rows at a time with an explicit continuation control.

The admin APK is `releases/styleshopz-admin-1.5.0.apk`, versionName 1.5.0, versionCode 8, SHA-256 `6d1881ad13e49225d804ab7a70bf82b018750a58125f71b2716ae938b7dc17ce`. The Flutter shopper/seller APK remains release 1.1.0. The owner APK is deliberately separate and should not be offered as the shopper download. External services and every future Android device cannot be exhaustively proven by this test run; checkout and fulfilment remain prototype simulations.

## Previous release: 1.4.0

Verified 19 October 2026 on the live Cloudflare Worker and an Android 15 emulator. This release adds a separate native Flutter seller workspace alongside the shopper app. The Capacitor APK is now labelled and presented as an owner-only admin console; shoppers and sellers should install the Flutter APK.

| Current release check | Result |
| --- | --- |
| Next.js production build and TypeScript | Passed |
| Vitest | 35 tests across 9 files passed |
| Flutter analyzer and widget tests | Clean; 9 tests passed |
| Live API/database integration | 24 shopper/order checks, 11 management checks, 5 discovery/location checks passed |
| Full live browser flow | 23 scenarios passed; no page errors |
| Android 15 seller UI | Email sign-in, product/variant creation and editing, photo picker and upload, search, shop profile, and placed → packed → shipped → out for delivery → delivered passed |
| Android 15 admin UI | Signed owner login, overview/users tabs, hidden consumer navigation, and status-bar clearance checked |
| Signed release APKs | Flutter 1.1.0 and admin 1.4.0 installed; package IDs, versions, signatures and secret scans verified |

The seller tracking dialog initially failed after shipping because its text controller was disposed during a navigation update. I reproduced it in a widget test, corrected the dialog state, and replayed the full fulfilment sequence on the emulator. The first web build exhausted Windows resources while scanning generated Flutter binaries; explicit Tailwind source paths resolved it. Both final APK scans found no server-side credentials, owner password or signing password.

The Flutter shopper/seller APK SHA-256 is `0080a74137f79d7000909a9135d08d46fc2354ead565d123bfb11ee57e9068b5`. The owner-only Capacitor APK SHA-256 is `54783919da5e08780979cfde049dc517417f556b4f6e926ba24f8ed64f2d8387`.

All checkout, delivery, refund and seller payout flows remain simulations. Google sign-in was confirmed by the owner on their Android phone before this seller expansion; the new signed APK retained the same Firebase project and signing certificate, but the Google account chooser was not rerun on a physical phone for this exact build. Emulator and automated tests do not establish compatibility with every Android device or future provider outage.

## Earlier release evidence (1.3.2)

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
