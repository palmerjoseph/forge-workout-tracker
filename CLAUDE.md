# FORGE — Palmer's Personal Workout Tracker

Read this fully before changing anything. It exists so any Claude model
(maintenance is done with **Opus** after the initial Fable build) can work
on this app without Palmer re-explaining a single thing.

## Who this is for

One user: **Palmer**, 42, kids, busy. Home gym: barbell (squat/bench/
deadlift), dumbbells to 90 lb, bands, bodyweight — no machines. Trains
30–45 min, 2-on-1-off rotation. Units: **lbs**. Timezone: **America/Los_Angeles**.

Palmer's working preferences (non-negotiable):
- **$0 forever.** No paid services, no AI/LLM API calls, no image APIs.
  Free tiers only (Supabase, Vercel, Telegram, Resend).
- **Minimal input.** Logging must stay tap-first: prefill from last
  session, one tap = set logged. Never add flows that demand typing.
- **Firm honest coach voice** — see `src/lib/trainer.ts` §voice and
  `docs/DESIGN-SYSTEM.md` §8. No yes-man copy, no hype.
- **One visual language.** Before ANY visual change read
  `docs/DESIGN-SYSTEM.md`. All images/icons must look identical in feel —
  a single hand-drawn SVG set, never mixed icon packs.
- Age-appropriate training: moderate volume, joint-friendly; intensity
  increases only via the opt-in Challenge mode (never auto-escalate).

## Live deployment (as of 2026-07-18)

- **Production URL:** https://forge-workout-palmer-joseph-ai.vercel.app
  (Vercel project `forge-workout`, deployment protection disabled — FORGE
  has its own auth). Redeploy: `npx vercel --prod`.
- **Supabase project ref:** `iegewntownzguykxtrth` — named
  "Costco & Workout Tracker", shared with the Costco tracker.
- Cron jobs `forge-reports-16`, `forge-reports-17`, `forge-cleanup` are
  scheduled; Telegram + Resend delivery verified end-to-end.

## Architecture (all free-tier)

```
iPhone/desktop PWA (React 19 + Vite + Tailwind v4, Vercel static)
        │  @supabase/supabase-js (anon key + email/password auth)
        ▼
Supabase Postgres  ←  SHARED PROJECT with Palmer's Costco tracker!
  forge_* tables only — NEVER touch non-forge_ tables.
  RLS: authenticated-only on every forge_ table.
        │
pg_cron (cron.sql) ──HTTP──▶ Edge Functions (Deno)
  daily 16:00+17:00 UTC ─▶ forge-reports  (fires only at 9AM PT Sun/1st; DST-safe;
                                           deduped by unique(kind, period_start))
  daily 10:10 UTC       ─▶ forge-cleanup  (60-day raw-set retention)
        │
        ├─▶ Telegram Bot API (ping)          — free forever
        └─▶ Resend (HTML report email)       — free tier, onboarding@resend.dev → palmerjosephai@gmail.com
```

Why shared Supabase project: Palmer's ~5×/week FORGE usage keeps the
project from the free-tier 7-day inactivity pause — which also protects
his Costco tracker. Do not split into a second project.

## Repo map

```
src/
  index.css              Design tokens (@theme) — the visual source of truth
  App.tsx                AuthGate → routes → BottomNav shell
  components/
    icons.tsx            THE icon set (hand-drawn SVG, one language)
    ui.tsx               Primitives: Card, GlowButton, StatRing, Stepper,
                         Segmented, Sheet(portal!), EmptyState
    AuthGate.tsx         Supabase email/password gate (skipped in local mode)
    BottomNav.tsx        Home · Train · Progress · Plan
  screens/
    Home.tsx             Today card, week ring, streak, coach message
    Train.tsx            Preview → ActiveWorkout → ExerciseLogger (prefill,
                         one-tap logging, PR flash, add/create exercise)
    Progress.tsx         Calendar heatmap, volume/strength charts, muscle
                         donut (validated palette), PR wall, 1W/1M/6M/1Y
    Plan.tsx             14-day strip + overrides, rotation rhythm, routine
                         editor, Challenge toggle, reports archive
  lib/
    types.ts             All domain types (DayType A/B/C, Workout, SetLog…)
    seed.ts              Exercise library + A/B/C routines + defaults
    rotation.ts          Rotation engine (pattern [1,1,0], overrides,
                         pushToTomorrow re-anchors)
    stats.ts             Epley est-1RM, aggregates, streak, adherence
    trainer.ts           Rule-based coach message banks (tiers by adherence
                         × volume trend; deterministic per-day pick)
    hooks.ts             React Query hooks + useFinishWorkout (rolls up
                         stats, detects PRs, unlocks Challenge at 6 full
                         sessions of a day type)
    repo/                Storage abstraction:
      types.ts           Repo interface (the ONLY storage contract)
      local.ts           localStorage impl (no env vars → used automatically)
      supabase.ts        Supabase impl (snake_case mapping, forge_ tables)
      index.ts           Picks impl by presence of VITE_SUPABASE_* env vars
supabase/
  schema.sql             Tables + RLS (idempotent; paste in SQL editor)
  cron.sql               pg_cron wiring (placeholders: PROJECT-REF, CRON-SECRET)
  functions/forge-reports/   Weekly/monthly/6mo/yearly reports + Telegram + Resend
  functions/forge-cleanup/   Retention pruning
docs/DESIGN-SYSTEM.md    The visual contract — read before ANY UI work
SETUP.md                 Palmer's one-time setup walkthrough
vercel.json              SPA rewrite
env.example              Template for .env (VITE_SUPABASE_URL / ANON_KEY)
```

