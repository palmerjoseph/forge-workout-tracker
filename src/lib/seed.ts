import type { Exercise, Routine } from './types'

/* Exercise library — home gym: barbell, DBs to 90 lb, bands, bodyweight.
   Selected for a 42-year-old training 30–45 min: joint-friendly, compound-first. */
export const SEED_EXERCISES: Exercise[] = [
  // Chest
  { id: 'bb-bench', name: 'Barbell Bench Press', muscleGroup: 'chest', equipment: 'barbell', icon: 'barbell', isCustom: false },
  { id: 'db-incline-press', name: 'Incline DB Press', muscleGroup: 'chest', equipment: 'dumbbell', icon: 'dumbbell', isCustom: false },
  { id: 'pushup', name: 'Push-Ups', muscleGroup: 'chest', equipment: 'bodyweight', icon: 'bodyweight', isCustom: false },
  { id: 'db-flye', name: 'DB Flye', muscleGroup: 'chest', equipment: 'dumbbell', icon: 'dumbbell', isCustom: false },
  // Back
  { id: 'db-row', name: 'One-Arm DB Row', muscleGroup: 'back', equipment: 'dumbbell', icon: 'dumbbell', isCustom: false },
  { id: 'bb-row', name: 'Barbell Row', muscleGroup: 'back', equipment: 'barbell', icon: 'barbell', isCustom: false },
  { id: 'band-pullapart', name: 'Band Pull-Aparts', muscleGroup: 'back', equipment: 'band', icon: 'band', isCustom: false },
  { id: 'db-pullover', name: 'DB Pullover', muscleGroup: 'back', equipment: 'dumbbell', icon: 'dumbbell', isCustom: false },
  // Shoulders
  { id: 'db-ohp', name: 'DB Overhead Press', muscleGroup: 'shoulders', equipment: 'dumbbell', icon: 'dumbbell', isCustom: false },
  { id: 'db-lateral', name: 'Lateral Raises', muscleGroup: 'shoulders', equipment: 'dumbbell', icon: 'dumbbell', isCustom: false },
  { id: 'band-facepull', name: 'Band Face Pulls', muscleGroup: 'shoulders', equipment: 'band', icon: 'band', isCustom: false },
  // Biceps
  { id: 'db-curl', name: 'DB Curls', muscleGroup: 'biceps', equipment: 'dumbbell', icon: 'dumbbell', isCustom: false },
  { id: 'db-hammer', name: 'Hammer Curls', muscleGroup: 'biceps', equipment: 'dumbbell', icon: 'dumbbell', isCustom: false },
  // Triceps
  { id: 'db-oh-ext', name: 'Overhead Triceps Extension', muscleGroup: 'triceps', equipment: 'dumbbell', icon: 'dumbbell', isCustom: false },
  { id: 'bench-dip', name: 'Bench Dips', muscleGroup: 'triceps', equipment: 'bodyweight', icon: 'bodyweight', isCustom: false },
  // Legs
  { id: 'bb-squat', name: 'Barbell Squat', muscleGroup: 'legs', equipment: 'barbell', icon: 'barbell', isCustom: false },
  { id: 'bb-deadlift', name: 'Deadlift', muscleGroup: 'legs', equipment: 'barbell', icon: 'barbell', isCustom: false },
  { id: 'bb-rdl', name: 'Romanian Deadlift', muscleGroup: 'legs', equipment: 'barbell', icon: 'barbell', isCustom: false },
  { id: 'db-split-squat', name: 'Bulgarian Split Squats', muscleGroup: 'legs', equipment: 'dumbbell', icon: 'dumbbell', isCustom: false },
  { id: 'db-calf-raise', name: 'Standing Calf Raises', muscleGroup: 'calves', equipment: 'dumbbell', icon: 'dumbbell', isCustom: false },
  { id: 'band-leg-curl', name: 'Band Leg Curls', muscleGroup: 'legs', equipment: 'band', icon: 'band', isCustom: false },
  { id: 'db-goblet', name: 'Goblet Squat', muscleGroup: 'legs', equipment: 'dumbbell', icon: 'dumbbell', isCustom: false },
  // Abs
  { id: 'plank', name: 'Plank', muscleGroup: 'abs', equipment: 'bodyweight', icon: 'abs', isCustom: false, isTimed: true },
  { id: 'lying-leg-raise', name: 'Lying Leg Raises', muscleGroup: 'abs', equipment: 'bodyweight', icon: 'abs', isCustom: false },
  { id: 'russian-twist', name: 'Russian Twists', muscleGroup: 'abs', equipment: 'bodyweight', icon: 'abs', isCustom: false },
  { id: 'dead-bug', name: 'Dead Bug', muscleGroup: 'abs', equipment: 'bodyweight', icon: 'abs', isCustom: false },
]

