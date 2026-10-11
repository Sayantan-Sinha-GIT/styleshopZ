# Owner and maintainer guide

## Open the app

Website: https://styleshopz.srimantasutapa123.workers.dev
Android download: https://styleshopz.srimantasutapa123.workers.dev/downloads/styleshopz-1.2.0.apk

The APK is for direct Android installation. Download it on the phone, open it and allow that browser/file app to install the package if Android asks. Android 8 or later and an internet connection are required. The website also works directly in a phone browser.

Private administrator and seller access is in OWNER_ACCESS.txt on the owner's computer. It is excluded from Git. There are no published default administrator passwords. Customers can create their own accounts. Preserve the private owner file and Android signing key in a secure backup.

## Services and costs

The deployed app uses Cloudflare Workers and Neon PostgreSQL. Customer Google sign-in uses a dedicated Firebase project, styleshopz-market-2026. Ola handles address lookup through the server; the map uses attributed OpenStreetMap tiles. Dispatch and the owner's other projects are unchanged. Provider quotas still apply. This release uses demonstration payments and manually simulated fulfilment.

## Optional keys later

Give the maintainer Gemini and/or Groq credentials when ready. They belong in Cloudflare worker secrets, not browser code. The guided assistant already works without them. Optional variables are GEMINI_API_KEY, GROQ_API_KEY and their model names.

Brevo verification and password recovery are built. The private .env.local already contains blank BREVO_API_KEY= and MAIL_FROM= lines. Leave them blank until ready; later paste a Brevo API key and the sender email verified in Brevo after the equals signs. Do not put these values in chat or Git. Ask the maintainer to publish the secrets to Cloudflare and test an actual email. Instructions for obtaining the key/sender can be walked through when the owner is ready.

Email delivery remains unavailable until both values are configured. Then new email accounts receive eight-digit verification codes, checkout requires verification, and password recovery uses expiring single-use codes. Existing accounts were grandfathered as verified. Google accounts are verified through Google. The fixed administrator account does not offer Google signup or customer password recovery.

FIREBASE_WEB_API_KEY and OLA_MAPS_API_KEY are already configured locally and on Cloudflare. The Firebase web API key is public application configuration returned by /api/config; the Ola key stays on the server. Do not replace these with Dispatch's database or authentication configuration. The Google web provider, worker domain and Android release certificate are registered in the dedicated Firebase project.

Razorpay is restricted to test-mode keys and requires all three of RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET. Configure the provider's payment.captured webhook at /api/payments/webhook. Enable only after testing successful, failed, duplicate and delayed payments against the provider. Demo mode remains the current release configuration; it never charges money.

## Local maintenance

Use Node.js 24. Install dependencies with npm ci. Configure .env.local from .env.example. DATABASE_URL must use TLS. AUTH_SECRET must be a random secret of at least 32 characters; changing it signs everyone out. Keep DEMO_MODE=true for this release.

npm run migrate applies the baseline and upgrade migrations. npm run db:upgrade applies only the upgrades. Back up a database before running a migration against a different environment. The development seed is explicitly gated, skips a populated non-seed catalogue and does not overwrite existing passwords.

Run npm test, npm run lint, npm audit --audit-level=high, npm run test:integration and npm run test:discovery with a running local app. The integration runners also accept TEST_BASE_URL for the deployed worker. They create and clean up their own fixtures; administrator audit records remain. Upgrades are recorded in schema_migrations and are applied once.

Deploy with npm run build:cloudflare followed by npx wrangler deploy. Supply DATABASE_URL and AUTH_SECRET using Wrangler secrets. Set APP_COMMIT and APP_BUILT_AT to the deployed source revision/build time when releasing. /api/version identifies the deployed build. GitHub Actions performs verification; it does not automatically publish deployments or hold production secrets.

## Android maintenance

The Android project is in android and loads the URL in capacitor.config.json. UI/server fixes deploy to the website and are picked up by the app. Changes to native behaviour, permissions, icons or the server URL need a new signed APK and a higher Android versionCode.

The release signing key is outside the repository at C:/Users/Sayantan Sinha/.codex/styleshopz-release/styleshopz.jks. Its password is stored privately alongside it. Losing the key prevents installing future updates over this signed application. Do not publish either file.

Use JDK 21, Android SDK platform 36 and the Gradle wrapper. Set STYLESHOPZ_KEYSTORE to the key path and STYLESHOPZ_STORE_PASSWORD to its password. The key alias is styleshopz. Run npx cap sync android, then android/gradlew.bat assembleRelease from the android directory. On this Windows host set JDK_JAVA_OPTIONS to -Djdk.net.unixdomain.tmpdir pointing to a short existing temporary directory; the packaged host's default temporary path is too long for Java's Unix-domain socket path.

The output is android/app/build/outputs/apk/release/app-release.apk. Verify it with Android build-tools apksigner, copy it to public/downloads/styleshopz-1.2.0.apk, then build/deploy the worker. APK files and keystores are excluded from Git. The public download is included in the deployed static assets; GitHub releases provide an owner-accessible backup in the private repository.

Release 1.2.0 uses versionCode 3 and includes native Google sign-in and location permission support. Its signing certificate SHA-1 is 7fc5c6f3abedcf4f7771edec6b8ed6ca15aa2836. Re-register the new certificate with Firebase if a future release uses a different signing key. GPS is optional; shoppers can search the map or enter an address manually. Every order still requires a complete written Indian delivery address.

## Data boundaries

Generated product photographs and specifications are illustrative. Sample feedback is labelled. Uploaded verification documents are private to their owner and administrator. Images are limited to 5 MB and stored in the existing database for this demo; plan object storage and retention limits before a real catalogue launch. Review the release boundaries in PRD.md before converting this into a real-money shop.
