import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { repo, uid } from './repo'
import { aggregateSets, est1Rm } from './stats'
import type { ExerciseStat, PrRecord, SetLog, Workout } from './types'

export const qk = {
  exercises: ['exercises'],
  routines: ['routines'],
  rotation: ['rotation'],
  workouts: ['workouts'],
  sets: (wid: string) => ['sets', wid],
  lastSets: (eid: string, wid: string) => ['lastSets', eid, wid],
  stats: ['stats'],
  prs: ['prs'],
  reports: ['reports'],
  settings: ['settings'],
}

export const useExercises = () => useQuery({ queryKey: qk.exercises, queryFn: () => repo.getExercises() })
export const useRoutines = () => useQuery({ queryKey: qk.routines, queryFn: () => repo.getRoutines() })
export const useRotation = () => useQuery({ queryKey: qk.rotation, queryFn: () => repo.getRotation() })
export const useWorkouts = () => useQuery({ queryKey: qk.workouts, queryFn: () => repo.getWorkouts() })
export const useSets = (workoutId: string | undefined) =>
  useQuery({ queryKey: qk.sets(workoutId ?? ''), queryFn: () => repo.getSets(workoutId!), enabled: !!workoutId })
export const useLastSets = (exerciseId: string, workoutId: string) =>
  useQuery({
    queryKey: qk.lastSets(exerciseId, workoutId),
    queryFn: () => repo.getLastSetsForExercise(exerciseId, workoutId),
  })
export const useStats = () => useQuery({ queryKey: qk.stats, queryFn: () => repo.getStats() })
export const usePrs = () => useQuery({ queryKey: qk.prs, queryFn: () => repo.getPrs() })
export const useReports = () => useQuery({ queryKey: qk.reports, queryFn: () => repo.getReports() })
export const useSettings = () => useQuery({ queryKey: qk.settings, queryFn: () => repo.getSettings() })

export function useInvalidate() {
  const qc = useQueryClient()
  return (...keys: unknown[][]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: k }))
}

export function useSaveWorkout() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: (w: Workout) => repo.saveWorkout(w),
    onSuccess: () => inv(qk.workouts),
  })
}

export function useSaveSet() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: (s: SetLog) => repo.saveSet(s),
    onSuccess: (_d, s) => inv(qk.sets(s.workoutId)),
  })
}

export function useDeleteSet(workoutId: string) {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => repo.deleteSet(id),
    onSuccess: () => inv(qk.sets(workoutId)),
  })
}

/** Detect whether a just-logged working set is a PR against permanent history. */
export function detectPr(
  s: { weightLbs: number; reps: number },
  history: ExerciseStat[],
  prs: PrRecord[],
  exerciseId: string,
): PrRecord['kind'] | null {
  const past = history.filter((h) => h.exerciseId === exerciseId)
  const pastPrs = prs.filter((p) => p.exerciseId === exerciseId)
  if (past.length === 0 && pastPrs.length === 0) return null // first time: baseline, not a PR
  const bestW = Math.max(0, ...past.map((h) => h.topWeightLbs), ...pastPrs.map((p) => p.weightLbs))
  const bestE = Math.max(0, ...past.map((h) => h.est1Rm), ...pastPrs.map((p) => p.est1Rm))
  if (s.weightLbs > bestW) return 'weight'
  if (est1Rm(s.weightLbs, s.reps) > bestE) return 'e1rm'
  return null
}

/** Finish (or re-finish after editing) a workout: roll up aggregates, record PRs.
 *  Re-finishing first wipes this workout's aggregates + same-day PRs so the
 *  recompute is clean and PRs are judged against history excluding this workout. */
export function useFinishWorkout() {
  const inv = useInvalidate()
  return useMutation({
    mutationFn: async (args: { workout: Workout; status: 'completed' | 'partial' }) => {
      const { workout, status } = args
      await repo.deleteStatsForWorkout(workout.id)
      await repo.deletePrsOnDate(workout.date)
      const sets = await repo.getSets(workout.id)
      const stats = await repo.getStats()
      const prs = await repo.getPrs()
      const byExercise = new Map<string, SetLog[]>()
      for (const s of sets) {
        byExercise.set(s.exerciseId, [...(byExercise.get(s.exerciseId) ?? []), s])
      }
      for (const [exerciseId, exSets] of byExercise) {
        const agg = aggregateSets(workout.id, workout.date, exerciseId, exSets)
        if (agg.totalSets === 0) continue
        await repo.saveStat({ id: uid(), ...agg })
        const top = exSets.filter((s) => !s.isWarmup).reduce((a, b) => (b.weightLbs > a.weightLbs ? b : a))
        const kind = detectPr(top, stats, prs, exerciseId)
        if (kind) {
          await repo.addPr({
            id: uid(),
            exerciseId,
            date: workout.date,
            kind,
            weightLbs: top.weightLbs,
            reps: top.reps,
            est1Rm: est1Rm(top.weightLbs, top.reps),
          })
        }
      }
      const finished: Workout = {
        ...workout,
        status,
        finishedAt: workout.finishedAt ?? new Date().toISOString(),
        // keep the original duration when re-finishing an edited workout
        durationSec: workout.durationSec ?? Math.round((Date.now() - new Date(workout.startedAt).getTime()) / 1000),
      }
      await repo.saveWorkout(finished)

      // Challenge mode unlocks after 6 fully-completed sessions of this day type
      if (status === 'completed') {
        const all = await repo.getWorkouts()
        const fullCount = all.filter((w) => w.dayType === workout.dayType && w.status === 'completed').length
        if (fullCount >= 6) {
          const routines = await repo.getRoutines()
          const r = routines.find((x) => x.dayType === workout.dayType)
          if (r && !r.challengeUnlocked) await repo.saveRoutine({ ...r, challengeUnlocked: true })
        }
      }
      return finished
    },
    onSuccess: () => inv(qk.workouts, qk.stats, qk.prs, qk.routines),
  })
}

export const todayKey = () => format(new Date(), 'yyyy-MM-dd')