/** Freestyle catch-all day — empty plan, built live with Add Exercise.
 *  Not part of the default rotation cycle. */
export const MIXED_ROUTINE: Routine = {
  dayType: 'M',
  name: 'Mixed',
  estMinutes: 30,
  challengeUnlocked: false,
  challengeEnabled: false,
  exercises: [],
}

/* A/B/C routines — ~5 main lifts + abs, 30–45 min — plus the Mixed day.
   Challenge-only rows appear when Palmer opts in after earning the unlock. */
export const SEED_ROUTINES: Routine[] = [
  {
    dayType: 'A',
    name: 'Chest & Back',
    estMinutes: 40,
    challengeUnlocked: false,
    challengeEnabled: false,
    exercises: [
      { exerciseId: 'bb-bench', order: 1, targetSets: 3, targetReps: 8, warmupSets: 1 },
      { exerciseId: 'db-incline-press', order: 2, targetSets: 3, targetReps: 10, warmupSets: 0 },
      { exerciseId: 'db-row', order: 3, targetSets: 3, targetReps: 10, warmupSets: 0 },
      { exerciseId: 'band-pullapart', order: 4, targetSets: 3, targetReps: 15, warmupSets: 0 },
      { exerciseId: 'pushup', order: 5, targetSets: 2, targetReps: 15, warmupSets: 0 },
      { exerciseId: 'plank', order: 6, targetSets: 2, targetReps: 45, warmupSets: 0 },
      { exerciseId: 'lying-leg-raise', order: 7, targetSets: 2, targetReps: 12, warmupSets: 0 },
      { exerciseId: 'bb-row', order: 8, targetSets: 3, targetReps: 8, warmupSets: 1, challengeOnly: true },
    ],
  },
  {
    dayType: 'B',
    name: 'Arms & Shoulders',
    estMinutes: 35,
    challengeUnlocked: false,
    challengeEnabled: false,
    exercises: [
      { exerciseId: 'db-ohp', order: 1, targetSets: 3, targetReps: 8, warmupSets: 1 },
      { exerciseId: 'db-lateral', order: 2, targetSets: 3, targetReps: 12, warmupSets: 0 },
      { exerciseId: 'db-curl', order: 3, targetSets: 3, targetReps: 10, warmupSets: 0 },
      { exerciseId: 'db-hammer', order: 4, targetSets: 2, targetReps: 10, warmupSets: 0 },
      { exerciseId: 'db-oh-ext', order: 5, targetSets: 3, targetReps: 10, warmupSets: 0 },
      { exerciseId: 'russian-twist', order: 6, targetSets: 2, targetReps: 20, warmupSets: 0 },
      { exerciseId: 'dead-bug', order: 7, targetSets: 2, targetReps: 10, warmupSets: 0 },
      { exerciseId: 'band-facepull', order: 8, targetSets: 3, targetReps: 15, warmupSets: 0, challengeOnly: true },
    ],
  },
  {
    dayType: 'C',
    name: 'Legs',
    estMinutes: 45,
    challengeUnlocked: false,
    challengeEnabled: false,
    exercises: [
      { exerciseId: 'bb-squat', order: 1, targetSets: 3, targetReps: 8, warmupSets: 2 },
      { exerciseId: 'bb-rdl', order: 2, targetSets: 3, targetReps: 8, warmupSets: 1 },
      { exerciseId: 'db-split-squat', order: 3, targetSets: 2, targetReps: 10, warmupSets: 0 },
      { exerciseId: 'db-calf-raise', order: 4, targetSets: 3, targetReps: 15, warmupSets: 0 },
      { exerciseId: 'band-leg-curl', order: 5, targetSets: 2, targetReps: 15, warmupSets: 0 },
      { exerciseId: 'lying-leg-raise', order: 6, targetSets: 2, targetReps: 12, warmupSets: 0 },
      { exerciseId: 'bb-deadlift', order: 7, targetSets: 2, targetReps: 5, warmupSets: 2, challengeOnly: true },
    ],
  },
  MIXED_ROUTINE,
]

export const DEFAULT_SETTINGS = {
  name: 'Palmer',
  timezone: 'America/Los_Angeles',
  weeklyReports: true,
  monthlyReports: true,
  restTimerSec: 90,
}
