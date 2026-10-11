# Release verification — 1.2.0

Date: 11 October 2026. Scope: the demonstration marketplace described in PRD.md.

## Automated verification

- Twelve Vitest tests passed. Coverage includes paise totals, Indian addresses and map coordinate validation, return windows, signed sessions, webhook HMACs, real RSA-signed Google JWT validation, provider/account rejection, administrator exclusion, hashed eight-digit Brevo codes and failed email replacement handling.
- Twelve HTTP/database integration scenarios passed locally: registration role restriction, catalogue/pagination, ownership and administrator checks, cart/saved/wishlist persistence, server prices/coupons/idempotency, support access, fulfilment/review eligibility, one-time returns/refunds/restocking, expired holds and repeated cancellation. The inventory race launched 50 buyers for ten units and produced exactly ten successful orders with no overselling.
- Five discovery integration scenarios passed locally: curated listings, synonyms, typo recovery, scoped results and pagination; protected map endpoints; actual Ola landmark search/reverse lookup; expired/wrong/single-use verification codes; and coordinates persisted into addresses and order snapshots.
- Browser checks verify automatic campaign advancement, stable page position while typing in sticky search, owner login without Google/signup, and actual Ola selection/address save. Nine desktop/phone/reported-width captures are checked for overflow, missing images and JavaScript errors. Final review corrections add visible desktop filters and full-width phone address assertions.
- Dependency audit reports zero vulnerabilities. TypeScript and Windows Cloudflare production build passed.

## Provider and native checks

The dedicated Firebase project styleshopz-market-2026 has Google enabled, the live worker domain authorized and the signed Android certificate registered. The actual browser popup reached Google's account sign-in page. JWT/account validation is tested independently; a real person's completed Google sign-in has not been exercised by the maintainer.

Brevo delivery is deliberately unconfigured at the owner's request. BREVO_API_KEY and MAIL_FROM are blank in private .env.local. Tests validate code creation, hashing, expiry and consumption; no actual delivered verification or recovery email is claimed. Gemini/Groq also await owner keys.

Android release 1.2.0 (versionCode 3) includes native Google sign-in and GPS plugins. The signed APK built with JDK 21/SDK 36, passed signing verification and installed on the Android 15 emulator. Android 8 is the minimum supported version. Physical-device compatibility and Play Store publication are outside this release.

## Visual review

The independent Impeccable finish review requested four corrections: visible desktop filters, replacement of numbered catalogue clones, a stacked phone assistant promotion and full-width phone saved-address cards. Replacement captures passed with disposition **ship** on all four scored fixes, with no attributable regressions observed. Review covers supplied web captures and sampled source, not every administrator or native state. A fresh documenter records the actual updated system; generic agents use the packaged Impeccable role references.

Seven new product photographs were generated with the built-in image tool. The provenance scan covers 31 raster assets with zero missing records. Exact prompts and saved asset paths are in IMAGE_PROMPTS.txt. Generated photographs and specifications remain illustrative sample content.

APK SHA-256: dfd7c0b70f9b8333dbd5051bb203466eb1777d8db3992fdf47c17819baa99330. The public download is verified against this signed artifact during deployment.

## Release boundaries

No real charges, deliveries, seller payouts, production KYC or tax-compliance integration is enabled. Razorpay test-mode adapters require owner credentials and external validation. Shopping requires connectivity; Android offline mode provides recovery rather than offline ordering. Automated tests and reviews do not prove absence of all defects.

## Deployed release verification

The Cloudflare release at source b39cebd5b1cc22bce4df54e5c83cc37c6acd18c0 passed all twelve commerce scenarios, five discovery scenarios and the browser checks against the actual worker on 11 October 2026. GitHub Actions run 38161949023 passed dependency installation/audit, twelve unit tests, TypeScript and the Linux Cloudflare build. Public APK SHA-256 matches the signed local file exactly.

The installed Android release loaded the updated home, signed in using an isolated email fixture and opened Google's system account sign-in. With an emulator GPS point and explicit location permission, Ola resolved Victoria Memorial in Kolkata; pin confirmation filled the written city, state, pincode and coordinates. A final address normalization correction recognizes Ola's street_address field and avoids duplicate area lines. No real Google account was signed in. Test accounts were removed; stock was restored after order fixtures.

Private GitHub release v1.2.0 backs up the signed APK. Dispatch and other projects were not modified.
