import { useMemo, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  parseISO,
  startOfMonth,
  subDays,
} from 'date-fns'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, GlowButton, Segmented, Sheet, EmptyState } from '../components/ui'
import { IconChevronLeft, IconChevronRight, IconPulse, IconTrophy } from '../components/icons'
import { scheduleFor } from '../lib/rotation'
import { daysOfData } from '../lib/stats'
import { todayKey, useExercises, usePrs, useRotation, useRoutines, useSaveWorkout, useSets, useStats, useWorkouts } from '../lib/hooks'
import { dayName, type ExerciseStat, type MuscleGroup } from '../lib/types'

/* Validated categorical palette (dataviz six checks, dark surface #0A0F0A).
   Fixed order — never cycle or reassign. Muscle identity also carried by labels. */
const MUSCLE_COLORS: { key: string; label: string; groups: MuscleGroup[]; color: string }[] = [
  { key: 'chest', label: 'Chest', groups: ['chest'], color: '#6FA83C' },
  { key: 'back', label: 'Back', groups: ['back'], color: '#C05E8A' },
  { key: 'arms', label: 'Arms & Shoulders', groups: ['shoulders', 'biceps', 'triceps'], color: '#4F7FD9' },
  { key: 'legs', label: 'Legs', groups: ['legs', 'glutes', 'calves'], color: '#BE8A3A' },
  { key: 'abs', label: 'Abs', groups: ['abs'], color: '#2F9E8F' },
]

type Range = '1W' | '1M' | '6M' | '1Y'
const RANGE_DAYS: Record<Range, number> = { '1W': 7, '1M': 30, '6M': 182, '1Y': 365 }

export function Progress() {
  const [range, setRange] = useState<Range>('1W')
  const { data: workouts = [] } = useWorkouts()
  const { data: stats = [] } = useStats()
  const { data: prs = [] } = usePrs()
  const { data: exercises = [] } = useExercises()
  const dataDays = daysOfData(workouts)

  const rangeStart = format(subDays(new Date(), RANGE_DAYS[range]), 'yyyy-MM-dd')
  const inRange = stats.filter((s) => s.workoutDate >= rangeStart)

  return (
    <div className="pt-6 flex flex-col gap-4">
      <header>
        <p className="eyebrow">The evidence</p>
        <h1 className="display text-4xl mt-1">Progress</h1>
      </header>

      <Segmented<Range>
        value={range}
        onChange={setRange}
        options={[
          { value: '1W', label: '1W' },
          { value: '1M', label: '1M' },
          { value: '6M', label: '6M', disabled: dataDays < 60 },
          { value: '1Y', label: '1Y', disabled: dataDays < 182 },
        ]}
      />
      {dataDays < 60 && (
        <p className="text-xs text-ink-faint -mt-2">
          6M unlocks after 60 days of training · 1Y after 6 months. Keep showing up.
        </p>
      )}

      <CalendarHeatmap />

      <VolumeChart stats={inRange} range={range} />

      <StrengthChart stats={inRange} exercises={exercises} />

      {/* Muscle balance is always the trailing 7 days, independent of the range toggle */}
      <MuscleDonut stats={stats.filter((s) => s.workoutDate >= format(subDays(new Date(), 7), 'yyyy-MM-dd'))} exercises={exercises} />

      {/* PR wall */}
      <Card className="p-4">
        <p className="eyebrow mb-3">PR Wall</p>
        {prs.length === 0 ? (
          <EmptyState
            icon={<IconTrophy size={34} />}
            title="No records yet"
            body="Your second session on any lift is your first shot at a PR."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {[...prs]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 10)
              .map((p) => {
                const ex = exercises.find((e) => e.id === p.exerciseId)
                return (
                  <div key={p.id} className="flex items-center gap-3 py-1.5 border-b border-edge last:border-0">
                    <span className="text-gold" style={{ filter: 'drop-shadow(0 0 6px rgba(255,214,107,0.5))' }}>
                      <IconTrophy size={18} />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{ex?.name ?? 'Exercise'}</p>
                      <p className="text-xs text-ink-dim">{format(parseISO(p.date), 'MMM d, yyyy')}</p>
                    </div>
                    <p className="stat text-lg">
                      {p.weightLbs > 0 ? `${p.weightLbs} lb × ${p.reps}` : `${p.reps} reps`}
                    </p>
                  </div>
                )
              })}
          </div>
        )}
      </Card>
    </div>
  )
}

