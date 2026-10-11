# styleshopZ Complete Setup & Service Connection Guide

This guide provides simple, numbered, click-by-click instructions for setting up all external services used by **styleshopZ**. All services are on **100% free tiers** with **no credit card required anywhere**.

---

## 1. Neon Postgres (Database) — Already Connected & Live!
Your database is hosted on Neon in the Singapore AWS region (`aws-ap-southeast-1`).
- **Connection URL**: Set in `.env.local` and Cloudflare Environment Variables as `DATABASE_URL`.
- **Seeded Data**: 525 products, 1,048 variants, 28 categories, 12 active lightning deals, 3 coupons, and test accounts.
- **Pre-Seeded Test Accounts**:
Legacy demonstration credentials removed.
Legacy demonstration credentials removed.
Legacy demonstration credentials removed.

---

## 2. Cloudflare Pages (Hosting & Edge Deployments) — Babysitting Guide

Your production storefront and panels deploy directly to **Cloudflare Pages** (`styleshopz.pages.dev`).

### Step-by-Step Setup (No Credit Card Required):
1. Open your browser and go to **https://dash.cloudflare.com/sign-up**.
2. Enter your email and choose a secure password, then click the blue button **Create Account**.
3. In your email inbox, open the Cloudflare verification email and click the confirmation link.
4. On the Cloudflare dashboard left-hand sidebar, click **Compute (Workers & Pages)** (or **Workers & Pages**).
5. Click the blue button labeled **Create application**.
6. At the top of the screen, click the tab labeled **Pages**.
7. Click the button labeled **Connect to Git**.
8. Click **Connect GitHub**. If prompted by GitHub, choose your account `Sayantan-Sinha-GIT`, authorize Cloudflare, and select **All repositories** (or choose `styleshopZ`).
9. Under **Select a repository**, choose **Sayantan-Sinha-GIT/styleshopZ** and click **Begin setup**.
10. In the **Set up builds and deployments** form:
    - **Project name**: Type `styleshopz` (this gives you the free live URL `https://styleshopz.pages.dev`).
    - **Production branch**: Leave as `main`.
    - **Framework preset**: Select **Next.js** from the dropdown menu (or select **None** if using custom build).
    - **Build command**: Type `npm run build`
    - **Build output directory**: Type `.next` (or leave default for Next.js preset).
11. Scroll down to **Environment variables (advanced)**:
    - Click **Add variable** and add each of these:
      - Variable name: `NODE_VERSION` &rarr; Value: `20.18.0`
      - Variable name: `DATABASE_URL` &rarr; Value: Paste your Neon Postgres connection string from `.env.local`.
      - Variable name: `NEXTAUTH_SECRET` &rarr; Value: `REMOVED_LEGACY_SECRET`
      - Variable name: `NEXTAUTH_URL` &rarr; Value: `https://styleshopz.pages.dev`
      - Variable name: `RAZORPAY_KEY_ID` &rarr; Value: `rzp_test_styleshopz_demo` (or your real test key)
      - Variable name: `RAZORPAY_KEY_SECRET` &rarr; Value: `test_secret_demo_987654` (or your real test secret)
12. Click the blue button at the bottom labeled **Save and Deploy**.
13. Cloudflare will clone your GitHub repository, install packages, and publish your site to the edge in under 2 minutes.
14. When the build finishes, you will see a green checkmark saying **Success! Your project is deployed**.
15. Click the link provided on screen: **https://styleshopz.pages.dev**.

*Common Troubleshooting:*
- *If you see `Node version mismatch`: In Cloudflare Pages Settings &rarr; Environment variables, ensure `NODE_VERSION` is set to `20` or higher.*
- *Every time you push code to GitHub `main`, Cloudflare automatically rebuilds and publishes the update.*

---

## 3. GitHub (Source Control & Continuous Integration)
- **Repository**: **https://github.com/Sayantan-Sinha-GIT/styleshopZ**
- **Commit Author**: Set strictly to `Sayantan Sinha <322015364+Sayantan-Sinha-GIT@users.noreply.github.com>`.
- **Git Guards**: All agent files (`PLAYBOOK.txt`, `GEMINI.md`, etc.) are hidden via `.git/info/exclude`.
- **Workflow**: Automated CI runs `vitest` tests and typechecks on every push.

