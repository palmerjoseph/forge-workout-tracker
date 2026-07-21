import { differenceInCalendarDays, format, getDay, parseISO, startOfWeek, endOfWeek, subDays } from 'date-fns'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Card, GlowButton } from '../components/ui'
import { IconBars, IconCalendar, IconCheck, IconFlame, IconMoon, IconReps, IconTimer } from '../components/icons'
import { scheduleFor, upcomingSchedule } from '../lib/rotation'
import { adherence, currentStreak, totalVolume } from '../lib/stats'
import { tierFor, trainerContext, trainerMessage } from '../lib/trainer'
import { todayKey, usePrs, useRotation, useRoutines, useSettings, useStats, useWorkouts } from '../lib/hooks'
import { supabaseClient } from '../lib/repo/supabase'
import { isDemoMode } from '../lib/demoSeed'
import { dayName } from '../lib/types'

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
}

/** Glowing stat tile: living icon, pulsing number (+ inline unit), label underneath. */
function StatTile({
  icon,
  value,
  suffix,
  label,
  onClick,
}: {
  icon: React.ReactNode
  value: string
  suffix?: string
  label: string
  onClick: () => void
}) {
  return (
    <Card active onClick={onClick} className="p-4 flex flex-col items-center text-center gap-1.5">
      <span className="icon-live">{icon}</span>
      <p className="stat stat-live text-3xl whitespace-nowrap">
        {value}
        {suffix && <span className="text-ink-dim text-base font-body ml-1">{suffix}</span>}
      </p>
      <p className="eyebrow">{label}</p>
    </Card>
  )
}

