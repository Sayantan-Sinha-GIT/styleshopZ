# styleshopZ native shopper and seller app

This is the Flutter Android app for shoppers and sellers. It connects to the existing styleshopZ Cloudflare API and shares the live catalogue, accounts, orders and seller workspace. Admin control stays on the website and in a separate owner-only Capacitor app.

## What shoppers can do

- Browse an automatically rotating collection, search and filter the catalogue, inspect variants and reviews, and save products locally.
- Add items to a guest bag, sign in with email or Google, and merge the guest bag with the account bag.
- Verify an email, request a Brevo password-reset code, save an Indian delivery address using Ola place search and reverse geocoding, and place simulated demo/COD orders.
- See order history and tracking events, cancel eligible orders, and use the shopping assistant.
- Apply live shop coupons at checkout; the server checks eligibility and calculates the discount.

## What sellers can do

- Create a seller account with a shop name, sign in by email, and see approval status.
- Update shop and optional demo KYC details, select a product photo, create and edit products, variants, prices and stock, and archive listings.
- Review simulated order items and advance fulfilment step by step with a tracking ID. See returns and simulated ledger totals.

The Flutter app does not accept admin accounts. The separate Capacitor APK is for owner/admin control only; shoppers and sellers should not download it. The backend, service keys, and storefront website remain in the parent project. The native map uses OpenStreetMap tiles with attribution; Ola location lookup runs through the parent's server so its private key stays there.

## Build locally

Install Flutter and the Android SDK, then run `flutter pub get`, `flutter analyze`, and `flutter test` in this folder. Google sign-in requires a local, ignored `.secrets/flutter.json` containing `{"FIREBASE_API_KEY":"your Firebase web API key"}`. This is client configuration, never the Firebase Admin key. Register this Android package (`com.styleshopz.styleshopz_flutter`) and your signing certificate SHA-1 and SHA-256 in the same Firebase project before building for another device.

For a debug APK run `flutter build apk --debug --dart-define-from-file=.secrets/flutter.json`. For a release APK set `STYLESHOPZ_KEYSTORE` to a private Android signing keystore path and `STYLESHOPZ_STORE_PASSWORD` to its password, then run `flutter build apk --release --dart-define-from-file=.secrets/flutter.json`. Output is under `build/app/outputs/flutter-apk/`. Never commit `.secrets`, keystores, or APKs.

The native app has its own Android package, so it can coexist with the owner-only Capacitor APK. It uses the hosted API URL in `lib/shop_api.dart`; change that only when intentionally connecting it to a different deployment. Checkout and seller fulfilment are demonstrations: no real money is charged, parcel sent or seller payout made.
