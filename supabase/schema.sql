-- ═══════════════════════════════════════════════════════════════════
-- FORGE — Palmer's workout tracker · Supabase schema
-- Paste into the SQL Editor of the EXISTING Supabase project
-- (shared with the Costco tracker — all objects are forge_-prefixed;
--  nothing here touches any other table).
-- Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists forge_exercises (
  id text primary key,
  name text not null,
  muscle_group text not null,
  equipment text not null,
  icon text not null default 'dumbbell',
  is_custom boolean not null default false,
  is_timed boolean not null default false,
  notes text
);

create table if not exists forge_routines (
  day_type text primary key check (day_type in ('A','B','C')),
  name text not null,
  est_minutes int not null default 40,
  challenge_unlocked boolean not null default false,
  challenge_enabled boolean not null default false,
  exercises jsonb not null default '[]'
);

create table if not exists forge_workouts (
  id uuid primary key,
  date date not null,
  day_type text not null,
  status text not null check (status in ('in-progress','completed','partial','skipped')),
  started_at timestamptz not null,
  finished_at timestamptz,
  duration_sec int,
  notes text
);
create index if not exists forge_workouts_date_idx on forge_workouts (date);

create table if not exists forge_sets (
  id uuid primary key,
  workout_id uuid not null references forge_workouts (id) on delete cascade,
  exercise_id text not null,
  set_number int not null,
  weight_lbs numeric not null default 0,
  reps int not null,
  is_warmup boolean not null default false,
  is_pr boolean not null default false,
  logged_at timestamptz not null default now()
);
create index if not exists forge_sets_workout_idx on forge_sets (workout_id);
create index if not exists forge_sets_exercise_idx on forge_sets (exercise_id, logged_at desc);

-- Permanent aggregates — survive the 60-day raw-set pruning
create table if not exists forge_exercise_stats (
  id uuid primary key,
  workout_id uuid not null,
  workout_date date not null,
  exercise_id text not null,
  top_weight_lbs numeric not null default 0,
  top_reps int not null default 0,
  total_volume_lbs numeric not null default 0,
  total_reps int not null default 0,
  total_sets int not null default 0,
  est_1rm numeric not null default 0,
  unique (workout_id, exercise_id)
);
create index if not exists forge_stats_date_idx on forge_exercise_stats (workout_date);

create table if not exists forge_prs (
  id uuid primary key,
  exercise_id text not null,
  date date not null,
  kind text not null check (kind in ('weight','reps','e1rm')),
  weight_lbs numeric not null default 0,
  reps int not null default 0,
  est_1rm numeric not null default 0
);

create table if not exists forge_reports (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('weekly','monthly','six-month','yearly')),
  period_start date not null,
  period_end date not null,
  generated_at timestamptz not null default now(),
  title text not null,
  headline text not null,
  html text not null,
  unique (kind, period_start)
);

-- Small key/value store: rotation state, settings, report bookkeeping
create table if not exists forge_kv (
  key text primary key,
  value jsonb not null
);

-- ── Row Level Security: single authenticated user (Palmer) ──
-- The app signs in with email/password; anonymous requests see nothing.
do $$
declare t text;
begin
  foreach t in array array['forge_exercises','forge_routines','forge_workouts','forge_sets',
                           'forge_exercise_stats','forge_prs','forge_reports','forge_kv']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists forge_authed_all on %I', t);
    execute format(
      'create policy forge_authed_all on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
