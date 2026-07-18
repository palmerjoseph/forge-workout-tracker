# FORGE — One-Time Setup Walkthrough

Everything below is free and permanent. Total time: ~25 minutes.
Do the steps in order. After this, the app runs itself — your computer
never needs to be on again.

---

## 1 · Supabase (~10 min) — data + automation

You're reusing the **same project as your Costco tracker** (all FORGE
tables are prefixed `forge_`, nothing touches Costco data — and FORGE's
regular activity keeps the whole project from free-tier pausing).

1. Open [supabase.com/dashboard](https://supabase.com/dashboard) → your existing project.
2. **SQL Editor** → New query → paste the entire contents of `supabase/schema.sql` → Run.
3. **Authentication → Users → Add user**: your email + a strong password
   (this is your app login; "Auto Confirm User" ON).
4. **Project Settings → API**: copy the **Project URL** and **anon public** key.
5. In this project folder, create a file named `.env`:
   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
   ```
6. Deploy the two edge functions (from this folder, in Terminal):
   ```bash
   npx supabase login
   npx supabase functions deploy forge-reports --project-ref YOUR-PROJECT-REF --no-verify-jwt
   npx supabase functions deploy forge-cleanup --project-ref YOUR-PROJECT-REF --no-verify-jwt
   ```
7. Set the function secrets (fill the real values — Telegram/Resend come from steps 2–3):
   ```bash
   npx supabase secrets set --project-ref YOUR-PROJECT-REF \
     FORGE_CRON_SECRET=pick-any-long-random-string \
     TELEGRAM_BOT_TOKEN=... \
     TELEGRAM_CHAT_ID=... \
     RESEND_API_KEY=... \
     REPORT_EMAIL=palmerjosephai@gmail.com
   ```
8. Open `supabase/cron.sql`, replace `<PROJECT-REF>` and `<CRON-SECRET>`
   with your values, paste into the SQL Editor → Run.

## 2 · Telegram bot (~3 min) — the Sunday ping

1. In Telegram, message **@BotFather** → `/newbot` → pick a name (e.g. "FORGE Coach").
2. Copy the **bot token** BotFather gives you → that's `TELEGRAM_BOT_TOKEN`.
3. Send your new bot any message (e.g. "hi").
4. Visit `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser —
   find `"chat":{"id":123456789` → that number is `TELEGRAM_CHAT_ID`.

## 3 · Resend (~3 min) — the report emails

1. Sign up at [resend.com](https://resend.com) with **palmerjosephai@gmail.com**.
2. **API Keys → Create** → copy it → that's `RESEND_API_KEY`.
   (Free tier sends from `onboarding@resend.dev` to your own address — exactly what we need.)

## 4 · Vercel (~5 min) — hosting

```bash
npx vercel login
npx vercel        # link the project, accept defaults
npx vercel env add VITE_SUPABASE_URL production      # paste the URL
npx vercel env add VITE_SUPABASE_ANON_KEY production # paste the key
npx vercel --prod
```
Copy the production URL it prints (e.g. `https://forge-xyz.vercel.app`).

## 5 · iPhone install (~1 min)

1. Open the production URL in **Safari** on your iPhone.
2. Log in with the email/password from step 1.3 (stays logged in).
3. Share button → **Add to Home Screen** → "FORGE".
   It now opens full-screen like a native app.

## 6 · Fire a test report (optional but recommended)

```bash
curl -X POST "https://YOUR-PROJECT-REF.supabase.co/functions/v1/forge-reports?force=weekly" \
  -H "x-forge-secret: YOUR-CRON-SECRET"
```
Within a minute you should get the Telegram ping + the email, and the
report appears under **Plan → Reports** in the app.

---

### What runs automatically from now on

| When (Pacific) | What |
|---|---|
| Sunday 9 AM | Weekly report → Telegram + email + in-app archive |
| 1st of month 9 AM | Monthly report (previous month) |
| Automatically at 6 / 12 months of data | 6-month & yearly reviews, recurring |
| Nightly ~3 AM | Deletes raw sets older than 60 days (aggregates, PRs, calendar, reports kept forever) |
