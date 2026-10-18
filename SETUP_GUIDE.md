# Owner and maintainer guide

## Open the app

Website: https://styleshopz.srimantasutapa123.workers.dev
Android download: https://styleshopz.srimantasutapa123.workers.dev/downloads/styleshopz-1.3.0.apk

The APK is for direct Android installation. Download it on the phone, open it and allow that browser/file app to install the package if Android asks. Android 8 or later and an internet connection are required. The website also works directly in a phone browser.

Private administrator and seller access is in OWNER_ACCESS.txt on the owner's computer. It is excluded from Git. There are no published default administrator passwords. Customers can create their own accounts. Preserve the private owner file and Android signing key in a secure backup.

## Services and costs

The deployed app uses Cloudflare Workers and Neon PostgreSQL. Customer Google sign-in uses a dedicated Firebase project, styleshopz-market-2026. Ola handles address lookup through the server; the map uses attributed OpenStreetMap tiles. Dispatch and the owner's other projects are unchanged. Provider quotas still apply. This release uses demonstration payments and manually simulated fulfilment.

## Provider configuration

The owner's hosted prototype has Gemini/Groq and Brevo configured using Cloudflare Worker secrets. Google sign-in and Ola address lookup are also configured. New clones must supply their own credentials through .env.local; never commit API keys, database URLs, webhook secrets, owner credentials or signing files. The supplied .env.example contains names and blank placeholders only.

Gemini is tried first and Groq is the fallback. Each provider request has an eight-second timeout. Model availability changes; the hosted configuration currently uses gemini-flash-lite-latest and openai/gpt-oss-20b. The assistant remains bounded to supplied catalogue/order data, and proposed mutations require a single-use signed confirmation.

BREVO_API_KEY and MAIL_FROM enable email verification and password reset. MAIL_FROM must identify a sender verified in the same Brevo account. An existing verified free-email sender can be reused; a purchased domain is not required for this prototype. Provider free-plan limits apply. New email accounts need verification before checkout. Google accounts are verified through Google. The administrator uses fixed private email/password credentials and cannot use Google or customer password recovery.

FIREBASE_WEB_API_KEY is public application configuration returned by /api/config; the Ola key remains server-side. The dedicated Firebase project is styleshopz-market-2026. The web domain and release signing certificate are registered there. No Play Store account is needed for direct APK installation.

Razorpay accepts TEST keys only and requires RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET. Configure a payment.captured webhook at https://styleshopz.srimantasutapa123.workers.dev/api/payments/webhook using the same webhook secret. Demo payment and simulated COD remain available. No real payment or courier integration is included.

Razorpay refunds require enough available sandbox balance, including the effect of provider fees. A first isolated test payment can therefore be captured successfully while its full refund receives a generic provider error. The final hosted test confirmed this: a separate fake reserve payment allowed the original full refund to process. The prototype keeps a virtual test reserve; do not add real funds or switch to live keys. If a future sandbox refund fails, the app preserves the active order and stock until the provider accepts the refund. Check the test dashboard balance before retrying.

## Local maintenance

Use Node.js 24. Install dependencies with npm ci. Configure .env.local from .env.example. DATABASE_URL must use TLS. AUTH_SECRET must be a random secret of at least 32 characters; changing it signs everyone out. Keep DEMO_MODE=true for this release.

npm run migrate applies the baseline and upgrade migrations. npm run db:upgrade applies only the upgrades. Back up a database before running a migration against a different environment. The development seed is explicitly gated, skips a populated non-seed catalogue and does not overwrite existing passwords.

Run npm test, npm run lint, npm audit --audit-level=high, npm run test:integration and npm run test:discovery with a running local app. The integration runners also accept TEST_BASE_URL for the deployed worker. They create and clean up their own fixtures; administrator audit records remain. Upgrades are recorded in schema_migrations and are applied once.

Deploy with npm run build:cloudflare followed by npx wrangler deploy. Supply DATABASE_URL and AUTH_SECRET using Wrangler secrets. Set APP_COMMIT and APP_BUILT_AT to the deployed source revision/build time when releasing. /api/version identifies the deployed build. GitHub Actions performs verification; it does not automatically publish deployments or hold production secrets.

## Android maintenance

The Android project is in android and loads the URL in capacitor.config.json. UI/server fixes deploy to the website and are picked up by the app. Changes to native behaviour, permissions, icons or the server URL need a new signed APK and a higher Android versionCode.

The release signing key is outside the repository at C:/Users/Sayantan Sinha/.codex/styleshopz-release/styleshopz.jks. Its password is stored privately alongside it. Losing the key prevents installing future updates over this signed application. Do not publish either file.

Use JDK 21, Android SDK platform 36 and the Gradle wrapper. Set STYLESHOPZ_KEYSTORE to the key path and STYLESHOPZ_STORE_PASSWORD to its password. The key alias is styleshopz. Run npx cap sync android, then android/gradlew.bat assembleRelease from the android directory. On this Windows host set JDK_JAVA_OPTIONS to -Djdk.net.unixdomain.tmpdir pointing to a short existing temporary directory; the packaged host's default temporary path is too long for Java's Unix-domain socket path.

The output is android/app/build/outputs/apk/release/app-release.apk. Verify it with Android build-tools apksigner, copy it to public/downloads/styleshopz-1.3.0.apk, then build/deploy the worker. APK files and keystores are excluded from Git. The public download is included in the deployed static assets; GitHub releases can provide a public APK backup; server credentials and signing keys remain private.

Release 1.3.0 uses versionCode 4 and includes native Google sign-in and location permission support. Its signing certificate SHA-1 is 7fc5c6f3abedcf4f7771edec6b8ed6ca15aa2836. Re-register the new certificate with Firebase if a future release uses a different signing key. GPS is optional; shoppers can search the map or enter an address manually. Every order still requires a complete written Indian delivery address.

## Data boundaries

Generated product photographs and specifications are illustrative. Sample feedback is labelled. Uploaded verification documents are private to their owner and administrator. Images are limited to 5 MB and stored in the existing database for this demo; plan object storage and retention limits before a real catalogue launch. Review the release boundaries in PRD.md before converting this into a real-money shop.
