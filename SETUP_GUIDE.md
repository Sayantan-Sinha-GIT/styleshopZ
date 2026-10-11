# Owner and maintainer guide

## Open the app

Website: https://styleshopz.srimantasutapa123.workers.dev
Android download: https://styleshopz.srimantasutapa123.workers.dev/downloads/styleshopz-1.1.0.apk

The APK is for direct Android installation. Download it on the phone, open it and allow that browser/file app to install the package if Android asks. Android 8 or later and an internet connection are required. The website also works directly in a phone browser.

Private administrator and seller access is in OWNER_ACCESS.txt on the owner's computer. It is excluded from Git. There are no published default administrator passwords. Customers can create their own accounts. Preserve the private owner file and Android signing key in a secure backup.

## Services and costs

The deployed app uses Cloudflare Workers and Neon PostgreSQL. It does not require another Vercel, Firebase, Netlify or Supabase project. No other project is changed by this release. Hosting/database account quotas still apply. This release uses demonstration payments and manually simulated fulfilment.

## Optional keys later

Give the maintainer Gemini and/or Groq credentials when ready. They belong in Cloudflare worker secrets, not browser code. The guided assistant already works without them. Optional variables are GEMINI_API_KEY, GROQ_API_KEY and their model names.

Password reset requires RESEND_API_KEY plus MAIL_FROM set to a verified sender. Until then the app explains that email recovery is unavailable.

Razorpay is restricted to test-mode keys and requires all three of RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET. Configure the provider's payment.captured webhook at /api/payments/webhook. Enable only after testing successful, failed, duplicate and delayed payments against the provider. Demo mode remains the current release configuration; it never charges money.

## Local maintenance

Use Node.js 24. Install dependencies with npm ci. Configure .env.local from .env.example. DATABASE_URL must use TLS. AUTH_SECRET must be a random secret of at least 32 characters; changing it signs everyone out. Keep DEMO_MODE=true for this release.

npm run migrate applies the baseline and upgrade migrations. npm run db:upgrade applies only the upgrades. Back up a database before running a migration against a different environment. The development seed is explicitly gated, skips a populated non-seed catalogue and does not overwrite existing passwords.

Run npm test, npm run lint, npm audit --audit-level=high and npm run test:integration with a running local app. The integration runner also accepts TEST_BASE_URL for the deployed worker. It creates and cleans up its own fixtures; administrator audit records remain.

Deploy with npm run build:cloudflare followed by npx wrangler deploy. Supply DATABASE_URL and AUTH_SECRET using Wrangler secrets. Set APP_COMMIT and APP_BUILT_AT to the deployed source revision/build time when releasing. /api/version identifies the deployed build. GitHub Actions performs verification; it does not automatically publish deployments or hold production secrets.

## Android maintenance

The Android project is in android and loads the URL in capacitor.config.json. UI/server fixes deploy to the website and are picked up by the app. Changes to native behaviour, permissions, icons or the server URL need a new signed APK and a higher Android versionCode.

The release signing key is outside the repository at C:/Users/Sayantan Sinha/.codex/styleshopz-release/styleshopz.jks. Its password is stored privately alongside it. Losing the key prevents installing future updates over this signed application. Do not publish either file.

Use JDK 21, Android SDK platform 36 and the Gradle wrapper. Set STYLESHOPZ_KEYSTORE to the key path and STYLESHOPZ_STORE_PASSWORD to its password. The key alias is styleshopz. Run npx cap sync android, then android/gradlew.bat assembleRelease from the android directory. On this Windows host set JDK_JAVA_OPTIONS to -Djdk.net.unixdomain.tmpdir pointing to a short existing temporary directory; the packaged host's default temporary path is too long for Java's Unix-domain socket path.

The output is android/app/build/outputs/apk/release/app-release.apk. Verify it with Android build-tools apksigner, copy it to public/downloads/styleshopz-1.1.0.apk, then build/deploy the worker. APK files and keystores are excluded from Git. The public download is included in the deployed static assets; GitHub releases provide an owner-accessible backup in the private repository.

## Data boundaries

Generated product photographs and specifications are illustrative. Sample feedback is labelled. Uploaded verification documents are private to their owner and administrator. Images are limited to 5 MB and stored in the existing database for this demo; plan object storage and retention limits before a real catalogue launch. Review the release boundaries in PRD.md before converting this into a real-money shop.
