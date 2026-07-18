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

/** Storage backend contract. LocalRepo (offline/localStorage) and
 *  SupabaseRepo implement the same shape; the app never talks to
 *  storage any other way. */
export interface Repo {
  ready(): Promise<void>

  getExercises(): Promise<Exercise[]>
  addExercise(e: Exercise): Promise<void>
  updateExercise(e: Exercise): Promise<void>

  getRoutines(): Promise<Routine[]>
  saveRoutine(r: Routine): Promise<void>
  addRoutine(r: Routine): Promise<void>
  deleteRoutine(dayType: string): Promise<void>

  getRotation(): Promise<RotationState>
  saveRotation(s: RotationState): Promise<void>

  getWorkouts(): Promise<Workout[]>
  saveWorkout(w: Workout): Promise<void>
  /** Removes the workout and its sets (used by the discard escape hatch) */
  deleteWorkout(id: string): Promise<void>

  getSets(workoutId: string): Promise<SetLog[]>
  /** Working sets from the most recent completed workout containing this exercise — powers prefill. */
  getLastSetsForExercise(exerciseId: string, beforeWorkoutId: string): Promise<SetLog[]>
  saveSet(s: SetLog): Promise<void>
  deleteSet(id: string): Promise<void>

  getStats(): Promise<ExerciseStat[]>
  saveStat(s: ExerciseStat): Promise<void>
  /** Editing support: wipe a workout's aggregates before recompute */
  deleteStatsForWorkout(workoutId: string): Promise<void>

  getPrs(): Promise<PrRecord[]>
  addPr(p: PrRecord): Promise<void>
  /** Editing support: wipe PRs recorded on a date before recompute */
  deletePrsOnDate(date: string): Promise<void>

  getReports(): Promise<Report[]>

  getSettings(): Promise<Settings>
  saveSettings(s: Settings): Promise<void>
}

export function uid(): string {
  return crypto.randomUUID()
}
