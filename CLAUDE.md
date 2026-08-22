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

## Live deployment (as of 2026-07-29)

- **Canonical personal URL:** https://forge.cleverstack.co
  (Vercel project `forge-workout`, deployment protection disabled — FORGE
  has its own auth). The generated Vercel address
  `https://forge-workout-palmer-joseph-ai.vercel.app` remains a fallback.
  Redeploy: `npx vercel --prod`.
- **Supabase project ref:** `iegewntownzguykxtrth` — named
  "Costco & Workout Tracker", shared with the Costco tracker. It is owned
  through the `palmerjosephai@gmail.com` Supabase organization; do not create a
  replacement project or rotate the Vercel Supabase environment variables.
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
  App.tsx                AuthGate → fixed-height shell: <main> scroller
                         + BottomNav in flow (see v3.4 — do NOT use fixed)
  components/
    icons.tsx            THE icon set (hand-drawn SVG, one language)
    ui.tsx               Primitives: Card, GlowButton, StatRing, Stepper,
                         Segmented, Sheet(portal!), EmptyState
    AuthGate.tsx         Supabase email/password gate (skipped in local mode)
    Diag.tsx             ?diag=1 on-device viewport/build readout (renders
                         nothing otherwise; mounted OUTSIDE AuthGate)
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
    viewport.ts          Publishes the REAL viewport height as --app-h
                         (the shell's height — never 100% / 100vh);
                         also exports viewportDiag() for ?diag=1
    sw.ts                Service-worker registration + update path (an
                         installed PWA must not serve cached code forever)
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
- **Custom routines**: `migration-v2.sql` dropped the A/B/C check (now
  folded into `schema.sql` itself — see v3.3).
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
- Supabase Auth **Site URL** is `https://forge.cleverstack.co`; Redirect URLs
  include that canonical address plus the Vercel fallback. This is dashboard
  config, not code. The app login is `palmerjosephai@gmail.com`.

## v3.3 fixes (2026-07-18, code review — Opus)

All four came out of a full-workspace review; the two frontend fixes land
in the **same shared codebase**, so the real app AND the public demo get
them from one build (the demo's `demoSeed.ts` was already correct).

- **Rules-of-hooks crash (Train `ActiveWorkout`)**: `useInvalidate`/`useRef`/
  `useEffect` used to sit AFTER `if (!routine) return null`. If `routine`
  resolved undefined on a later render (its routine deleted mid-session, or
  the routines query returning without that type) React rendered fewer hooks
  → hard crash of the Train tab. Now ALL hooks run first; `planned` etc. are
  derived defensively (empty when no routine) and the guard sits immediately
  before the JSX `return`. **Invariant: never add a hook below that guard.**
- **Inflated in-session PR count**: `detectPr` reads history from the React
  Query cache, which isn't invalidated by `saveSet`, so every working set
  above the old best re-flagged as a PR (3 sets at a new weight → "3 PRs",
  while `useFinishWorkout` records only 1). Two-part fix: (1) `logRow` folds
  the session's already-logged sets into the comparison history via
  `aggregateSets`, but ONLY once the exercise has real history — a first-ever
  session stays baseline; (2) the displayed `prCount` (ActiveWorkout +
  DoneToday) counts DISTINCT exercises with a PR, matching the one-PR-per-
  exercise model that gets persisted.
- **`schema.sql` A/B/C check** dropped: `forge_routines.day_type` was
  `check (day_type in ('A','B','C'))`, which broke a FRESH install — seeding
  the Mixed day ('M') and custom routines (D/E) threw and aborted `ready()`
  before rotation/settings were written. `schema.sql` now declares free-text
  `day_type` AND self-heals older installs with
  `drop constraint if exists forge_routines_day_type_check`. This folds
  `migration-v2.sql` into `schema.sql` — pasting `schema.sql` alone is now
  enough; `migration-v2.sql` is kept only for reference / already-migrated DBs.
- **`forge-reports` swallowed real DB errors**: `persistAndSend` treated ANY
  insert error as "already sent" and skipped Telegram+email. Now only Postgres
  `23505` (the unique(kind, period_start) dedup across the two cron hours) is
  treated as already-sent; any other error is reported as `NOT sent` with its
  code + message instead of silently dropping the delivery.

## v3.4 — the app shell / scroll architecture (2026-08-20)

Palmer reported the bottom nav floating in the middle of the screen on
iPhone Safari, and being able to scroll far past the end of the content into
a black void — intermittently.

**Cause:** the app scrolled the DOCUMENT while the nav was
`position: fixed; bottom-0` + `backdrop-blur-xl`. iOS Safari resolves
`position: fixed` against the *layout* viewport, which it does not keep in
sync with the *visual* viewport during flings, rubber-band overscroll, or
URL-bar collapse; `backdrop-filter` additionally promotes the nav to a
main-thread-rasterized layer that visibly drifts with the scroll and only
snaps back when scrolling settles. Both symptoms are the same root cause.

**Fix — the app is now a fixed-height shell with an internal scroller.**
This is load-bearing structure, not styling:

- `index.css`: `html, body { height:100%; overflow:hidden; overscroll-behavior:none }`
  and `#root { height:100% }`. **The document never scrolls.**
- `App.tsx`: `<div className="h-full flex flex-col overflow-hidden relative">`
  → `<main ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain">`
  → inner `mx-auto max-w-107 px-4 pt-safe pb-8` wrapper → `<Routes>`, then
  `<BottomNav />` as the last flex child.
  `min-h-0` is REQUIRED — without it the flex child won't shrink and the
  scroller silently stops scrolling.
- `BottomNav`: normal flow, `shrink-0`, solid `bg-bg0`, no `fixed`, no
  backdrop blur (nothing scrolls behind it any more). `pb-safe` stays.
- **Scroll reset**: `App` scrolls the container to top on
  `location.pathname` / `location.state?.reset` change — tab switches and
  active-tab re-taps land at the top. (Idempotent, so it does not violate
  the v3.1 stale-reset-signal invariant.)
- `pullRefresh` takes `scrollRef` and listens on the CONTAINER
  (`el.scrollTop`), not `window` — `window.scrollY` is now permanently 0, so
  the old check would have fired the refresh on any downward drag anywhere.
- `AuthGate`'s screens get their own `h-full overflow-y-auto` scroller
  (inner `min-h-full flex items-center justify-center`), because a locked
  document would otherwise trap the fields under the iOS keyboard.

**Invariants going forward:**
- NEVER add `position: fixed` for layout chrome anchored to the viewport
  bottom, and never restore document scrolling. Full-screen overlays
  (`Sheet`, `RestTimer`) stay `fixed inset-0` via portals — that is fine and
  more stable now, and the portal requirement from v1 still stands.
- Anything that needs the scroll position uses the `<main>` container, never
  `window.scrollY` / `window.scrollTo`.
- `pb-8` on the content wrapper replaced the old `pb-28`; the 7rem was nav
  clearance and would now be dead space at the end of every scroll.

## v3.5 — the shell must be the height of the SCREEN (2026-08-22)

Two days after v3.4 Palmer reported a ~100px black band below the bottom nav
on the iPhone: the nav sat above it and the app simply stopped there.

**Cause:** v3.4 sized the shell with `html, body, #root { height: 100% }`.
Percentage heights resolve against the *initial containing block*, which on
iOS is NOT the visible screen — it omits the strip under a collapsed Safari
toolbar / the safe-area insets. The shell was therefore correct-looking but
short, and since nothing else paints down there the remainder read as a dead
black gap.

**Fix — the shell is sized off the measured viewport, via `--app-h`:**

- `index.css`: `:root { --app-h: 100% }`, upgraded to `100dvh` inside
  `@supports (height: 100dvh)`; `html, body, #root { height: var(--app-h) }`.
- `src/lib/viewport.ts` (`trackViewportHeight()`, called once in `main.tsx`)
  overrides `--app-h` on `<html>` with `visualViewport.height` in px, on
  `resize` / `orientationchange` / `pageshow`. Pinch-zoom is ignored
  (`visualViewport.scale > 1.01` falls back to `window.innerHeight`), so a
  zoomed page never resizes the shell.
- Bonus: because it tracks `visualViewport`, the shell now shrinks above the
  on-screen keyboard instead of leaving fields hidden behind it.

**Invariants:** the shell's height comes from `--app-h` and nothing else —
never `height: 100%`, never `100vh` (the *large* viewport on iOS, which
overshoots by the toolbar height). All v3.4 invariants still stand.

**Deployed to BOTH Vercel projects** (`forge-workout` and `forge-demo`).
The demo had been stuck on a pre-v3.4 build for 32 days — see the Demo mode
section: a git push deploys neither project, so every frontend change needs
two CLI deploys.

## v3.6 — PWA staleness + the diagnostic (2026-08-22)

v3.5 shipped and Palmer's iPhone showed **no change at all**. Two separate
things were wrong, and the second one is why nothing appeared to happen:

- **The installed PWA never updated.** `vite-plugin-pwa`'s default injected
  snippet (`registerSW.js`) only registers on `load` and never calls
  `update()`. An installed iOS PWA that gets resumed rather than cold-started
  can therefore serve a precached build indefinitely — no amount of deploying
  reaches the phone. `injectRegister: false` now, and `src/lib/sw.ts`
  registers with `updateViaCache: 'none'`, calls `reg.update()` on
  visibilitychange / focus / hourly, and reloads ONCE on `controllerchange`
  (guarded by `hadController`, so a first install doesn't double-load).
  The SW is built with `skipWaiting` + `clientsClaim`.
- **Nothing could prove which build a phone was running.** `?diag=1` renders
  `components/Diag.tsx`: build stamp (`__BUILD_ID__`, defined in
  vite.config.ts), standalone flag, `--app-h`, innerHeight,
  `visualViewport.height`, `screen.height`, clientHeight, both safe-area
  insets, and the live gap under the nav — plus a lime hairline at the app's
  bottom edge. Black BELOW the line = the web view is taller than the app;
  line off-screen = the app is taller than the web view. It renders nothing
  without the flag and mounts outside `AuthGate` so it works logged out.

`viewport.ts` also grew one rule: in an installed PWA (standalone, portrait,
not zoomed, no keyboard) **with non-zero safe-area insets** — proof that
`viewport-fit=cover` is in effect and the web view really does reach the
screen edges — a shortfall against `screen.height` (< 200px) is iOS
under-reporting and `screen.height` wins. Without that proof we never
overshoot: painting past a genuinely inset web view would hide the nav,
which is worse than a gap.

Also added the standards `mobile-web-app-capable` meta alongside the
deprecated `apple-` one.

**Debugging any future layout report starts here:** ask for a screenshot of
`https://forge.cleverstack.co/?diag=1`. Desktop browsers cannot reproduce
iOS viewport behaviour — do not theorise from a local resize.

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
  - Demo project: **`forge-demo`** → https://forge-demo-ochre.vercel.app
  - Neither project is git-connected, so **a push deploys nothing** — both
    are CLI deploys and BOTH must be run, or the demo silently rots on an
    old build (it sat 32 days behind through v3.4 + v3.5 that way).
  - `.vercel/` is linked to `forge-workout`; deploying the demo with
    `--project forge-demo` does NOT re-link it (verified), so the local link
    survives. Never point `.vercel/project.json` at the demo.
- Test locally: `VITE_SUPABASE_URL="" VITE_SUPABASE_ANON_KEY="" VITE_DEMO=true npm run dev`.

## ⚠ OPEN ISSUES (as of handover, 2026-07-18)

1. **Password recovery is live, but email delivery remains constrained by the
   built-in Supabase mailer.** On 2026-07-29 the app was fixed and deployed so
   a recovery link preserves recovery mode until the user submits a replacement
   password; it can no longer enter the app first. Supabase's default mailer is
   restricted to organization-team addresses and two Auth emails per hour. The
   login screen surfaces its delivery error. If delivery becomes unreliable,
   enable Custom SMTP via Resend (Authentication → Emails → SMTP: host
   `smtp.resend.com`, port 465, user `resend`, password = Resend API key,
   sender `onboarding@resend.dev`). Then test the full flow: Forgot password →
   email → in-app "Set a new password".
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
- **The document never scrolls.** The app is a fixed-height shell and
  `<main>` is the only scroller; the bottom nav is in normal flow, never
  `position: fixed`. Its height is `--app-h` (the measured viewport), never
  `100%` / `100vh`. See §v3.4 + §v3.5 and DESIGN-SYSTEM §5b before touching
  layout.

## Maintenance recipes

- **Run locally:** `npm run dev` (localStorage mode unless `.env` exists).
- **Type-check + build:** `npm run build` (tsc -b && vite build; PWA autogen).
- **Deploy frontend — BOTH projects, every time** (no git auto-deploy):
  - real app: `npx vercel --prod --scope palmer-joseph-ai`
  - public demo: `npx vercel --prod --scope palmer-joseph-ai --project forge-demo --yes`
  (`--scope` is required — a bare `npx vercel --prod` fails "Not authorized"
  because the personal account is the CLI default, not the team that owns
  the projects. Verify a deploy landed by diffing the served CSS filename:
  `curl -s <url> | grep -o 'assets/index-[A-Za-z0-9_-]*\.css'` — both sites
  build from one codebase, so the hashes should MATCH.)
- **Force an installed PWA to update (iOS):** it should self-update within a
  foreground check now (v3.6). If a phone is still stale: delete the app from
  the Home Screen, open the URL in Safari, Share → Add to Home Screen. To
  confirm which build is live, open `?diag=1` and read the build stamp.
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
5. **Layout (iPhone Safari AND the installed PWA):** the bottom nav must sit
   flush with the bottom of the SCREEN — no black band under it, in either
   orientation and on a tablet. Then fling-scroll the longest screen
   (Progress) hard to the end several times — the nav stays pinned, with no
   black gap past the content and no drift mid-screen. Tab-switch from a
   deep-scrolled screen → lands at the top. Pull-to-refresh fires at the top
   of a tab and NOT mid-page. If anything looks wrong, screenshot `?diag=1`
   — GAP under nav must read 0px.