---

## 4. Razorpay Test Mode (Simulated Indian Payments)

styleshopZ includes a built-in sandbox simulator for instant testing. To hook up official Razorpay test keys:
1. Go to **https://dashboard.razorpay.com** in your browser.
2. Click **Sign Up** using your Google account or email (free, no credit card required).
3. On the left navigation sidebar, make sure the toggle at the top is set to **Test Mode** (orange badge).
4. Click **Settings** in the bottom-left of the sidebar.
5. Click the **API Keys** tab at the top.
6. Click the blue button labeled **Generate Key**.
7. Copy the **Key ID** (starts with `rzp_test_...`) and the **Key Secret**.
8. In Cloudflare Pages &rarr; **Settings** &rarr; **Environment variables**, update:
   - `RAZORPAY_KEY_ID`: Paste your Key ID.
   - `RAZORPAY_KEY_SECRET`: Paste your Key Secret.
9. To test, open any product in styleshopZ, tap **Buy Now**, choose UPI (`success@razorpay`) or card (`4111-1111-1111-1111`), and verify the order confirms.

---

## 5. Google AI Studio (Gemini Shopping Assistant)

The assistant features catalogue tool calling and confirm-gated order actions.
1. Go to **https://aistudio.google.com/** in your browser.
2. Sign in with your standard Google Account.
3. Click the blue button in the top left labeled **Get API key**.
4. Click **Create API key**.
5. Select or create any free project and click **Create API key in existing project**.
6. Copy the generated key.
7. Add to Cloudflare Pages Environment Variables:
   - `GEMINI_API_KEY`: Paste your key.
8. Click **Save**.

---

## 6. Android Mobile App (Capacitor APK)

styleshopZ includes an Android shell configuration in `capacitor.config.json` pointing to `https://styleshopz.pages.dev`:
1. Make sure you have **Android Studio** installed on your computer.
2. Open terminal in the project directory:
   ```bash
   npx cap add android
   npx cap sync android
   npx cap open android
   ```
3. In Android Studio, click **Build** &rarr; **Build Bundle(s) / APK(s)** &rarr; **Build APK(s)**.
4. The generated `.apk` file can be transferred to any Android phone (Android 8.0 through Android 14) and installed directly.

---

## 7. Upstash Redis (Rate Limiting & Inventory Hold Locks)
1. Go to **https://console.upstash.com/**.
2. Sign up with GitHub (free tier gives 10,000 commands/day).
3. Click **Create Database**.
4. Enter name: `styleshopz-cache`, select region: `Singapore (ap-southeast-1)`.
5. Click **Create**.
6. Scroll down to the **REST API** section and copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
7. Add both variables to Cloudflare Pages Environment Variables and click **Save**.

---

## 8. Sentry (Error Monitoring & Performance)
1. Go to **https://sentry.io/signup/**.
2. Sign up on the free Developer plan.
3. Click **Create Project** &rarr; select **Next.js**.
4. Copy your **DSN** URL (e.g. `https://xxxx@o0.ingest.sentry.io/0`).
5. In Cloudflare Pages Environment Variables, add:
   - `NEXT_PUBLIC_SENTRY_DSN`: Paste your DSN URL.
6. Click **Save**.

---

## 9. PostHog (Product Analytics)
1. Go to **https://eu.posthog.com/signup** or **https://us.posthog.com/signup**.
2. Select the free tier (1,000,000 free events/month).
3. Go to **Project Settings** &rarr; copy your **Project API Key**.
4. In Cloudflare Pages Environment Variables, add:
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
6. In Cloudflare Pages Environment Variables, add:
   - `RESEND_API_KEY`: Paste your key.
7. Click **Save**.

---

## 11. Supabase Storage (User Return Photos & Review Images)
1. Go to **https://supabase.com/dashboard**.
2. Sign in with GitHub on the free tier.
3. Click **Storage** on the left sidebar &rarr; **New bucket**.
4. Name bucket: `styleshopz-uploads`, toggle **Public bucket** to ON.
5. In Project Settings &rarr; **API**, copy `URL` and `anon public` key.
6. In Cloudflare Pages Environment Variables, add:
   - `NEXT_PUBLIC_SUPABASE_URL`: Paste your URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Paste your anon key.
7. Click **Save**.