## v2 additions (2026-07-18, same day as launch)

- **Auth**: "Forgot password?" → Supabase reset email → in-app recovery
  screen (PASSWORD_RECOVERY event in `AuthGate`). **3-day rolling session**:
  `forge.lastSeen` in localStorage; >3-day gap forces re-login.
- **Rest timer**: `components/RestTimer.tsx` — THE RED ZONE (see
  DESIGN-SYSTEM §7). Fires after working sets via `onWorkingSetLogged` in
  Train; suppressed in edit mode and near session end; `settings.restTimerSec`.
- **Editing workouts**: finished workouts reopen as `in-progress` (keeping
  `finished_at` — that's the isEdit flag). Train picks up ANY in-progress
  workout, not just today's. `useFinishWorkout` first deletes the workout's
  stats + same-date PRs, then recomputes — idempotent, no duplicate PRs.
  forge-cleanup only sweeps in-progress rows with `finished_at IS NULL`.
- **Day detail**: tap any calendar day → sheet (raw sets <60 days,
  permanent aggregates after) + "Adjust this workout".
- **Custom routines**: `migration-v2.sql` dropped the A/B/C check.
  New routines get letters D, E…; `dayName()` in types.ts resolves names.
  Rotation cycle is `rotation.cycle: string[]` (defaults to A/B/C),
  editable chips in Plan. Deleting a routine also removes it from the cycle.
- **Pull-to-refresh**: `lib/pullRefresh.tsx`, mounted in App; touch-only,
  invalidates all React Query caches.
- **Coach context**: `trainerContext()` prepends last-session facts +
  Monday recap to the verdict line.

## v3 additions (2026-07-18, evening)

- **Home**: week ring removed. Glowing stat tiles (`StatTile` in Home.tsx,
  `.icon-live`/`.stat-live` pulse classes): Days lifted, Reps (week),
  Weekly volume, Streak, + full-width all-time Total lbs. All Home cards
  use `card-active`; every tile and the done-card tap → /train.
- **Nav re-tap reset**: tapping the active tab re-navigates with
  `state.reset` (BottomNav). Train clears its pickers (DoneToday keyed by
  the signal) and an open EDIT session auto-saves via `saveNow`.
- **Warm-up-only saves**: Finish enabled with any sets; zero working sets
  → partial, no stat rows (aggregate skip).
- **Whole-exercise delete**: ✕ on logged exercise cards → inline
  Delete/Keep confirm → wipes that exercise's sets for the workout.
- **Add-exercise sheet** grouped by muscle (GROUP_ORDER), alphabetical,
  eyebrow headers + divider lines.
- **Plan strip auto-detect**: completed/partial workouts light the cell
  with the day letter + ✓; multiple different day types → MIX.
- **Mixed routine**: dayType `'M'`, empty plan, seeded via ready()
  ensure-step in BOTH repos (fresh + existing installs); excluded from
  the default cycle. New icons: `IconReps`, `IconBars`.

## v3.1 fixes (2026-07-18, night)

- **Stale reset-signal bug**: `state.reset` survives in history, so Train/
  ActiveWorkout only react to a CHANGE after mount (`seenSignal` ref) —
  never auto-save on mount. Regression risk: any new consumer of
  `location.state.reset` must do the same.
- **Discard escape hatch**: a session/edit with zero sets shows
  `DiscardWorkout` (confirm → `repo.deleteWorkout` + `deletePrsOnDate`).
  `deleteWorkout` added to the Repo contract (both impls).
- Home: `LogoutButton` (Supabase mode only; clears `forge.lastSeen`),
  StatTile `suffix` prop (inline small units — no wrapped "lb").
- Muscle donut is ALWAYS trailing 7 days, independent of the range toggle.

## v3.2 fixes (2026-07-18, late night)

- Stat numbers are STATIC — `.stat-live` keeps the glow text-shadow but
  NO animation (Palmer's explicit call; icons still pulse via `.icon-live`).
- **`saveNow` is save-or-discard**: zero sets = the workout is deleted
  (there is nothing to save; leaving it in-progress was the stuck-state
  bug). "Done editing" label adapts; nav re-tap discards empty sessions
  (live OR edit) but NEVER finishes a live session that has sets.
- Supabase Auth **Site URL** must be the production URL (Authentication →
  URL Configuration) or password-reset emails point at localhost:3000.
  This is dashboard config, not code.

## Demo mode (public portfolio copy)

- `src/lib/demoSeed.ts` — `isDemoMode()` is true when `VITE_DEMO=true`
  OR (production build AND no `VITE_SUPABASE_URL`). `seedDemoData()` runs
  once (guard key `forge.demoSeeded`) after `repo.ready()` in main.tsx,
  writing ~6 weeks of realistic sample workouts/sets/stats/PRs to
  localStorage. Today is left unlogged so a visitor lands on "Start
  workout". Home shows a "Live demo · sample data" badge.
- **Deployment**: the same repo deployed as a SECOND Vercel project with
  NO env vars = the demo (localStorage, no login, per-browser sandbox).
  The real app is the Vercel project WITH the Supabase env vars. One
  codebase, two projects. Real app never triggers demo seeding.
- Test locally: `VITE_SUPABASE_URL="" VITE_SUPABASE_ANON_KEY="" VITE_DEMO=true npm run dev`.

## ⚠ OPEN ISSUES (as of handover, 2026-07-18)

1. **Password-reset email delivery is NOT verified working.** Site URL +
   Redirect URL were set correctly in Supabase (Authentication → URL
   Configuration), but sends were still failing — most likely the
   built-in mailer's 2-emails/hour rate limit during heavy same-day
   testing, possibly an unclicked "Save changes", possibly SMTP needed.
   The app now surfaces the real error message on the login screen.
   **Recommended fix**: enable Custom SMTP via Resend (Authentication →
   Emails → SMTP: host `smtp.resend.com`, port 465, user `resend`,
   password = Resend API key, sender `onboarding@resend.dev`). Then test
   the full flow: Forgot password → email → in-app "Set a new password".
2. Palmer will request further changes over time — all future work is
   done with **Opus**. Read this file + docs/DESIGN-SYSTEM.md fully
   before touching anything.

## Key behaviors & invariants

- **Local-first dev:** with no `.env`, the app runs fully on localStorage
  (seeded). With env vars it uses Supabase + auth. Same `Repo` interface —
  never bypass it.
- **Data model:** raw `sets` are disposable after 60 days. Long-term truth
  lives in `forge_exercise_stats` (per-workout-per-exercise aggregates),
  `forge_prs`, `forge_workouts` (calendar/adherence), `forge_reports`.
  `useFinishWorkout` writes the aggregates — if you change set logging,
  keep that rollup correct or history breaks silently.
- **PR detection** (`detectPr`): first-ever session is baseline, not a PR.
  Kinds: weight, e1rm (Epley).
- **Rotation:** pattern array (`[1,1,0]` = 2-on-1-off), A→B→C cycle counted
  across workout slots, per-date overrides win. `pushToTomorrow` re-anchors.
- **Reports:** cron fires the function at 16:00 & 17:00 UTC daily; the
  function itself checks local PT time == 9 AM and Sunday/1st (DST-safe),
  and `unique(kind, period_start)` makes double-invocation harmless.
  Milestones (6-month/yearly) piggyback on the monthly run once enough
  data exists, recurring per span. Test with `?force=weekly|monthly`.
- **Cold-start fairness:** days before the first-ever workout are never
  judged (Home adherence + calendar "missed" both clamp to first workout).
- **Sheets render through a portal** — the bottom nav creates a stacking
  trap otherwise. Keep it that way.

## Maintenance recipes

- **Run locally:** `npm run dev` (localStorage mode unless `.env` exists).
- **Type-check + build:** `npm run build` (tsc -b && vite build; PWA autogen).
- **Deploy frontend:** `npx vercel --prod`.
- **Redeploy a function:** `npx supabase functions deploy forge-reports --project-ref REF --no-verify-jwt`.
- **Change report timing:** edit `supabase/cron.sql` + the 9 AM check in
  `functions/forge-reports/index.ts`.
- **Add an exercise to the library:** append to `SEED_EXERCISES` (new
  installs) AND insert into `forge_exercises` via SQL (live DB) — or just
  use the in-app "Create custom exercise".
- **New icon / visual:** follow the worked example in
  `docs/DESIGN-SYSTEM.md` §6. Never import an icon library.
- **Chart/palette changes:** re-validate with the dataviz skill's
  validator (see DESIGN-SYSTEM §3) before shipping.
- **App icons:** `public/favicon.svg` is the master; regenerate PNGs with
  the sharp one-liner (see git history or: sharp resize 192/512/180).

## Testing checklist after changes

1. `npm run build` green.
2. In-browser: complete a workout (one-tap logging), partial-complete
   another, create a custom exercise, push today→tomorrow, check calendar/
   charts/streak update. Seed history via localStorage if needed.
3. Reports: `curl -X POST '<fn-url>/forge-reports?force=weekly' -H 'x-forge-secret: …'`
   → Telegram + email arrive, report shows under Plan → Reports.
4. iPhone PWA still standalone with safe areas intact.