/* ── Calendar heatmap: trained / partial / missed / rest · tap a day for detail ── */
function CalendarHeatmap() {
  const [monthOffset, setMonthOffset] = useState(0)
  const [detailDay, setDetailDay] = useState<string | null>(null)
  const { data: workouts = [] } = useWorkouts()
  const { data: rotation } = useRotation()
  const today = todayKey()

  const month = addMonths(new Date(), monthOffset)
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
  const lead = (getDay(startOfMonth(month)) + 6) % 7 // Monday first

  const byDate = new Map(workouts.map((w) => [w.date, w]))
  // Never mark days before the first-ever workout as missed
  const firstDate = workouts.length ? workouts.reduce((a, b) => (a.date < b.date ? a : b)).date : today

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="eyebrow">Calendar</p>
        <div className="flex items-center gap-1">
          <button aria-label="previous month" onClick={() => setMonthOffset((m) => m - 1)} className="p-2 text-ink-dim cursor-pointer hover:text-ink">
            <IconChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium w-28 text-center">{format(month, 'MMMM yyyy')}</span>
          <button
            aria-label="next month"
            onClick={() => setMonthOffset((m) => Math.min(0, m + 1))}
            disabled={monthOffset === 0}
            className="p-2 text-ink-dim cursor-pointer hover:text-ink disabled:opacity-25 disabled:cursor-default"
          >
            <IconChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i} className="text-[0.6rem] text-ink-faint font-semibold">
            {d}
          </span>
        ))}
        {Array.from({ length: lead }).map((_, i) => (
          <span key={`x${i}`} />
        ))}
        {days.map((d) => {
          const key = format(d, 'yyyy-MM-dd')
          const w = byDate.get(key)
          const sched = rotation ? scheduleFor(rotation, key) : null
          const isPast = key < today
          const isToday = key === today
          let cls = 'bg-glass text-ink-faint' // default: nothing
          if (w?.status === 'completed') cls = 'bg-lime text-bg0 font-semibold shadow-glow'
          else if (w?.status === 'partial') cls = 'bg-lime-dim text-lime border border-edge-hi'
          else if (isPast && key >= firstDate && sched && sched.dayType !== 'rest') cls = 'bg-glass text-ember/70 border border-ember/25'
          else if (sched && sched.dayType === 'rest') cls = 'bg-transparent text-ink-faint'
          return (
            <button
              key={key}
              onClick={() => setDetailDay(key)}
              title={`${key}${w ? ` · ${w.status}` : sched?.dayType === 'rest' ? ' · rest' : ''}`}
              className={`aspect-square rounded-lg flex items-center justify-center text-[0.7rem] cursor-pointer ${cls} ${isToday ? 'ring-1 ring-lime' : ''}`}
            >
              {format(d, 'd')}
            </button>
          )
        })}
      </div>
      <div className="flex gap-4 mt-3 text-[0.65rem] text-ink-dim flex-wrap">
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-lime inline-block" /> Trained</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-lime-dim border border-edge-hi inline-block" /> Partial</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded border border-ember/40 inline-block" /> Missed</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-glass inline-block" /> Rest</span>
      </div>
      {detailDay && <DayDetailSheet date={detailDay} onClose={() => setDetailDay(null)} />}
    </Card>
  )
}

/* ── Day detail: what happened on a date; adjust it if raw sets still exist ── */
function DayDetailSheet({ date, onClose }: { date: string; onClose: () => void }) {
  const nav = useNavigate()
  const { data: workouts = [] } = useWorkouts()
  const { data: routines = [] } = useRoutines()
  const { data: rotation } = useRotation()
  const { data: stats = [] } = useStats()
  const { data: exercises = [] } = useExercises()
  const saveWorkout = useSaveWorkout()
  const today = todayKey()

  const dayWorkouts = workouts.filter((w) => w.date === date && w.status !== 'in-progress')
  const sched = rotation ? scheduleFor(rotation, date) : null
  const byId = new Map(exercises.map((e) => [e.id, e]))
  const title = format(parseISO(date), 'EEEE, MMM d')

  return (
    <Sheet open onClose={onClose} title={title}>
      {dayWorkouts.length === 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-dim">
            {sched?.dayType === 'rest'
              ? 'Scheduled rest day — nothing logged, nothing owed.'
              : date > today
                ? `Scheduled: ${dayName(routines, sched?.dayType ?? '')}. Change it in the Plan tab.`
                : date < today
                  ? `No workout logged. The plan called for ${dayName(routines, sched?.dayType ?? '')}.`
                  : 'Nothing logged yet today. The Train tab is waiting.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {dayWorkouts.map((w) => (
            <DayWorkoutDetail key={w.id} workout={w} routines={routines} stats={stats} byId={byId} onAdjust={async () => {
              await saveWorkout.mutateAsync({ ...w, status: 'in-progress' })
              onClose()
              nav('/train')
            }} />
          ))}
        </div>
      )}
    </Sheet>
  )
}

