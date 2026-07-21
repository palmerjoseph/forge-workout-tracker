import { format, subDays } from 'date-fns'
import { SEED_EXERCISES, SEED_ROUTINES } from './seed'
import { defaultRotation, scheduleFor } from './rotation'
import { aggregateSets, est1Rm } from './stats'
import type { ExerciseStat, PrRecord, SetLog, Workout } from './types'

/* ─── Demo mode ───────────────────────────────────────────────
   When FORGE is deployed WITHOUT Supabase keys (the public portfolio
   copy), it runs on localStorage. This module fills that copy with
   several months of realistic sample training so every visitor
   immediately sees full charts (incl. the 6M/1Y ranges), a lived-in
   calendar, a long PR history, and a strong streak — the app at its
   best — in their own private browser sandbox.

   The real app (which has Supabase keys) never triggers this. Local dev
   stays empty unless VITE_DEMO=true is set. */

const DEMO_FLAG = 'forge.demoSeeded.v2' // bumped: forces returning demo visitors to re-seed
const DAYS = 210 // ~7 months of history → unlocks 6M/1Y ranges, lived-in calendar

export function isDemoMode(): boolean {
  if (import.meta.env.VITE_DEMO === 'true') return true
  // Production build with no Supabase configured = the demo deployment
  return import.meta.env.PROD && !import.meta.env.VITE_SUPABASE_URL
}

/** Realistic starting working weights (lbs). Bodyweight/band → 0. */
const BASE_WEIGHT: Record<string, number> = {
  'bb-bench': 135,
  'db-incline-press': 50,
  'db-row': 60,
  'db-ohp': 40,
  'db-lateral': 20,
  'db-curl': 30,
  'db-hammer': 30,
  'db-oh-ext': 40,
  'bb-squat': 185,
  'bb-rdl': 155,
  'db-split-squat': 40,
  'db-calf-raise': 55,
}

function baseFor(exerciseId: string, equipment: string): number {
  if (exerciseId in BASE_WEIGHT) return BASE_WEIGHT[exerciseId]
  if (equipment === 'barbell') return 95
  if (equipment === 'dumbbell') return 30
  return 0 // bodyweight / band
}

/** Inline PR check (mirrors hooks.detectPr) so this boot module stays
 *  free of any React dependency. */
function isPr(weightLbs: number, reps: number, history: ExerciseStat[], prs: PrRecord[], exerciseId: string): PrRecord['kind'] | null {
  const past = history.filter((h) => h.exerciseId === exerciseId)
  const pastPrs = prs.filter((p) => p.exerciseId === exerciseId)
  if (past.length === 0 && pastPrs.length === 0) return null // baseline, not a PR
  const bestW = Math.max(0, ...past.map((h) => h.topWeightLbs), ...pastPrs.map((p) => p.weightLbs))
  const bestE = Math.max(0, ...past.map((h) => h.est1Rm), ...pastPrs.map((p) => p.est1Rm))
  if (weightLbs > bestW) return 'weight'
  if (est1Rm(weightLbs, reps) > bestE) return 'e1rm'
  return null
}

