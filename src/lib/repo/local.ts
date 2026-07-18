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

const K = {
  exercises: 'forge.exercises',
  routines: 'forge.routines',
  rotation: 'forge.rotation',
  workouts: 'forge.workouts',
  sets: 'forge.sets',
  stats: 'forge.stats',
  prs: 'forge.prs',
  reports: 'forge.reports',
  settings: 'forge.settings',
}

function read<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

/** localStorage backend — used until Supabase env vars are configured,
 *  and as the instant offline path during development. */
export class LocalRepo implements Repo {
  async ready() {
    if (!localStorage.getItem(K.exercises)) write(K.exercises, SEED_EXERCISES)
    if (!localStorage.getItem(K.routines)) write(K.routines, SEED_ROUTINES)
    if (!localStorage.getItem(K.rotation)) write(K.rotation, defaultRotation(format(new Date(), 'yyyy-MM-dd')))
    if (!localStorage.getItem(K.settings)) write(K.settings, DEFAULT_SETTINGS)
    // v3 upgrade: existing installs gain the Mixed freestyle day
    const routines = await this.getRoutines()
    if (!routines.some((r) => r.dayType === MIXED_ROUTINE.dayType)) {
      write(K.routines, [...routines, MIXED_ROUTINE])
    }
  }

  async getExercises() {
    return read<Exercise[]>(K.exercises, [])
  }
  async addExercise(e: Exercise) {
    write(K.exercises, [...(await this.getExercises()), e])
  }
  async updateExercise(e: Exercise) {
    write(K.exercises, (await this.getExercises()).map((x) => (x.id === e.id ? e : x)))
  }

  async getRoutines() {
    return read<Routine[]>(K.routines, [])
  }
  async saveRoutine(r: Routine) {
    write(K.routines, (await this.getRoutines()).map((x) => (x.dayType === r.dayType ? r : x)))
  }
  async addRoutine(r: Routine) {
    write(K.routines, [...(await this.getRoutines()), r])
  }
  async deleteRoutine(dayType: string) {
    write(K.routines, (await this.getRoutines()).filter((x) => x.dayType !== dayType))
  }

  async getRotation() {
    return read<RotationState>(K.rotation, defaultRotation(format(new Date(), 'yyyy-MM-dd')))
  }
  async saveRotation(s: RotationState) {
    write(K.rotation, s)
  }

  async getWorkouts() {
    return read<Workout[]>(K.workouts, [])
  }
  async saveWorkout(w: Workout) {
    const all = await this.getWorkouts()
    const i = all.findIndex((x) => x.id === w.id)
    if (i >= 0) all[i] = w
    else all.push(w)
    write(K.workouts, all)
  }
  async deleteWorkout(id: string) {
    write(K.workouts, (await this.getWorkouts()).filter((w) => w.id !== id))
    write(K.sets, this.allSets().filter((s) => s.workoutId !== id))
    await this.deleteStatsForWorkout(id)
  }

  private allSets() {
    return read<SetLog[]>(K.sets, [])
  }
  async getSets(workoutId: string) {
    return this.allSets().filter((s) => s.workoutId === workoutId)
  }
  async getLastSetsForExercise(exerciseId: string, beforeWorkoutId: string) {
    const workouts = (await this.getWorkouts())
      .filter((w) => w.id !== beforeWorkoutId && w.status !== 'in-progress')
      .sort((a, b) => b.date.localeCompare(a.date))
    const sets = this.allSets()
    for (const w of workouts) {
      const hit = sets.filter((s) => s.workoutId === w.id && s.exerciseId === exerciseId && !s.isWarmup)
      if (hit.length) return hit.sort((a, b) => a.setNumber - b.setNumber)
    }
    return []
  }
  async saveSet(s: SetLog) {
    const all = this.allSets()
    const i = all.findIndex((x) => x.id === s.id)
    if (i >= 0) all[i] = s
    else all.push(s)
    write(K.sets, all)
  }
  async deleteSet(id: string) {
    write(K.sets, this.allSets().filter((s) => s.id !== id))
  }

  async getStats() {
    return read<ExerciseStat[]>(K.stats, [])
  }
  async saveStat(s: ExerciseStat) {
    const all = await this.getStats()
    const i = all.findIndex((x) => x.workoutId === s.workoutId && x.exerciseId === s.exerciseId)
    if (i >= 0) all[i] = s
    else all.push(s)
    write(K.stats, all)
  }

  async deleteStatsForWorkout(workoutId: string) {
    write(K.stats, (await this.getStats()).filter((s) => s.workoutId !== workoutId))
  }

  async getPrs() {
    return read<PrRecord[]>(K.prs, [])
  }
  async addPr(p: PrRecord) {
    write(K.prs, [...(await this.getPrs()), p])
  }
  async deletePrsOnDate(date: string) {
    write(K.prs, (await this.getPrs()).filter((p) => p.date !== date))
  }

  async getReports() {
    return read<Report[]>(K.reports, [])
  }

  async getSettings() {
    return read<Settings>(K.settings, DEFAULT_SETTINGS)
  }
  async saveSettings(s: Settings) {
    write(K.settings, s)
  }
}