function DayWorkoutDetail({
  workout,
  routines,
  stats,
  byId,
  onAdjust,
}: {
  workout: { id: string; dayType: string; status: string; durationSec?: number; date: string }
  routines: { dayType: string; name: string }[]
  stats: ExerciseStat[]
  byId: Map<string, { name: string; isTimed?: boolean }>
  onAdjust: () => void
}) {
  const { data: sets = [] } = useSets(workout.id)
  const working = sets.filter((s) => !s.isWarmup)
  const wStats = stats.filter((s) => s.workoutId === workout.id)
  const mins = workout.durationSec ? Math.round(workout.durationSec / 60) : null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="display text-xl">
          <span className="text-lime">{dayName(routines, workout.dayType)}</span>
        </p>
        <p className="eyebrow">
          {workout.status}
          {mins ? ` · ${mins} min` : ''}
        </p>
      </div>
      {working.length > 0 ? (
        // Raw sets still in retention: full detail
        <div className="flex flex-col gap-1.5">
          {[...new Set(working.map((s) => s.exerciseId))].map((exId) => {
            const ex = byId.get(exId)
            const exSets = working.filter((s) => s.exerciseId === exId)
            return (
              <div key={exId} className="py-1.5 border-b border-edge last:border-0">
                <p className="text-sm font-medium">{ex?.name ?? exId}</p>
                <p className="text-xs text-ink-dim mt-0.5">
                  {exSets.map((s) => `${s.weightLbs > 0 ? `${s.weightLbs}×` : ''}${s.reps}${ex?.isTimed ? 's' : ''}${s.isPr ? ' 🏆' : ''}`).join('  ·  ')}
                </p>
              </div>
            )
          })}
        </div>
      ) : wStats.length > 0 ? (
        // Older than the 60-day retention: permanent aggregates
        <div className="flex flex-col gap-1.5">
          {wStats.map((s) => {
            const ex = byId.get(s.exerciseId)
            return (
              <div key={s.id} className="flex items-center justify-between py-1 border-b border-edge last:border-0 text-sm">
                <span className="text-ink-dim">{ex?.name ?? s.exerciseId}</span>
                <span className="stat text-base">
                  {s.totalSets}×{s.topWeightLbs > 0 ? ` · top ${s.topWeightLbs} lb` : ` · ${s.topReps}`}
                </span>
              </div>
            )
          })}
          <p className="text-xs text-ink-faint">Set-by-set detail was pruned after 60 days; these totals are permanent.</p>
        </div>
      ) : (
        <p className="text-sm text-ink-faint">No set data recorded.</p>
      )}
      {working.length > 0 && (
        <GlowButton variant="ghost" className="w-full mt-1" onClick={onAdjust}>
          Adjust this workout
        </GlowButton>
      )}
    </div>
  )
}

