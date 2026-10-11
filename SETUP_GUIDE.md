# styleshopZ Complete Setup & Service Connection Guide

This guide provides simple, numbered, click-by-click instructions for setting up all 11 services used by **styleshopZ**. All services are on **100% free tiers** with **no credit card required**.

---

## 1. Neon Postgres (Database) — Already Connected & Live!
Your database is hosted on Neon in the Singapore AWS region (`aws-ap-southeast-1`).
- **Connection URL**: Set in `.env.local` and Vercel Environment Variables as `DATABASE_URL`.
- **Seeded Data**: 525 products, 1,048 variants, 28 categories, 12 active lightning deals, 3 coupons, and test accounts.
- **Test Accounts**:
Legacy demonstration credentials removed.
Legacy demonstration credentials removed.
Legacy demonstration credentials removed.

---

## 2. Vercel (Hosting & Deployments) — Already Connected & Live!
Your production application is deployed at: **https://styleshopz.vercel.app**
- Linked to GitHub repository: `Sayantan-Sinha-GIT/styleshopZ`.
- Every push to `main` automatically triggers an optimized production build.

---

## 3. GitHub (Source Control) — Already Connected!
- Repository: **https://github.com/Sayantan-Sinha-GIT/styleshopZ**
- Commit author is set strictly to `Sayantan Sinha <322015364+Sayantan-Sinha-GIT@users.noreply.github.com>`.
- AI trace files (`GEMINI.md`, `PLAYBOOK.txt`, etc.) are hidden via `.git/info/exclude`.

---

## 4. Razorpay Test Mode (Simulated Indian Payments)
*Note: In local and preview environments, styleshopZ includes a built-in test-mode simulator, so real keys are optional.* To configure official Razorpay test keys:
1. Go to **https://dashboard.razorpay.com** in your browser.
2. Click **Sign Up** using your Google account or email (free, no credit card required).
3. On the left navigation sidebar, make sure the toggle at the top is set to **Test Mode** (orange badge).
4. Click **Settings** in the bottom-left of the sidebar.
5. Click the **API Keys** tab at the top.
6. Click the blue button labeled **Generate Key**.
7. Copy the **Key ID** (starts with `rzp_test_...`) and the **Key Secret**.
8. In Vercel Project Settings &rarr; **Environment Variables**, add:
   - `RAZORPAY_KEY_ID`: Paste your Key ID.
   - `RAZORPAY_KEY_SECRET`: Paste your Key Secret.
9. Click **Save**.

---

## 5. Google AI Studio (Gemini Assistant API)
*Note: The assistant includes built-in catalogue search tools out of the box.* To connect the full Gemini LLM:
1. Go to **https://aistudio.google.com/** in your browser.
2. Sign in with your standard Google Account.
3. Click the blue button in the top left labeled **Get API key**.
4. Click **Create API key**.
5. Select or create any free project and click **Create API key in existing project**.
6. Copy the generated key.
7. Add to Vercel Environment Variables:
   - `GEMINI_API_KEY`: Paste your key.
8. Click **Save**.

---

## 6. Android Mobile App (Capacitor Shell)
styleshopZ includes a complete Android configuration in `capacitor.config.json` targeting Android 8.0 (API 26) through Android 14 (API 34).
1. Make sure you have **Android Studio** installed on your computer.
2. Open your terminal in the project directory:
   ```bash
   npx cap add android
   npx cap sync android
   npx cap open android
   ```
3. In Android Studio, click **Build** &rarr; **Build Bundle(s) / APK(s)** &rarr; **Build APK(s)**.
4. The generated `.apk` file can be installed on any Android phone running Android 8 or newer.

---

## 7. Sentry (Error Monitoring & Crash Reports)
1. Go to **https://sentry.io/signup/**.
2. Sign up on the free Developer plan.
3. Click **Create Project** &rarr; select **Next.js**.
4. Sentry will display your **DSN** URL (e.g. `https://xxxx@o0.ingest.sentry.io/0`).
5. In Vercel Environment Variables, add:
   - `NEXT_PUBLIC_SENTRY_DSN`: Paste your DSN URL.
6. Click **Save**.

---

## 8. Upstash Redis (Serverless Rate Limiting & Cache)
1. Go to **https://console.upstash.com/**.
2. Sign up with GitHub (free tier gives 10,000 commands/day).
3. Click **Create Database**.
4. Enter name: `styleshopz-cache`, select region: `Singapore (ap-southeast-1)`.
5. Click **Create**.
6. Scroll down to the **REST API** section and copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
7. Add both variables to Vercel and click **Save**.

---

## 9. PostHog (Product Analytics)
1. Go to **https://eu.posthog.com/signup** or **https://us.posthog.com/signup**.
2. Select the free tier (1,000,000 free events/month).
3. Go to **Project Settings** &rarr; copy your **Project API Key**.
4. In Vercel Environment Variables, add:
   - `NEXT_PUBLIC_POSTHOG_KEY`: Paste your key.
   - `NEXT_PUBLIC_POSTHOG_HOST`: Set to `https://eu.i.posthog.com` or `https://us.i.posthog.com`.
5. Click **Save**.

---

## 10. Resend (Email Notifications for Order Milestones)
1. Go to **https://resend.com/signup**.
2. Sign up for free (3,000 emails/month free).
3. Click **API Keys** on the left menu.
4. Click **Create API Key**, name it `styleshopz-key`, and click **Add**.
5. Copy your API key (starts with `re_...`).
6. In Vercel Environment Variables, add:
   - `RESEND_API_KEY`: Paste your key.
7. Click **Save**.

---

## 11. Cloudflare CDN (DNS & Edge Caching)
1. Go to **https://dash.cloudflare.com/sign-up**.
2. Enter your custom domain name (e.g. `styleshopz.com`) if you purchase one in the future.
3. Select the **Free Plan** ($0/month).
4. Point your domain nameservers to Cloudflare as instructed on the screen.
5. In Cloudflare DNS records, add a CNAME record pointing `@` to `cname.vercel-dns.com`.