export function seedDemoData(): void {
  if (!isDemoMode()) return
  if (localStorage.getItem(DEMO_FLAG)) return

  const routineByDay = new Map(SEED_ROUTINES.map((r) => [r.dayType, r]))
  const exById = new Map(SEED_EXERCISES.map((e) => [e.id, e]))
  const rotation = defaultRotation(format(new Date(), 'yyyy-MM-dd'))

  const workouts: Workout[] = []
  const sets: SetLog[] = []
  const stats: ExerciseStat[] = []
  const prs: PrRecord[] = []

  let sessionCount = 0
  // Scatter a realistic handful of missed / partial sessions across the
  // whole span, but keep the most recent ~2 weeks clean so the current
  // streak reads strong. (~7 misses, ~11 partials over 210 days.)
  const skipDays = new Set<number>()
  const partialDays = new Set<number>()
  for (let d = DAYS; d > 12; d--) {
    if (d % 29 === 0) skipDays.add(d)
    else if (d % 19 === 0) partialDays.add(d)
  }

  // Walk from DAYS days ago up to YESTERDAY. Today is intentionally left
  // open so a visitor lands on "Start workout" and can log live.
  for (let d = DAYS; d >= 1; d--) {
    const dateObj = subDays(new Date(), d)
    const dateStr = format(dateObj, 'yyyy-MM-dd')
    const sched = scheduleFor(rotation, dateStr)
    if (sched.dayType === 'rest') continue
    if (skipDays.has(d)) continue // missed workout

    const routine = routineByDay.get(sched.dayType)
    if (!routine) continue
    sessionCount++

    const started = new Date(dateObj)
    started.setHours(7, 30, 0, 0)
    const partial = partialDays.has(d)
    const dayExercises = routine.exercises.filter((e) => !e.challengeOnly)
    const used = partial ? dayExercises.slice(0, Math.ceil(dayExercises.length / 2)) : dayExercises

    const wid = `demo-w${d}`
    for (const re of used) {
      const ex = exById.get(re.exerciseId)
      if (!ex) continue
      const base = baseFor(re.exerciseId, ex.equipment)
      // Gentle upward progression proportional to the lift (~+33% across the
      // whole span) → a believable strength trend + a steady trickle of PRs,
      // and numbers that stay realistic on small lifts (e.g. lateral raises).
      const progression = base * 0.015 * Math.floor(sessionCount / 6)

      const exSets: SetLog[] = []
      let setNo = 0
      for (let w = 0; w < re.warmupSets; w++) {
        setNo++
        exSets.push(mkSet(wid, ex.id, setNo, Math.round((base * 0.5) / 5) * 5, ex.isTimed ? 30 : 8, true, started))
      }
      for (let s = 0; s < re.targetSets; s++) {
        setNo++
        const weight = ex.isTimed ? 0 : Math.round((base + progression) / 5) * 5
        exSets.push(mkSet(wid, ex.id, setNo, weight, re.targetReps, false, started))
      }

      const working = exSets.filter((s) => !s.isWarmup)
      if (working.length) {
        const top = working.reduce((a, b) => (b.weightLbs > a.weightLbs ? b : a))
        const kind = isPr(top.weightLbs, top.reps, stats, prs, ex.id)
        if (kind) {
          top.isPr = true
          prs.push({
            id: `demo-pr${prs.length}`,
            exerciseId: ex.id,
            date: dateStr,
            kind,
            weightLbs: top.weightLbs,
            reps: top.reps,
            est1Rm: est1Rm(top.weightLbs, top.reps),
          })
        }
      }
      sets.push(...exSets)
      const agg = aggregateSets(wid, dateStr, ex.id, exSets)
      if (agg.totalSets > 0) stats.push({ id: `demo-s${stats.length}`, ...agg })
    }

    workouts.push({
      id: wid,
      date: dateStr,
      dayType: sched.dayType,
      status: partial ? 'partial' : 'completed',
      startedAt: started.toISOString(),
      finishedAt: new Date(started.getTime() + routine.estMinutes * 60000).toISOString(),
      durationSec: routine.estMinutes * 60,
    })
  }

  localStorage.setItem('forge.workouts', JSON.stringify(workouts))
  localStorage.setItem('forge.sets', JSON.stringify(sets))
  localStorage.setItem('forge.stats', JSON.stringify(stats))
  localStorage.setItem('forge.prs', JSON.stringify(prs))
  // Neutral demo identity (no real name) — overrides the 'Palmer' default so
  // the public showcase greets a generic athlete.
  localStorage.setItem(
    'forge.settings',
    JSON.stringify({
      name: 'Alex',
      timezone: 'America/Los_Angeles',
      weeklyReports: true,
      monthlyReports: true,
      restTimerSec: 90,
    }),
  )
  localStorage.setItem(DEMO_FLAG, '1')
}

function mkSet(
  workoutId: string,
  exerciseId: string,
  setNumber: number,
  weightLbs: number,
  reps: number,
  isWarmup: boolean,
  started: Date,
): SetLog {
  return {
    id: `demo-set-${workoutId}-${exerciseId}-${setNumber}`,
    workoutId,
    exerciseId,
    setNumber,
    weightLbs,
    reps,
    isWarmup,
    isPr: false,
    loggedAt: started.toISOString(),
  }
}