/* ── Volume trend: single lime series, area, animated draw ── */
function VolumeChart({ stats, range }: { stats: ExerciseStat[]; range: Range }) {
  const data = useMemo(() => bucket(stats, range), [stats, range])
  if (data.length < 2)
    return (
      <Card className="p-4">
        <p className="eyebrow mb-1">Volume</p>
        <EmptyState icon={<IconPulse size={34} />} title="Not enough data" body="Two sessions in the range draws the first trend line." />
      </Card>
    )
  return (
    <Card className="p-4">
      <p className="eyebrow mb-2">Volume · lb lifted</p>
      <div className="h-44 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 6, left: -14, bottom: 0 }}>
            <defs>
              <linearGradient id="limeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#A8E063" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#A8E063" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#566050', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#566050', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <Tooltip content={<ChartTip unit=" lb" />} cursor={{ stroke: 'rgba(168,224,99,0.3)' }} />
            <Area type="monotone" dataKey="value" stroke="#A8E063" strokeWidth={2} fill="url(#limeFill)" animationDuration={900} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

/* ── Strength: est. 1RM line per exercise (single series + picker) ── */
function StrengthChart({ stats, exercises }: { stats: ExerciseStat[]; exercises: { id: string; name: string }[] }) {
  const candidates = useMemo(() => {
    const counts = new Map<string, number>()
    for (const s of stats) if (s.topWeightLbs > 0) counts.set(s.exerciseId, (counts.get(s.exerciseId) ?? 0) + 1)
    return exercises.filter((e) => (counts.get(e.id) ?? 0) >= 2)
  }, [stats, exercises])
  const [picked, setPicked] = useState<string | null>(null)
  const active = picked ?? candidates[0]?.id

  const data = useMemo(
    () =>
      stats
        .filter((s) => s.exerciseId === active)
        .sort((a, b) => a.workoutDate.localeCompare(b.workoutDate))
        .map((s) => ({ label: format(parseISO(s.workoutDate), 'M/d'), value: s.est1Rm })),
    [stats, active],
  )

  return (
    <Card className="p-4">
      <p className="eyebrow mb-2">Strength · est. 1RM</p>
      {candidates.length === 0 ? (
        <EmptyState icon={<IconPulse size={34} />} title="Building baseline" body="Log the same lift twice and the strength curve appears here." />
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-1">
            {candidates.map((e) => (
              <button
                key={e.id}
                onClick={() => setPicked(e.id)}
                className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap cursor-pointer transition-all ${
                  active === e.id ? 'bg-lime-dim text-lime-hi border border-edge-hi' : 'bg-glass border border-edge text-ink-dim'
                }`}
              >
                {e.name}
              </button>
            ))}
          </div>
          <div className="h-40 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 6, right: 6, left: -14, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#566050', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#566050', fontSize: 10 }} axisLine={false} tickLine={false} domain={['dataMin - 10', 'dataMax + 10']} />
                <Tooltip content={<ChartTip unit=" lb" />} cursor={{ stroke: 'rgba(168,224,99,0.3)' }} />
                <Line type="monotone" dataKey="value" stroke="#A8E063" strokeWidth={2} dot={{ r: 4, fill: '#A8E063', strokeWidth: 0 }} animationDuration={900} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Card>
  )
}

/* ── Muscle balance donut: validated categorical palette, direct-labeled ── */
function MuscleDonut({ stats, exercises }: { stats: ExerciseStat[]; exercises: { id: string; muscleGroup?: string }[] }) {
  const groupOf = new Map(exercises.map((e) => [e.id, (e as { muscleGroup: MuscleGroup }).muscleGroup]))
  const totals = MUSCLE_COLORS.map((mc) => ({
    ...mc,
    value: stats
      .filter((s) => mc.groups.includes(groupOf.get(s.exerciseId) as MuscleGroup))
      .reduce((sum, s) => sum + s.totalSets, 0),
  })).filter((t) => t.value > 0)
  const total = totals.reduce((s, t) => s + t.value, 0)

  if (total === 0)
    return (
      <Card className="p-4">
        <p className="eyebrow mb-1">Muscle balance</p>
        <EmptyState icon={<IconPulse size={34} />} title="No sets in range" body="Train and this donut shows where the work went." />
      </Card>
    )

  // Build arcs with 2px gaps (as angle padding)
  const R = 54
  const C = 2 * Math.PI * R
  const gap = 3 // px along circumference
  let acc = 0
  const arcs = totals.map((t) => {
    const frac = t.value / total
    const len = Math.max(0, frac * C - gap)
    const arc = { ...t, frac, dash: `${len} ${C - len}`, offset: -acc * C - (gap / 2) }
    acc += frac
    return arc
  })

  return (
    <Card className="p-4">
      <p className="eyebrow mb-3">Muscle balance · last 7 days</p>
      <div className="flex items-center gap-5">
        <svg width="132" height="132" viewBox="0 0 132 132" className="-rotate-90 shrink-0" role="img" aria-label="Muscle group distribution">
          {arcs.map((a, i) => (
            <motion.circle
              key={a.key}
              cx="66"
              cy="66"
              r={R}
              fill="none"
              stroke={a.color}
              strokeWidth={14}
              strokeDasharray={a.dash}
              strokeDashoffset={a.offset}
              initial={{ opacity: 0, strokeDasharray: `0 ${C}` }}
              animate={{ opacity: 1, strokeDasharray: a.dash }}
              transition={{ duration: 0.9, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}
        </svg>
        <div className="flex flex-col gap-1.5 flex-1" role="list">
          {arcs.map((a) => (
            <div key={a.key} role="listitem" className="flex items-center gap-2 text-sm">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: a.color }} />
              <span className="flex-1 text-ink-dim">{a.label}</span>
              <span className="stat text-base">{Math.round(a.frac * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

/* Shared tooltip: text tokens only, mark color carried by the dot */
function ChartTip({ active, payload, label, unit = '' }: { active?: boolean; payload?: { value: number }[]; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs bg-bg1!">
      <p className="text-ink-faint">{label}</p>
      <p className="stat text-base text-ink">
        {payload[0].value.toLocaleString()}
        {unit}
      </p>
    </div>
  )
}

function bucket(stats: ExerciseStat[], range: Range): { label: string; value: number }[] {
  const map = new Map<string, number>()
  for (const s of stats) {
    let key: string
    if (range === '1W') key = s.workoutDate
    else if (range === '1M' || range === '6M') key = format(startOfWeekOf(s.workoutDate), 'yyyy-MM-dd')
    else key = s.workoutDate.slice(0, 7)
    map.set(key, (map.get(key) ?? 0) + s.totalVolumeLbs)
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => ({
      label: range === '1Y' ? format(parseISO(`${k}-01`), 'MMM') : format(parseISO(k), 'M/d'),
      value: v,
    }))
}

function startOfWeekOf(date: string) {
  const d = parseISO(date)
  const day = (getDay(d) + 6) % 7
  return subDays(d, day)
}
