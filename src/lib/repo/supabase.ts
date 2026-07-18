import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { format } from 'date-fns'
import { DEFAULT_SETTINGS, MIXED_ROUTINE, SEED_EXERCISES, SEED_ROUTINES } from '../seed'
import { defaultRotation } from '../rotation'
import type {
  Exercise,
  ExerciseStat,
  PrRecord,
  Report,
  Routine,
  RotationState,
  SetLog,
  Settings,
  Workout,
} from '../types'
import type { Repo } from './types'

/* All tables carry the forge_ prefix — they cohabit a Supabase project
   with Palmer's Costco tracker. Never touch non-forge_ tables. */

export function supabaseClient(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

const snake = {
  exercise: (e: Exercise) => ({
    id: e.id,
    name: e.name,
    muscle_group: e.muscleGroup,
    equipment: e.equipment,
    icon: e.icon,
    is_custom: e.isCustom,
    is_timed: e.isTimed ?? false,
    notes: e.notes ?? null,
  }),
  set: (s: SetLog) => ({
    id: s.id,
    workout_id: s.workoutId,
    exercise_id: s.exerciseId,
    set_number: s.setNumber,
    weight_lbs: s.weightLbs,
    reps: s.reps,
    is_warmup: s.isWarmup,
    is_pr: s.isPr,
    logged_at: s.loggedAt,
  }),
  workout: (w: Workout) => ({
    id: w.id,
    date: w.date,
    day_type: w.dayType,
    status: w.status,
    started_at: w.startedAt,
    finished_at: w.finishedAt ?? null,
    duration_sec: w.durationSec ?? null,
    notes: w.notes ?? null,
  }),
  stat: (s: ExerciseStat) => ({
    id: s.id,
    workout_id: s.workoutId,
    workout_date: s.workoutDate,
    exercise_id: s.exerciseId,
    top_weight_lbs: s.topWeightLbs,
    top_reps: s.topReps,
    total_volume_lbs: s.totalVolumeLbs,
    total_reps: s.totalReps,
    total_sets: s.totalSets,
    est_1rm: s.est1Rm,
  }),
  pr: (p: PrRecord) => ({
    id: p.id,
    exercise_id: p.exerciseId,
    date: p.date,
    kind: p.kind,
    weight_lbs: p.weightLbs,
    reps: p.reps,
    est_1rm: p.est1Rm,
  }),
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const camel = {
  exercise: (r: any): Exercise => ({
    id: r.id,
    name: r.name,
    muscleGroup: r.muscle_group,
    equipment: r.equipment,
    icon: r.icon,
    isCustom: r.is_custom,
    isTimed: r.is_timed || undefined,
    notes: r.notes ?? undefined,
  }),
  set: (r: any): SetLog => ({
    id: r.id,
    workoutId: r.workout_id,
    exerciseId: r.exercise_id,
    setNumber: r.set_number,
    weightLbs: Number(r.weight_lbs),
    reps: r.reps,
    isWarmup: r.is_warmup,
    isPr: r.is_pr,
    loggedAt: r.logged_at,
  }),
  workout: (r: any): Workout => ({
    id: r.id,
    date: r.date,
    dayType: r.day_type,
    status: r.status,
    startedAt: r.started_at,
    finishedAt: r.finished_at ?? undefined,
    durationSec: r.duration_sec ?? undefined,
    notes: r.notes ?? undefined,
  }),
  stat: (r: any): ExerciseStat => ({
    id: r.id,
    workoutId: r.workout_id,
    workoutDate: r.workout_date,
    exerciseId: r.exercise_id,
    topWeightLbs: Number(r.top_weight_lbs),
    topReps: r.top_reps,
    totalVolumeLbs: Number(r.total_volume_lbs),
    totalReps: r.total_reps,
    totalSets: r.total_sets,
    est1Rm: Number(r.est_1rm),
  }),
  pr: (r: any): PrRecord => ({
    id: r.id,
    exerciseId: r.exercise_id,
    date: r.date,
    kind: r.kind,
    weightLbs: Number(r.weight_lbs),
    reps: r.reps,
    est1Rm: Number(r.est_1rm),
  }),
  report: (r: any): Report => ({
    id: r.id,
    kind: r.kind,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    generatedAt: r.generated_at,
    title: r.title,
    html: r.html,
    headline: r.headline,
  }),
}

export class SupabaseRepo implements Repo {
  private db: SupabaseClient
  constructor(db: SupabaseClient) {
    this.db = db
  }

  private async q<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
    const { data, error } = await p
    if (error) throw new Error(error.message)
    return data as T
  }

  async ready() {
    // First run: seed the library, routines, rotation, settings if empty
    const existing = await this.q<any[]>(this.db.from('forge_exercises').select('id').limit(1))
    if (existing.length === 0) {
      await this.q(this.db.from('forge_exercises').insert(SEED_EXERCISES.map(snake.exercise)))
      for (const r of SEED_ROUTINES) {
        await this.q(
          this.db.from('forge_routines').insert({
            day_type: r.dayType,
            name: r.name,
            est_minutes: r.estMinutes,
            challenge_unlocked: r.challengeUnlocked,
            challenge_enabled: r.challengeEnabled,
            exercises: r.exercises,
          }),
        )
      }
      await this.q(
        this.db.from('forge_kv').upsert([
          { key: 'rotation', value: defaultRotation(format(new Date(), 'yyyy-MM-dd')) },
          { key: 'settings', value: DEFAULT_SETTINGS },
        ]),
      )
    }
    // v3 upgrade: existing installs gain the Mixed freestyle day.
    // Requires migration-v2.sql (day_type check dropped); ignore failure until then.
    const routines = await this.q<any[]>(this.db.from('forge_routines').select('day_type'))
    if (!routines.some((r) => r.day_type === MIXED_ROUTINE.dayType)) {
      try {
        await this.addRoutine(MIXED_ROUTINE)
      } catch (e) {
        console.warn('Mixed routine insert deferred (run migration-v2.sql):', e)
      }
    }
  }

  async getExercises() {
    return (await this.q<any[]>(this.db.from('forge_exercises').select('*').order('name'))).map(camel.exercise)
  }
  async addExercise(e: Exercise) {
    await this.q(this.db.from('forge_exercises').insert(snake.exercise(e)))
  }
  async updateExercise(e: Exercise) {
    await this.q(this.db.from('forge_exercises').update(snake.exercise(e)).eq('id', e.id))
  }

  async getRoutines() {
    const rows = await this.q<any[]>(this.db.from('forge_routines').select('*'))
    return rows.map(
      (r): Routine => ({
        dayType: r.day_type,
        name: r.name,
        estMinutes: r.est_minutes,
        challengeUnlocked: r.challenge_unlocked,
        challengeEnabled: r.challenge_enabled,
        exercises: r.exercises,
      }),
    )
  }
  async saveRoutine(r: Routine) {
    await this.q(
      this.db
        .from('forge_routines')
        .update({
          name: r.name,
          est_minutes: r.estMinutes,
          challenge_unlocked: r.challengeUnlocked,
          challenge_enabled: r.challengeEnabled,
          exercises: r.exercises,
        })
        .eq('day_type', r.dayType),
    )
  }
  async addRoutine(r: Routine) {
    await this.q(
      this.db.from('forge_routines').insert({
        day_type: r.dayType,
        name: r.name,
        est_minutes: r.estMinutes,
        challenge_unlocked: r.challengeUnlocked,
        challenge_enabled: r.challengeEnabled,
        exercises: r.exercises,
      }),
    )
  }
  async deleteRoutine(dayType: string) {
    await this.q(this.db.from('forge_routines').delete().eq('day_type', dayType))
  }

  private async kvGet<T>(key: string, fallback: T): Promise<T> {
    const rows = await this.q<any[]>(this.db.from('forge_kv').select('value').eq('key', key))
    return rows.length ? (rows[0].value as T) : fallback
  }
  private async kvSet(key: string, value: unknown) {
    await this.q(this.db.from('forge_kv').upsert({ key, value }))
  }

  async getRotation() {
    return this.kvGet<RotationState>('rotation', defaultRotation(format(new Date(), 'yyyy-MM-dd')))
  }
  async saveRotation(s: RotationState) {
    await this.kvSet('rotation', s)
  }

  async getWorkouts() {
    return (await this.q<any[]>(this.db.from('forge_workouts').select('*').order('date'))).map(camel.workout)
  }
  async saveWorkout(w: Workout) {
    await this.q(this.db.from('forge_workouts').upsert(snake.workout(w)))
  }
  async deleteWorkout(id: string) {
    // forge_sets cascade via FK; aggregates are cleaned explicitly
    await this.deleteStatsForWorkout(id)
    await this.q(this.db.from('forge_workouts').delete().eq('id', id))
  }

  async getSets(workoutId: string) {
    return (
      await this.q<any[]>(this.db.from('forge_sets').select('*').eq('workout_id', workoutId).order('set_number'))
    ).map(camel.set)
  }
  async getLastSetsForExercise(exerciseId: string, beforeWorkoutId: string) {
    // Most recent non-warmup sets for this exercise from a finished workout
    const rows = await this.q<any[]>(
      this.db
        .from('forge_sets')
        .select('*, forge_workouts!inner(date, status)')
        .eq('exercise_id', exerciseId)
        .eq('is_warmup', false)
        .neq('workout_id', beforeWorkoutId)
        .neq('forge_workouts.status', 'in-progress')
        .order('logged_at', { ascending: false })
        .limit(12),
    )
    if (!rows.length) return []
    const latestWorkout = rows[0].workout_id
    return rows
      .filter((r) => r.workout_id === latestWorkout)
      .map(camel.set)
      .sort((a, b) => a.setNumber - b.setNumber)
  }
  async saveSet(s: SetLog) {
    await this.q(this.db.from('forge_sets').upsert(snake.set(s)))
  }
  async deleteSet(id: string) {
    await this.q(this.db.from('forge_sets').delete().eq('id', id))
  }

  async getStats() {
    return (await this.q<any[]>(this.db.from('forge_exercise_stats').select('*').order('workout_date'))).map(camel.stat)
  }
  async saveStat(s: ExerciseStat) {
    await this.q(
      this.db.from('forge_exercise_stats').upsert(snake.stat(s), { onConflict: 'workout_id,exercise_id' }),
    )
  }

  async deleteStatsForWorkout(workoutId: string) {
    await this.q(this.db.from('forge_exercise_stats').delete().eq('workout_id', workoutId))
  }

  async getPrs() {
    return (await this.q<any[]>(this.db.from('forge_prs').select('*').order('date'))).map(camel.pr)
  }
  async addPr(p: PrRecord) {
    await this.q(this.db.from('forge_prs').insert(snake.pr(p)))
  }
  async deletePrsOnDate(date: string) {
    await this.q(this.db.from('forge_prs').delete().eq('date', date))
  }

  async getReports() {
    return (
      await this.q<any[]>(this.db.from('forge_reports').select('*').order('generated_at', { ascending: false }))
    ).map(camel.report)
  }

  async getSettings() {
    return this.kvGet<Settings>('settings', DEFAULT_SETTINGS)
  }
  async saveSettings(s: Settings) {
    await this.kvSet('settings', s)
  }
}