export function Home() {
  const nav = useNavigate()
  const today = todayKey()
  const { data: rotation } = useRotation()
  const { data: routines } = useRoutines()
  const { data: workouts = [] } = useWorkouts()
  const { data: stats = [] } = useStats()
  const { data: prs = [] } = usePrs()
  const { data: settings } = useSettings()

  if (!rotation || !routines || !settings) return null

  const sched = scheduleFor(rotation, today)
  const routine = sched.dayType === 'rest' ? null : routines.find((r) => r.dayType === sched.dayType)
  const exerciseCount = routine
    ? routine.exercises.filter((e) => !e.challengeOnly || (routine.challengeUnlocked && routine.challengeEnabled)).length
    : 0
  const doneToday = workouts.find((w) => w.date === today && (w.status === 'completed' || w.status === 'partial'))

  // This week (Mon–Sun) — but the public demo uses a rolling 7-day window so the
  // Home tiles never show a screenful of zeros on an early-week (e.g. Monday) visit,
  // while today stays open for "Start workout". Real app keeps the calendar week.
  const demoWeek = isDemoMode()
  const weekStart = demoWeek
    ? format(subDays(new Date(), 6), 'yyyy-MM-dd')
    : format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = demoWeek ? today : format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekPlanned = upcomingSchedule(rotation, weekStart, 7)
    .filter((d) => d.dayType !== 'rest')
    .map((d) => d.date)
  // Don't judge days before the very first workout ever logged
  const firstDate = workouts.length ? workouts.reduce((a, b) => (a.date < b.date ? a : b)).date : today
  const judgedPlanned = weekPlanned.filter((d) => d >= firstDate)
  const week = adherence(workouts, judgedPlanned, weekStart, weekEnd)
  const weekSoFar = adherence(workouts, judgedPlanned.filter((d) => d <= today), weekStart, today)
  const weekVolume = totalVolume(stats, weekStart, weekEnd)
  const prevVolume = totalVolume(stats, format(subDays(new Date(weekStart), 7), 'yyyy-MM-dd'), format(subDays(new Date(weekEnd), 7), 'yyyy-MM-dd'))
  const trendPct = prevVolume > 0 ? ((weekVolume - prevVolume) / prevVolume) * 100 : 0

  const plannedSet = new Set(
    upcomingSchedule(rotation, format(subDays(new Date(), 399), 'yyyy-MM-dd'), 400)
      .filter((d) => d.dayType !== 'rest')
      .map((d) => d.date),
  )
  const streak = currentStreak(workouts, plannedSet, today)

  // Tile stats: this week's days/reps + lifetime pounds
  const weekDone = workouts.filter(
    (w) => w.date >= weekStart && w.date <= weekEnd && (w.status === 'completed' || w.status === 'partial'),
  )
  const daysLifted = new Set(weekDone.map((w) => w.date)).size
  const weekIds = new Set(weekDone.map((w) => w.id))
  const weeklyReps = stats.filter((s) => weekIds.has(s.workoutId)).reduce((sum, s) => sum + s.totalReps, 0)
  const lifetimeLbs = stats.reduce((sum, s) => sum + s.totalVolumeLbs, 0)

  const verdict = trainerMessage({
    tier: tierFor(weekSoFar.pct, trendPct),
    done: week.done,
    planned: week.planned,
    trendPct,
    dateSeed: today,
    name: settings.name,
    isRestDay: sched.dayType === 'rest' && !doneToday,
    isFirstTime: workouts.length === 0,
  })
  // Context line: what the coach "remembers" — last session + Monday recap
  const finished = workouts
    .filter((w) => w.status === 'completed' || w.status === 'partial')
    .sort((a, b) => b.date.localeCompare(a.date))
  const last = finished[0]
  const lastVolume = last ? stats.filter((s) => s.workoutId === last.id).reduce((sum, s) => sum + s.totalVolumeLbs, 0) : 0
  const lastPrs = last ? prs.filter((p) => p.date === last.date).length : 0
  const context = trainerContext({
    lastSession: last
      ? {
          name: dayName(routines, last.dayType),
          daysAgo: differenceInCalendarDays(parseISO(today), parseISO(last.date)),
          volume: lastVolume,
          prCount: lastPrs,
        }
      : undefined,
    isMonday: getDay(new Date()) === 1,
    lastWeek: {
      sessions: finished.filter((w) => w.date >= format(subDays(new Date(weekStart), 7), 'yyyy-MM-dd') && w.date < weekStart).length,
      volume: prevVolume,
    },
  })
  const message = [context, verdict].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-4 pt-6">
      <motion.header {...fadeUp} transition={{ duration: 0.4 }}>
        {isDemoMode() && (
          <span className="inline-flex items-center gap-1.5 mb-2 px-2.5 py-1 rounded-full bg-lime-dim border border-edge-hi text-lime-hi text-[0.65rem] font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-lime icon-live" /> Live demo · sample data
          </span>
        )}
        <p className="eyebrow">{format(new Date(), 'EEEE, MMMM d')}</p>
        <h1 className="display text-4xl mt-1">
          Welcome back, <span className="text-lime" style={{ textShadow: '0 0 18px rgba(168,224,99,0.5)' }}>{settings.name}</span>
        </h1>
      </motion.header>

      {/* Today card */}
      <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.08 }}>
        {doneToday ? (
          <Card active onClick={() => nav('/train')} className="p-5 flex items-center gap-4">
            <span className="w-12 h-12 rounded-full bg-lime-dim text-lime flex items-center justify-center shrink-0">
              <IconCheck size={26} />
            </span>
            <div>
              <p className="eyebrow">Today · Done</p>
              <p className="display text-2xl mt-0.5">{dayName(routines, doneToday.dayType)} logged</p>
              <p className="text-sm text-ink-dim mt-1">
                {doneToday.status === 'completed' ? 'Full session. Good work — recover well.' : 'Partial session logged. Counted honestly.'}
                {' '}Tap Train to review or edit.
              </p>
            </div>
          </Card>
        ) : sched.dayType === 'rest' ? (
          <Card active className="p-5 flex items-center gap-4">
            <span className="w-12 h-12 rounded-full bg-glass-hi text-rest flex items-center justify-center shrink-0">
              <IconMoon size={24} />
            </span>
            <div className="flex-1">
              <p className="eyebrow">Today</p>
              <p className="display text-2xl mt-0.5 text-rest">Rest Day</p>
              <p className="text-sm text-ink-dim mt-1">Recovery is part of the program.</p>
            </div>
          </Card>
        ) : (
          <Card active className="p-5">
            <p className="eyebrow">Today</p>
            <h2 className="display text-3xl mt-1">
              It's <span className="text-lime">{routine?.name}</span> day
            </h2>
            <div className="flex items-center gap-4 mt-2 text-sm text-ink-dim">
              <span className="inline-flex items-center gap-1.5">
                <IconTimer size={16} /> ~{routine?.estMinutes} min
              </span>
              <span>{exerciseCount} exercises</span>
              {routine?.challengeUnlocked && routine.challengeEnabled && (
                <span className="text-lime text-xs font-semibold uppercase tracking-wider">Challenge on</span>
              )}
            </div>
            <GlowButton className="w-full mt-4" onClick={() => nav('/train')}>
              Start workout
            </GlowButton>
          </Card>
        )}
      </motion.div>

      {/* Stat tiles — glowing, pulsing, all tap through to Train */}
      <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.16 }} className="grid grid-cols-2 gap-4">
        <StatTile icon={<IconCalendar size={24} />} value={String(daysLifted)} label="Days lifted" onClick={() => nav('/train')} />
        <StatTile icon={<IconReps size={24} />} value={weeklyReps.toLocaleString()} label="Reps" onClick={() => nav('/train')} />
        <StatTile
          icon={<IconBars size={24} />}
          value={weekVolume >= 10000 ? `${Math.round(weekVolume / 1000)}k` : weekVolume.toLocaleString()}
          suffix="lb"
          label="Weekly volume"
          onClick={() => nav('/train')}
        />
        <StatTile
          icon={<span className="flame-flicker"><IconFlame size={24} /></span>}
          value={String(streak)}
          label="Streak"
          onClick={() => nav('/train')}
        />
      </motion.div>

      {/* Lifetime total — the always-growing number */}
      <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.22 }}>
        <Card active onClick={() => nav('/train')} className="p-5 flex items-center justify-center gap-4">
          <span className="icon-live">
            <IconBars size={28} />
          </span>
          <div className="text-center">
            <p className="stat stat-live text-4xl text-lime-hi">{Math.round(lifetimeLbs).toLocaleString()}</p>
            <p className="eyebrow mt-1">Total lbs · all time</p>
          </div>
        </Card>
      </motion.div>

      {/* Trainer message */}
      <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.28 }}>
        <Card active className="p-5 border-l-2 border-l-lime">
          <p className="eyebrow mb-2">Coach</p>
          <p className="text-[0.95rem] leading-relaxed text-ink">{message}</p>
        </Card>
      </motion.div>

      <LogoutButton />
    </div>
  )
}

/** Sign out (Supabase mode only) — returns to the FORGE login screen. */
function LogoutButton() {
  const client = supabaseClient()
  if (!client) return null
  const logout = async () => {
    localStorage.removeItem('forge.lastSeen')
    await client.auth.signOut()
  }
  return (
    <button
      onClick={logout}
      className="self-center text-sm text-ink-faint hover:text-ink-dim transition-colors cursor-pointer py-2 mt-2"
    >
      Log out
    </button>
  )
}
