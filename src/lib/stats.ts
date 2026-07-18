import { differenceInCalendarDays, parseISO, subDays, format } from 'date-fns'
import type { ExerciseStat, SetLog, Workout } from './types'

/** Epley estimated 1-rep max; equals the weight itself for 1 rep. */
export function est1Rm(weightLbs: number, reps: number): number {
  if (weightLbs <= 0 || reps <= 0) return 0
  return Math.round(weightLbs * (1 + reps / 30))
}

/** Roll working sets up into the permanent aggregate row. */
export function aggregateSets(workoutId: string, workoutDate: string, exerciseId: string, sets: SetLog[]): Omit<ExerciseStat, 'id'> {
  const working = sets.filter((s) => !s.isWarmup)
  const top = working.reduce((a, b) => (b.weightLbs > a.weightLbs ? b : a), working[0])
  return {
    workoutId,
    workoutDate,
    exerciseId,
    topWeightLbs: top?.weightLbs ?? 0,
    topReps: top?.reps ?? 0,
    totalVolumeLbs: working.reduce((sum, s) => sum + s.weightLbs * s.reps, 0),
    totalReps: working.reduce((sum, s) => sum + s.reps, 0),
    totalSets: working.length,
    est1Rm: working.reduce((max, s) => Math.max(max, est1Rm(s.weightLbs, s.reps)), 0),
  }
}

/** Consecutive on-schedule days ending today/yesterday. Rest days per plan don't break it. */
export function currentStreak(workouts: Workout[], plannedDates: Set<string>, today: string): number {
  const done = new Set(workouts.filter((w) => w.status === 'completed' || w.status === 'partial').map((w) => w.date))
  let streak = 0
  let d = parseISO(today)
  // Today only counts if done; start from yesterday otherwise
  if (!done.has(format(d, 'yyyy-MM-dd'))) d = subDays(d, 1)
  for (let i = 0; i < 400; i++) {
    const key = format(d, 'yyyy-MM-dd')
    if (plannedDates.has(key)) {
      if (done.has(key)) streak++
      else break
    }
    d = subDays(d, 1)
  }
  return streak
}

export function adherence(workouts: Workout[], plannedDates: string[], start: string, end: string): { done: number; planned: number; pct: number } {
  const inRange = (d: string) => d >= start && d <= end
  const planned = plannedDates.filter(inRange).length
  const done = workouts.filter((w) => inRange(w.date) && (w.status === 'completed' || w.status === 'partial')).length
  return { done, planned, pct: planned === 0 ? 0 : Math.round((done / planned) * 100) }
}

export function totalVolume(stats: ExerciseStat[], start: string, end: string): number {
  return stats.filter((s) => s.workoutDate >= start && s.workoutDate <= end).reduce((sum, s) => sum + s.totalVolumeLbs, 0)
}

export function daysOfData(workouts: Workout[]): number {
  if (workouts.length === 0) return 0
  const first = workouts.reduce((a, b) => (a.date < b.date ? a : b))
  return differenceInCalendarDays(new Date(), parseISO(first.date))
}
