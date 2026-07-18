export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'legs'
  | 'glutes'
  | 'calves'
  | 'abs'
  | 'full-body'

export type Equipment = 'barbell' | 'dumbbell' | 'band' | 'bodyweight'

/** Routine day identifier. A/B/C are seeded; custom routines get D, E, … */
export type DayType = string
export const DAY_NAMES: Record<string, string> = {
  A: 'Chest & Back',
  B: 'Arms & Shoulders',
  C: 'Legs',
}

/** Resolve a day type to its routine name (works for custom routines). */
export function dayName(routines: { dayType: string; name: string }[] | undefined, dayType: string): string {
  return routines?.find((r) => r.dayType === dayType)?.name ?? DAY_NAMES[dayType] ?? `Day ${dayType}`
}

export interface Exercise {
  id: string
  name: string
  muscleGroup: MuscleGroup
  equipment: Equipment
  icon: string // key into the icon set
  isCustom: boolean
  /** true = timed hold (plank) — log seconds in `reps` */
  isTimed?: boolean
  notes?: string
}

export interface RoutineExercise {
  exerciseId: string
  order: number
  targetSets: number
  targetReps: number
  /** warm-up sets shown before working sets (not counted in volume) */
  warmupSets: number
  /** only present when Challenge mode adds it */
  challengeOnly?: boolean
}

export interface Routine {
  dayType: DayType
  name: string
  exercises: RoutineExercise[]
  /** estimated minutes, shown on the day card */
  estMinutes: number
  challengeUnlocked: boolean
  challengeEnabled: boolean
}

export type WorkoutStatus = 'in-progress' | 'completed' | 'partial' | 'skipped'

export interface SetLog {
  id: string
  workoutId: string
  exerciseId: string
  setNumber: number
  weightLbs: number // 0 for bodyweight/band
  reps: number // seconds when isTimed
  isWarmup: boolean
  isPr: boolean
  loggedAt: string
}

export interface Workout {
  id: string
  date: string // yyyy-MM-dd local
  dayType: DayType
  status: WorkoutStatus
  startedAt: string
  finishedAt?: string
  durationSec?: number
  notes?: string
}

/** Permanent per-exercise aggregate — survives 60-day set pruning */
export interface ExerciseStat {
  id: string
  workoutId: string
  workoutDate: string
  exerciseId: string
  topWeightLbs: number
  topReps: number
  totalVolumeLbs: number
  totalReps: number
  totalSets: number
  est1Rm: number
}

export interface PrRecord {
  id: string
  exerciseId: string
  date: string
  kind: 'weight' | 'reps' | 'e1rm'
  weightLbs: number
  reps: number
  est1Rm: number
}

export interface RotationOverride {
  date: string // yyyy-MM-dd
  dayType: DayType | 'rest'
}

export interface RotationState {
  /** anchor date the pattern counts from */
  anchorDate: string
  /** dayType scheduled on the anchor date */
  anchorDay: DayType
  /** e.g. [1,1,0] = 2 on, 1 off */
  pattern: number[]
  overrides: RotationOverride[]
  /** ordered day-type cycle; defaults to ['A','B','C'] when absent (pre-v2 states) */
  cycle?: string[]
}

export interface Report {
  id: string
  kind: 'weekly' | 'monthly' | 'six-month' | 'yearly'
  periodStart: string
  periodEnd: string
  generatedAt: string
  title: string
  html: string
  headline: string
}

export interface Settings {
  name: string
  timezone: string
  weeklyReports: boolean
  monthlyReports: boolean
  /** rest countdown length in seconds; 0 disables the timer */
  restTimerSec?: number
}
