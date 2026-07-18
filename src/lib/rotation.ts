import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import type { DayType, RotationState } from './types'

const DEFAULT_CYCLE: DayType[] = ['A', 'B', 'C']

function cycleOf(state: RotationState): DayType[] {
  return state.cycle && state.cycle.length > 0 ? state.cycle : DEFAULT_CYCLE
}

export interface ScheduledDay {
  date: string
  dayType: DayType | 'rest'
  isOverride: boolean
}

/**
 * Resolve what the rotation schedules for a given date.
 * Pattern [1,1,0] = 2 on, 1 off. Workout day-types cycle A→B→C independent
 * of rest days, counted from the anchor. Overrides win over the pattern.
 */
export function scheduleFor(state: RotationState, date: string): ScheduledDay {
  const override = state.overrides.find((o) => o.date === date)
  if (override) return { date, dayType: override.dayType, isOverride: true }

  const offset = differenceInCalendarDays(parseISO(date), parseISO(state.anchorDate))
  const pattern = state.pattern.length ? state.pattern : [1, 1, 0]

  // Position within the repeating pattern (handles negative offsets)
  const len = pattern.length
  const pos = ((offset % len) + len) % len
  if (pattern[pos] === 0) return { date, dayType: 'rest', isOverride: false }

  // Count workout slots from anchor to this date to find place in the day cycle
  const cycle = cycleOf(state)
  const anchorIdx = Math.max(0, cycle.indexOf(state.anchorDay))
  let workoutsBetween = 0
  const step = offset >= 0 ? 1 : -1
  for (let i = step; offset >= 0 ? i <= offset : i >= offset; i += step) {
    const p = (((i % len) + len) % len)
    if (pattern[p] === 1) workoutsBetween += step
  }
  const n = cycle.length
  const idx = (((anchorIdx + workoutsBetween) % n) + n) % n
  return { date, dayType: cycle[idx], isOverride: false }
}

export function upcomingSchedule(state: RotationState, fromDate: string, days: number): ScheduledDay[] {
  const start = parseISO(fromDate)
  return Array.from({ length: days }, (_, i) => scheduleFor(state, format(addDays(start, i), 'yyyy-MM-dd')))
}

/** Push today's workout to tomorrow: today becomes rest, tomorrow onward shifts via re-anchoring. */
export function pushToTomorrow(state: RotationState, today: string): RotationState {
  const sched = scheduleFor(state, today)
  if (sched.dayType === 'rest') return state
  const tomorrow = format(addDays(parseISO(today), 1), 'yyyy-MM-dd')
  return {
    ...state,
    overrides: [
      ...state.overrides.filter((o) => o.date !== today && o.date !== tomorrow),
      { date: today, dayType: 'rest' },
      { date: tomorrow, dayType: sched.dayType },
    ],
    // Re-anchor after tomorrow so the cycle continues from the shifted day
    anchorDate: tomorrow,
    anchorDay: sched.dayType,
  }
}

export function setOverride(state: RotationState, date: string, dayType: DayType | 'rest'): RotationState {
  return { ...state, overrides: [...state.overrides.filter((o) => o.date !== date), { date, dayType }] }
}

export function clearOverride(state: RotationState, date: string): RotationState {
  return { ...state, overrides: state.overrides.filter((o) => o.date !== date) }
}

export function defaultRotation(today: string): RotationState {
  return { anchorDate: today, anchorDay: 'A', pattern: [1, 1, 0], overrides: [], cycle: ['A', 'B', 'C'] }
}
