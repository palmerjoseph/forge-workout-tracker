# FORGE — My URLs

Quick reference for the two live versions of the app.

## 🟢 MY REAL APP (private — login required)

**https://forge-workout-palmer-joseph-ai.vercel.app**

- This is the one **I** use to track my actual workouts.
- Requires my email + password to get in. My private data.
- Connected to Supabase (project ref `iegewntownzguykxtrth`).
- Sends the Sunday/monthly Telegram + email reports.
- Add to iPhone home screen from here.

## 🔵 DEMO (public — no login, for my portfolio)

**https://forge-demo-palmer-joseph-ai.vercel.app**

- Share this one with business owners / anyone I want to show.
- No sign-in — opens straight into a fully populated sample account.
- Each visitor gets their own private sandbox in their own browser.
- Cannot see or touch my real data or my database (it has no Supabase connection).
- Shows a "Live demo · sample data" badge.

---

### Behind the scenes (for reference)

- **Both come from the same GitHub repo:** https://github.com/palmerjoseph/forge-workout-tracker
- **Vercel projects:** `forge-workout` (real) and `forge-demo` (demo) — separate projects, same Vercel account. `forge-demo` is **CLI-deployed** (not git-connected).
- The difference is the environment variables: the real project has the Supabase keys; the demo project has none → keyless build → login off + sample data seeded.
- **Deploying the demo:** the local `.vercel` here is linked to the REAL `forge-workout`, so to deploy the demo, point `.vercel/project.json` at `forge-demo` (projectId `prj_Lc3DMajEBs5olvKB2aPeTwMeQXhG`), run `npx vercel --prod --force`, then swap `.vercel` back. **Use `--force`** (avoids a stale cached build) — and the committed **`.vercelignore`** (excludes `.env`/`.env.*`) is REQUIRED: the Vercel CLI otherwise uploads the local gitignored `.env` (real Supabase keys) and inlines it, which brings the login back. The demo greets a neutral "Alex" and, in demo mode, the Home weekly tiles use a rolling 7-day window so they're never all-zeros.
- Full technical details + maintenance notes live in `CLAUDE.md` and `docs/DESIGN-SYSTEM.md`.
