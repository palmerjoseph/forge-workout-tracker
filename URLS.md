# FORGE — URLs and deployment handoff

Quick reference for the two live versions of the app. The portfolio card must
use the public demo URL, never the private tracker URL.

## 🟢 MY REAL APP (private — login required)

**Canonical personal URL:** **https://forge.cleverstack.co**

**Temporary Vercel URL:** https://forge-workout-palmer-joseph-ai.vercel.app

- This is the one **I** use to track my actual workouts.
- Requires my email + password to get in. My private data.
- Connected to Supabase (project ref `iegewntownzguykxtrth`).
- Sends the Sunday/monthly Telegram + email reports.
- Add to iPhone home screen from here.
- `forge.cleverstack.co` is assigned only to the `forge-workout` Vercel project.
  Its encrypted Production Supabase variables remain configured, so changing
  the URL does not replace or erase any workout data.

## 🔵 DEMO (public — no login, for my portfolio)

**Canonical portfolio URL:** **https://forgedemo.cleverstack.co**

**Temporary Vercel URL:** https://forge-demo-palmer-joseph-ai.vercel.app

- Share this one with business owners / anyone I want to show.
- No sign-in — opens straight into a fully populated sample account.
- Each visitor gets their own private sandbox in their own browser.
- Cannot see or touch my real data or my database (it has no Supabase connection).
- Shows a "Live demo · sample data" badge.
- The portfolio card links to the canonical `forgedemo.cleverstack.co` address.
  Keep the Vercel address only as a technical fallback, not as the public-facing
  link.

---

### Behind the scenes (for reference)

- **Both come from the same GitHub repo:** https://github.com/palmerjoseph/forge-workout-tracker
- **Vercel projects:** `forge-workout` (real) and `forge-demo` (demo) — separate projects, same Vercel account. `forge-demo` is **CLI-deployed** (not git-connected).
- The difference is the environment variables: the real project has the Supabase keys; the demo project has none → keyless build → login off + sample data seeded.
- **Deploying the demo:** the local `.vercel` here is linked to the REAL `forge-workout`, so to deploy the demo, point `.vercel/project.json` at `forge-demo` (projectId `prj_Lc3DMajEBs5olvKB2aPeTwMeQXhG`), run `npx vercel --prod --force`, then swap `.vercel` back. **Use `--force`** (avoids a stale cached build) — and the committed **`.vercelignore`** (excludes `.env`/`.env.*`) is REQUIRED: the Vercel CLI otherwise uploads the local gitignored `.env` (real Supabase keys) and inlines it, which brings the login back. The demo greets a neutral "Alex" and, in demo mode, the Home weekly tiles use a rolling 7-day window so they're never all-zeros.
- Full technical details + maintenance notes live in `CLAUDE.md` and `docs/DESIGN-SYSTEM.md`.

### Custom-domain migration status — July 29, 2026

- Requested hostname: `forgedemo.cleverstack.co`.
- It is assigned in Vercel to the public `forge-demo` project (project ID
  `prj_Lc3DMajEBs5olvKB2aPeTwMeQXhG`), not `forge-workout`.
- Do not attach this hostname to the private tracker: it has Supabase-backed
  personal workout data and requires login.
- Cloudflare DNS is configured and Vercel has verified this hostname for
  `forge-demo`; HTTP verification returned 200. Use
  `https://forgedemo.cleverstack.co` for the portfolio card.
- This repository has no reference to `thepalmerjoseph@gmail.com`. Tracked
  report configuration and setup instructions already use
  `palmerjosephai@gmail.com`. Any Vercel account-owner email must be checked
  in Vercel separately and is not stored in this project.

### Personal-app domain status — July 29, 2026

- Requested hostname: `forge.cleverstack.co`.
- It is assigned in Vercel to the private `forge-workout` project (project ID
  `prj_ZDnQivCEzk0UMf8NCbqGBsnwSQ27`) and is intentionally separate from
  `forge-demo`.
- Cloudflare DNS is configured and Vercel has verified this hostname for
  `forge-workout`; HTTP verification returned 200.
- The existing `forge-workout-palmer-joseph-ai.vercel.app` address remains a
  fallback; do not remove it. Changing a Vercel domain does not change the
  Supabase database, credentials, or stored workouts.
- The project is now owned through the `palmerjosephai@gmail.com` Supabase
  organization. It retains the same project ref (`iegewntownzguykxtrth`), so
  Vercel's encrypted Supabase variables and the stored workout data remain
  valid.
- Supabase Auth URL Configuration is complete: Site URL is
  `https://forge.cleverstack.co`, and Redirect URLs retain both the canonical
  address and the Vercel fallback. The app login is
  `palmerjosephai@gmail.com`.
- Password recovery was fixed and deployed on 2026-07-29. A recovery link now
  always shows the in-app new-password form before opening the tracker. The
  built-in Supabase mailer remains limited to organization-team addresses and
  two Auth emails per hour; use Custom SMTP if reliable delivery becomes
  necessary.
