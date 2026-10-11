# Release verification — 1.1.0

Date: 11 October 2026. Scope: the demonstration marketplace described in PRD.md.

## Observed local results

- Six Vitest server-rule tests passed: exact paise totals/thresholds/caps, line-item validation, Indian address validation, return-window boundaries, signed-session tamper/expiry rejection and raw webhook HMAC verification.
- Twelve HTTP/database integration scenarios passed with isolated fixtures and cleanup: registration role restriction/session cookie; catalogue details/pagination; unauthenticated and admin access; cart/saved/wishlist persistence; server prices/coupons/idempotency; cross-account order/support protection and admin reply; sequential fulfilment/review eligibility; one-time return refund/restock; invalid webhook and unpurchased review rejection; expired holds; 50 buyers racing for 10 units; repeated cancellation.
- The race produced exactly ten successful orders, stock zero, and ten units restored after cancellation. This is a single-variant contention test, not a capacity benchmark.
- Actual browser signup, product selection, bag, address entry, demo checkout and order confirmation succeeded. Thirteen desktop/mobile views showed no horizontal overflow, missing images or JavaScript page errors in the observed flows.
- Search query synchronization passed headphones → shirt → Back → headphones. A selected empty wishlist recovered correctly while another list held an item.
- Independent finish review resolved all five findings: sample-content truth, manual-only hero controls, query synchronization, selected-list empty state and customer-facing assistant copy. Final disposition: ship for these scored fixes. The review is bounded to the supplied web captures, not an exhaustive audit of every admin state.
- Generic subagent fallbacks used the packaged Impeccable reviewer/documenter role references because named harness presets were unavailable. Raster provenance scan: 26 images, zero missing metadata.
- Android release APK 1.1.0 (versionCode 2) built successfully with JDK 21/SDK 36, passed apksigner verification and installed on the Android 15 emulator. Minimum supported Android version: 8. Signing key remains outside the repository.

## Deployment verification

Pending final live checks; the source will be updated with the deployed revision and observed results before handoff.

## External boundaries

Gemini/Groq credentials, a verified password-reset sender and Razorpay test/webhook credentials are not configured for this release. Their external provider flows are not claimed as tested. No real money, delivery, seller payout or tax-compliance integration is enabled. Shopping is online; the Android offline page provides recovery, not offline ordering.

The dependency audit and build results apply to the lockfile and source committed with this release. They do not prove absence of every security defect. No Play Store publication or physical-device compatibility matrix was performed.
