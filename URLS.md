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
- **Vercel projects:** `forge-workout` (real) and `forge-demo` (demo) — separate projects, same Vercel account.
- The difference is only the environment variables: the real project has the Supabase keys; the demo project has none, which is what turns off login and loads sample data.
- Full technical details + maintenance notes live in `CLAUDE.md` and `docs/DESIGN-SYSTEM.md`.
