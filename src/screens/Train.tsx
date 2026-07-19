import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Card, GlowButton, Sheet, Stepper } from '../components/ui'
import { ExerciseIcon, IconCheck, IconEdit, IconMoon, IconPlus, IconTimer, IconTrophy, IconX } from '../components/icons'
import { RestTimer } from '../components/RestTimer'
import { scheduleFor } from '../lib/rotation'
import { aggregateSets } from '../lib/stats'
import {
  detectPr,
  qk,
  todayKey,
  useExercises,
  useFinishWorkout,
  useInvalidate,
  useLastSets,
  usePrs,
  useRotation,
  useRoutines,
  useSaveSet,
  useSaveWorkout,
  useSets,
  useSettings,
  useStats,
  useWorkouts,
} from '../lib/hooks'
import { repo, uid } from '../lib/repo'
import { dayName, type DayType, type Exercise, type RoutineExercise, type SetLog, type Workout } from '../lib/types'

export function Train() {
  const today = todayKey()
  const location = useLocation()
  const { data: rotation } = useRotation()
  const { data: routines } = useRoutines()
  const { data: workouts = [] } = useWorkouts()
  const saveWorkout = useSaveWorkout()
  const [overrideDay, setOverrideDay] = useState<DayType | null>(null)

  // Re-tapping the Train tab resets this screen to its start
  const resetSignal = (location.state as { reset?: number } | null)?.reset
  useEffect(() => {
    if (resetSignal) setOverrideDay(null)
  }, [resetSignal])

  if (!rotation || !routines) return null

  // Any in-progress workout (today's session OR a past day reopened for editing)
  const active = [...workouts].sort((a, b) => b.date.localeCompare(a.date)).find((w) => w.status === 'in-progress')
  const doneToday = workouts.find((w) => w.date === today && (w.status === 'completed' || w.status === 'partial'))
  const sched = scheduleFor(rotation, today)
  const dayType: DayType | 'rest' = overrideDay ?? sched.dayType

  if (active) return <ActiveWorkout workout={active} resetSignal={resetSignal} />

  // Finished today, no extra session chosen yet → summary + actions.
  // Keyed by resetSignal so a nav re-tap collapses any open pickers.
  if (doneToday && !overrideDay) {
    return <DoneToday key={resetSignal ?? 0} workout={doneToday} onExtra={(d) => setOverrideDay(d)} onEdit={() => saveWorkout.mutate({ ...doneToday, status: 'in-progress' })} />
  }

  if (dayType === 'rest') {
    return (
      <div className="pt-6 flex flex-col gap-4">
        <CenterCard
          icon={<IconMoon size={30} />}
          title="Rest day"
          body="Scheduled recovery. If life demands you train today anyway, pick a day below — the rotation will adapt."
        />
        <DayPicker routines={routines} onPick={setOverrideDay} />
      </div>
    )
  }

  const routine = routines.find((r) => r.dayType === dayType)
  if (!routine) return null
  const visible = routine.exercises
    .filter((e) => !e.challengeOnly || (routine.challengeUnlocked && routine.challengeEnabled))
    .sort((a, b) => a.order - b.order)

  const start = async () => {
    const w: Workout = {
      id: uid(),
      date: today,
      dayType,
      status: 'in-progress',
      startedAt: new Date().toISOString(),
    }
    await saveWorkout.mutateAsync(w)
  }

  return (
    <div className="pt-6 flex flex-col gap-4">
      <header>
        <p className="eyebrow">Up next</p>
        <h1 className="display text-4xl mt-1">
          <span className="text-lime">{routine.name}</span>
        </h1>
        <p className="text-sm text-ink-dim mt-2 inline-flex items-center gap-1.5">
          <IconTimer size={16} /> ~{routine.estMinutes} min · {visible.length} exercises
        </p>
      </header>
      <PreviewList visible={visible} />
      <GlowButton className="w-full" onClick={start} disabled={saveWorkout.isPending}>
        Start workout
      </GlowButton>
      {overrideDay && (
        <GlowButton variant="ghost" className="w-full" onClick={() => setOverrideDay(null)}>
          Back
        </GlowButton>
      )}
    </div>
  )
}

function DayPicker({ routines, onPick }: { routines: { dayType: string; name: string }[]; onPick: (d: DayType) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {routines.map((r) => (
        <GlowButton key={r.dayType} variant="ghost" onClick={() => onPick(r.dayType)}>
          {r.dayType} · {r.name}
        </GlowButton>
      ))}
    </div>
  )
}

/* Today's session is logged: summary + edit + extra session. Never a dead end. */
function DoneToday({ workout, onExtra, onEdit }: { workout: Workout; onExtra: (d: DayType) => void; onEdit: () => void }) {
  const { data: routines = [] } = useRoutines()
  const { data: sets = [] } = useSets(workout.id)
  const { data: exercises = [] } = useExercises()
  const [pickExtra, setPickExtra] = useState(false)
  const byId = new Map(exercises.map((e) => [e.id, e]))
  const working = sets.filter((s) => !s.isWarmup)
  const volume = working.reduce((sum, s) => sum + s.weightLbs * s.reps, 0)
  const prCount = new Set(sets.filter((s) => s.isPr).map((s) => s.exerciseId)).size
  const byExercise = new Map<string, SetLog[]>()
  for (const s of working) byExercise.set(s.exerciseId, [...(byExercise.get(s.exerciseId) ?? []), s])

  return (
    <div className="pt-6 flex flex-col gap-4">
      <header>
        <p className="eyebrow">Today · {workout.status === 'completed' ? 'Full session' : 'Partial session'}</p>
        <h1 className="display text-4xl mt-1">
          <span className="text-lime">{dayName(routines, workout.dayType)}</span> logged
        </h1>
      </header>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Card className="p-3">
          <p className="stat text-2xl">{working.length}</p>
          <p className="eyebrow mt-1">Sets</p>
        </Card>
        <Card className="p-3">
          <p className="stat text-2xl">
            {volume >= 1000 ? `${Math.round(volume / 100) / 10}k` : volume}
          </p>
          <p className="eyebrow mt-1">Volume lb</p>
        </Card>
        <Card className="p-3">
          <p className="stat text-2xl text-gold">{prCount}</p>
          <p className="eyebrow mt-1">PRs</p>
        </Card>
      </div>

      <Card className="p-4">
        <p className="eyebrow mb-2">What you did</p>
        <div className="flex flex-col gap-1.5">
          {[...byExercise.entries()].map(([exId, exSets]) => {
            const ex = byId.get(exId)
            const top = exSets.reduce((a, b) => (b.weightLbs > a.weightLbs ? b : a))
            return (
              <div key={exId} className="flex items-center justify-between py-1 border-b border-edge last:border-0 text-sm">
                <span className="text-ink-dim">{ex?.name ?? exId}</span>
                <span className="stat text-base">
                  {exSets.length}×{top.weightLbs > 0 ? ` · top ${top.weightLbs} lb` : ` · ${top.reps}${ex?.isTimed ? 's' : ' reps'}`}
                </span>
              </div>
            )
          })}
        </div>
      </Card>

      <GlowButton variant="ghost" className="w-full inline-flex items-center justify-center gap-2" onClick={onEdit}>
        <IconEdit size={18} /> Edit today's log
      </GlowButton>
      {pickExtra ? (
        <DayPicker routines={routines} onPick={onExtra} />
      ) : (
        <GlowButton variant="ghost" className="w-full inline-flex items-center justify-center gap-2" onClick={() => setPickExtra(true)}>
          <IconPlus size={18} /> Extra session
        </GlowButton>
      )}
    </div>
  )
}

function CenterCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <Card className="p-6 mt-6 flex flex-col items-center text-center gap-3">
      <span className="w-14 h-14 rounded-full bg-glass-hi text-lime flex items-center justify-center">{icon}</span>
      <p className="display text-2xl">{title}</p>
      <p className="text-sm text-ink-dim max-w-70">{body}</p>
    </Card>
  )
}

function PreviewList({ visible }: { visible: RoutineExercise[] }) {
  const { data: exercises = [] } = useExercises()
  const byId = new Map(exercises.map((e) => [e.id, e]))
  return (
    <div className="flex flex-col gap-2">
      {visible.map((re, i) => {
        const ex = byId.get(re.exerciseId)
        if (!ex) return null
        return (
          <motion.div
            key={re.exerciseId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
          >
            <Card className="p-3.5 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-glass-hi text-lime flex items-center justify-center shrink-0">
                <ExerciseIcon icon={ex.icon} size={20} />
              </span>
              <div className="flex-1">
                <p className="font-medium text-[0.95rem]">{ex.name}</p>
                <p className="text-xs text-ink-dim mt-0.5">
                  {re.warmupSets > 0 && `${re.warmupSets} warm-up · `}
                  {re.targetSets} × {re.targetReps}
                  {ex.isTimed ? 's' : ''}
                </p>
              </div>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

/* ───────────────────── Active workout (also serves as the edit flow) ───────────────────── */

function ActiveWorkout({ workout, resetSignal }: { workout: Workout; resetSignal?: number }) {
  const { data: routines } = useRoutines()
  const { data: exercises = [] } = useExercises()
  const { data: sets = [] } = useSets(workout.id)
  const { data: settings } = useSettings()
  const finish = useFinishWorkout()
  const [showFinish, setShowFinish] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [extraIds, setExtraIds] = useState<string[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [resting, setResting] = useState(false)

  const isEdit = !!workout.finishedAt
  const inv = useInvalidate()

  useEffect(() => {
    if (isEdit) return
    const t = setInterval(() => setElapsed(Math.round((Date.now() - new Date(workout.startedAt).getTime()) / 1000)), 1000)
    return () => clearInterval(t)
  }, [workout.startedAt, isEdit])

  // The routine can be absent (deleted while its workout is open, or the
  // routines query still resolving). Derive everything defensively so ALL
  // hooks below run unconditionally, then bail out just before render —
  // hooks after an early return are a rules-of-hooks crash waiting to happen.
  const routine = routines?.find((r) => r.dayType === workout.dayType)
  const planned = routine
    ? routine.exercises
        .filter((e) => !e.challengeOnly || (routine.challengeUnlocked && routine.challengeEnabled))
        .sort((a, b) => a.order - b.order)
    : []

  const byId = new Map(exercises.map((e) => [e.id, e]))
  const loggedByExercise = new Map<string, SetLog[]>()
  for (const s of [...sets].sort((a, b) => a.setNumber - b.setNumber)) {
    loggedByExercise.set(s.exerciseId, [...(loggedByExercise.get(s.exerciseId) ?? []), s])
  }

  const plannedIds = new Set(planned.map((p) => p.exerciseId))
  const extras = [...new Set([...extraIds, ...[...loggedByExercise.keys()].filter((id) => !plannedIds.has(id))])]

  const workingLogged = sets.filter((s) => !s.isWarmup)
  const targetWorking = planned.reduce((sum, p) => sum + p.targetSets, 0)
  const coveredExercises = planned.filter((p) => (loggedByExercise.get(p.exerciseId) ?? []).some((s) => !s.isWarmup)).length
  const isComplete = !!routine && coveredExercises === planned.length && workingLogged.length >= Math.ceil(targetWorking * 0.8)

  const volume = workingLogged.reduce((sum, s) => sum + s.weightLbs * s.reps, 0)
  // One PR per exercise: a session can flag several sets, but the recorded PR
  // (and this celebration count) is per-exercise — matching useFinishWorkout.
  const prCount = new Set(sets.filter((s) => s.isPr).map((s) => s.exerciseId)).size
  const mins = Math.floor(elapsed / 60)
  const restSec = settings?.restTimerSec ?? 90
  const warmupOnly = sets.length > 0 && workingLogged.length === 0

  /** Save-or-discard: with sets, finish/recompute; with ZERO sets the
   *  workout is empty, so "saving" means deleting it — there is nothing
   *  to keep, and leaving it in-progress is the stuck-state bug. */
  const saveNow = async () => {
    if (finish.isPending) return
    if (sets.length === 0) {
      await repo.deleteWorkout(workout.id)
      await repo.deletePrsOnDate(workout.date)
      inv(qk.workouts, qk.stats, qk.prs)
      return
    }
    await finish.mutateAsync({ workout, status: isComplete ? 'completed' : 'partial' })
    setShowFinish(false)
  }

  // Re-tapping the Train tab always exits the session cleanly (save or
  // discard). The signal lives in history state and survives navigation,
  // so only react to a CHANGE after mount — never the mount-time value.
  const seenSignal = useRef(resetSignal)
  useEffect(() => {
    if (resetSignal !== seenSignal.current) {
      seenSignal.current = resetSignal
      // Edits: save (or discard when empty). Live sessions: only an empty
      // one resets — never end a real in-progress workout from a nav tap.
      if (isEdit || sets.length === 0) saveNow()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal])

  // Rest timer fires after a working set unless the session is essentially done
  const onWorkingSetLogged = () => {
    if (isEdit || restSec <= 0) return
    if (workingLogged.length + 1 >= targetWorking) return
    setResting(true)
  }

  if (!routine) return null

  return (
    <div className="pt-6 flex flex-col gap-4">
      <header className="flex items-end justify-between">
        <div>
          <p className="eyebrow">{isEdit ? 'Editing log' : 'In session'}</p>
          <h1 className="display text-3xl mt-1 text-lime">{routine.name}</h1>
          {isEdit && (
            <button onClick={saveNow} className="text-xs text-lime cursor-pointer hover:text-lime-hi mt-1">
              {sets.length === 0 ? '← Done (removes empty workout)' : '← Done editing (saves)'}
            </button>
          )}
        </div>
        <div className="text-right">
          {!isEdit && (
            <p className="stat text-2xl tabular-nums">
              {String(mins).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
            </p>
          )}
          <p className="eyebrow">{workingLogged.length} sets · {Math.round(volume / 100) / 10}k lb</p>
        </div>
      </header>

      <div className="flex flex-col gap-3">
        {planned.map((re) => {
          const ex = byId.get(re.exerciseId)
          if (!ex) return null
          return (
            <ExerciseLogger
              key={re.exerciseId}
              workout={workout}
              exercise={ex}
              plan={re}
              logged={loggedByExercise.get(re.exerciseId) ?? []}
              onWorkingSetLogged={onWorkingSetLogged}
              editable={isEdit}
            />
          )
        })}
        {extras.map((id) => {
          const ex = byId.get(id)
          if (!ex) return null
          return (
            <ExerciseLogger
              key={id}
              workout={workout}
              exercise={ex}
              plan={{ exerciseId: id, order: 99, targetSets: 3, targetReps: 10, warmupSets: 0 }}
              logged={loggedByExercise.get(id) ?? []}
              onWorkingSetLogged={onWorkingSetLogged}
              editable={isEdit}
            />
          )
        })}
      </div>

      <GlowButton variant="ghost" className="w-full inline-flex items-center justify-center gap-2" onClick={() => setShowAdd(true)}>
        <IconPlus size={18} /> Add exercise
      </GlowButton>
      <GlowButton className="w-full" onClick={() => setShowFinish(true)} disabled={sets.length === 0}>
        {isEdit ? 'Save changes' : 'Finish workout'}
      </GlowButton>
      {sets.length === 0 && (
        <DiscardWorkout workout={workout} label={isEdit ? 'Nothing logged anymore — discard this workout entirely' : 'Changed your mind? Discard this session'} />
      )}

      <AddExerciseSheet
        open={showAdd}
        onClose={() => setShowAdd(false)}
        exclude={new Set([...plannedIds, ...extras])}
        onPick={(id) => {
          setExtraIds((x) => [...x, id])
          setShowAdd(false)
        }}
      />

      <Sheet open={showFinish} onClose={() => setShowFinish(false)} title={isEdit ? 'Save changes' : 'Wrap it up'}>
        <div className="grid grid-cols-3 gap-3 mb-4 text-center">
          <Card className="p-3">
            <p className="stat text-2xl">{workingLogged.length}</p>
            <p className="eyebrow mt-1">Sets</p>
          </Card>
          <Card className="p-3">
            <p className="stat text-2xl">{Math.round(volume / 1000)}<span className="text-sm text-ink-dim">k</span></p>
            <p className="eyebrow mt-1">Volume lb</p>
          </Card>
          <Card className="p-3">
            <p className="stat text-2xl text-gold">{prCount}</p>
            <p className="eyebrow mt-1">PRs</p>
          </Card>
        </div>
        <p className="text-sm text-ink-dim mb-4">
          {isEdit
            ? 'Your stats and PRs will be recalculated from the corrected sets.'
            : warmupOnly
              ? 'Warm-up only — life happens. Logged as a partial so the day still counts.'
              : isComplete
                ? 'Full session — every planned exercise hit. Logging as completed.'
                : `You covered ${coveredExercises} of ${planned.length} planned exercises. Logged honestly as a partial — partial beats nothing.`}
        </p>
        <GlowButton className="w-full" onClick={saveNow} disabled={finish.isPending}>
          {isEdit ? 'Save corrected log' : isComplete ? 'Save — full session' : 'Save as partial'}
        </GlowButton>
      </Sheet>

      <AnimatePresence>{resting && <RestTimer seconds={restSec} onDone={() => setResting(false)} />}</AnimatePresence>
    </div>
  )
}

/* Escape hatch: a session/edit with zero sets can always be discarded.
   Deletes the workout row + aggregates + that date's PRs, then Train
   falls back to the normal schedule (rest-day picker included). */
function DiscardWorkout({ workout, label }: { workout: Workout; label: string }) {
  const inv = useInvalidate()
  const [confirming, setConfirming] = useState(false)
  const discard = async () => {
    await repo.deleteWorkout(workout.id)
    await repo.deletePrsOnDate(workout.date)
    inv(qk.workouts, qk.stats, qk.prs)
  }
  return confirming ? (
    <div className="p-3 rounded-xl border border-ember/40 bg-ember/10 flex items-center gap-3">
      <p className="flex-1 text-sm text-ink">Erase this workout as if it never happened?</p>
      <GlowButton variant="danger" className="min-h-9! px-3!" onClick={discard}>
        Discard
      </GlowButton>
      <GlowButton variant="ghost" className="min-h-9! px-3!" onClick={() => setConfirming(false)}>
        Keep
      </GlowButton>
    </div>
  ) : (
    <button onClick={() => setConfirming(true)} className="text-sm text-ink-dim hover:text-ember transition-colors cursor-pointer py-1">
      {label}
    </button>
  )
}

/* One exercise's logging card: prefilled from last session, one tap = logged. */
function ExerciseLogger({
  workout,
  exercise,
  plan,
  logged,
  onWorkingSetLogged,
  editable = false,
}: {
  workout: Workout
  exercise: Exercise
  plan: RoutineExercise
  logged: SetLog[]
  onWorkingSetLogged?: () => void
  editable?: boolean
}) {
  const { data: lastSets = [] } = useLastSets(exercise.id, workout.id)
  const { data: stats = [] } = useStats()
  const { data: prs = [] } = usePrs()
  const saveSet = useSaveSet()
  const inv = useInvalidate()
  const [open, setOpen] = useState(false)
  const [prFlash, setPrFlash] = useState(false)

  const defaultWeight =
    exercise.equipment === 'barbell' ? 45 : exercise.equipment === 'dumbbell' ? 25 : 0
  const weightStep = 5
  const repStep = exercise.isTimed ? 15 : 1

  // Planned rows: warmups then working sets, prefilled from last session where available
  const rows = useMemo(() => {
    const out: { isWarmup: boolean; weight: number; reps: number }[] = []
    const lastWorking = lastSets.filter((s) => !s.isWarmup)
    const baseW = lastWorking[0]?.weightLbs ?? defaultWeight
    for (let i = 0; i < plan.warmupSets; i++) {
      out.push({ isWarmup: true, weight: Math.max(0, Math.round((baseW * 0.5) / 5) * 5), reps: exercise.isTimed ? 30 : 8 })
    }
    for (let i = 0; i < plan.targetSets; i++) {
      const prev = lastWorking[i] ?? lastWorking[lastWorking.length - 1]
      out.push({ isWarmup: false, weight: prev?.weightLbs ?? defaultWeight, reps: prev?.reps ?? plan.targetReps })
    }
    return out
  }, [lastSets, plan, defaultWeight, exercise.isTimed])

  const [draft, setDraft] = useState<{ isWarmup: boolean; weight: number; reps: number }[] | null>(null)
  const [confirmWipe, setConfirmWipe] = useState(false)
  const setRows = draft ?? rows
  const doneCount = logged.length
  const allDone = doneCount >= setRows.length
  const hasWorking = logged.some((s) => !s.isWarmup)

  const wipeExercise = async () => {
    for (const s of logged) await repo.deleteSet(s.id)
    inv(qk.sets(workout.id))
    setConfirmWipe(false)
    setDraft(null)
  }

  const logRow = async (idx: number) => {
    const row = setRows[idx]
    let isPr = false
    if (!row.isWarmup) {
      // Fold sets already logged this session into the history so a second
      // working set at the same weight doesn't re-flag as a fresh PR. Only
      // once the exercise has real history, though — a first-ever session
      // stays baseline (never a PR), per detectPr's contract.
      const hasHistory = stats.some((h) => h.exerciseId === exercise.id) || prs.some((p) => p.exerciseId === exercise.id)
      const priorWorking = logged.filter((ls) => !ls.isWarmup)
      const history =
        hasHistory && priorWorking.length
          ? [...stats, { id: 'session', ...aggregateSets(workout.id, workout.date, exercise.id, priorWorking) }]
          : stats
      isPr = detectPr({ weightLbs: row.weight, reps: row.reps }, history, prs, exercise.id) !== null
    }
    const s: SetLog = {
      id: uid(),
      workoutId: workout.id,
      exerciseId: exercise.id,
      setNumber: logged.length + 1,
      weightLbs: row.weight,
      reps: row.reps,
      isWarmup: row.isWarmup,
      isPr,
      loggedAt: new Date().toISOString(),
    }
    await saveSet.mutateAsync(s)
    if (isPr) {
      setPrFlash(true)
      setTimeout(() => setPrFlash(false), 2200)
    }
    if (!row.isWarmup) onWorkingSetLogged?.()
  }

  const removeLogged = async (id: string) => {
    await repo.deleteSet(id)
    inv(qk.sets(workout.id))
  }

  const update = (idx: number, patch: Partial<{ weight: number; reps: number }>) => {
    const next = [...setRows]
    next[idx] = { ...next[idx], ...patch }
    setDraft(next)
  }

  return (
    <Card active={hasWorking} className="overflow-hidden">
      <div className="w-full p-3.5 flex items-center gap-3">
        <button className="flex-1 flex items-center gap-3 cursor-pointer text-left min-w-0" onClick={() => setOpen(!open)}>
          <span
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              hasWorking ? 'bg-lime-dim text-lime' : 'bg-glass-hi text-ink-dim'
            }`}
          >
            {allDone ? <IconCheck size={20} /> : <ExerciseIcon icon={exercise.icon} size={20} />}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[0.95rem] truncate">{exercise.name}</p>
            <p className="text-xs text-ink-dim mt-0.5">
              {doneCount}/{setRows.length} sets
              {lastSets.length > 0 && !open && ` · last: ${lastSets[0].weightLbs > 0 ? `${lastSets[0].weightLbs} lb × ` : ''}${lastSets[0].reps}${exercise.isTimed ? 's' : ''}`}
            </p>
          </div>
        </button>
        <AnimatePresence>
          {prFlash && (
            <motion.span
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              className="text-gold"
              style={{ filter: 'drop-shadow(0 0 10px rgba(255,214,107,0.8))' }}
            >
              <IconTrophy size={24} />
            </motion.span>
          )}
        </AnimatePresence>
        {logged.length > 0 && (
          <button
            aria-label={`delete all logged sets for ${exercise.name}`}
            onClick={() => setConfirmWipe(true)}
            className="p-2 -m-1 text-ink-faint hover:text-ember cursor-pointer shrink-0"
          >
            <IconX size={18} />
          </button>
        )}
      </div>

      {confirmWipe && (
        <div className="mx-3.5 mb-3 p-3 rounded-xl border border-ember/40 bg-ember/10 flex items-center gap-3">
          <p className="flex-1 text-sm text-ink">Delete all {logged.length} logged set{logged.length > 1 ? 's' : ''} for {exercise.name}?</p>
          <GlowButton variant="danger" className="min-h-9! px-3!" onClick={wipeExercise}>
            Delete
          </GlowButton>
          <GlowButton variant="ghost" className="min-h-9! px-3!" onClick={() => setConfirmWipe(false)}>
            Keep
          </GlowButton>
        </div>
      )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="px-3.5 pb-3.5 flex flex-col gap-2">
              {/* Logged rows */}
              {logged.map((loggedSet, i) => (
                <div key={loggedSet.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 bg-lime-dim/50">
                  <span className={`eyebrow w-14 shrink-0 ${loggedSet.isWarmup ? 'text-ink-faint' : ''}`}>
                    {loggedSet.isWarmup ? 'Warm' : `Set ${i + 1 - logged.filter((s) => s.isWarmup).length}`}
                  </span>
                  <div className="flex-1 flex items-center justify-between pr-1">
                    <span className="stat text-lg">
                      {loggedSet.weightLbs > 0 && `${loggedSet.weightLbs} lb × `}
                      {loggedSet.reps}
                      {exercise.isTimed ? 's' : ''}
                      {loggedSet.isPr && <span className="text-gold text-xs ml-2">PR</span>}
                    </span>
                    <span className="flex items-center gap-1">
                      {editable && (
                        <button
                          aria-label="remove this set"
                          onClick={() => removeLogged(loggedSet.id)}
                          className="p-1.5 text-ink-faint hover:text-ember cursor-pointer"
                        >
                          <IconX size={16} />
                        </button>
                      )}
                      <span className="text-lime">
                        <IconCheck size={18} />
                      </span>
                    </span>
                  </div>
                </div>
              ))}
              {/* Remaining planned rows */}
              {setRows.slice(doneCount).map((row, offset) => {
                const i = doneCount + offset
                return (
                  <div key={`p${i}`} className="flex items-center gap-2 rounded-xl px-2 py-1.5 bg-glass">
                    <span className={`eyebrow w-14 shrink-0 ${row.isWarmup ? 'text-ink-faint' : ''}`}>
                      {row.isWarmup ? 'Warm' : `Set ${i + 1 - plan.warmupSets}`}
                    </span>
                    <div className="flex-1 flex items-center justify-between gap-1 flex-wrap">
                      {exercise.equipment !== 'bodyweight' && exercise.equipment !== 'band' ? (
                        <Stepper value={row.weight} onChange={(v) => update(i, { weight: v })} step={weightStep} suffix="lb" />
                      ) : (
                        <span className="text-xs text-ink-faint capitalize px-1">{exercise.equipment}</span>
                      )}
                      <Stepper value={row.reps} onChange={(v) => update(i, { reps: v })} step={repStep} min={1} suffix={exercise.isTimed ? 's' : undefined} />
                      <button
                        aria-label={`log set ${i + 1}`}
                        onClick={() => logRow(i)}
                        disabled={offset !== 0}
                        className="w-11 h-11 rounded-xl bg-lime text-bg0 flex items-center justify-center cursor-pointer disabled:opacity-25 disabled:cursor-default active:scale-95 transition-transform shadow-glow"
                      >
                        <IconCheck size={20} />
                      </button>
                    </div>
                  </div>
                )
              })}
              <button
                className="text-sm text-ink-dim hover:text-lime transition-colors self-start px-2 py-1 cursor-pointer"
                onClick={() => setDraft([...setRows, { isWarmup: false, weight: setRows[setRows.length - 1]?.weight ?? defaultWeight, reps: plan.targetReps }])}
              >
                + Add set
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

const GROUP_ORDER = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'glutes', 'calves', 'abs', 'full-body'] as const

/* Pick from library or create a custom exercise — grouped by muscle */
function AddExerciseSheet({
  open,
  onClose,
  exclude,
  onPick,
}: {
  open: boolean
  onClose: () => void
  exclude: Set<string>
  onPick: (id: string) => void
}) {
  const { data: exercises = [] } = useExercises()
  const inv = useInvalidate()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [group, setGroup] = useState('chest')
  const [equipment, setEquipment] = useState('dumbbell')

  const create = async () => {
    if (!name.trim()) return
    const icon = equipment === 'barbell' ? 'barbell' : equipment === 'band' ? 'band' : equipment === 'bodyweight' ? (group === 'abs' ? 'abs' : 'bodyweight') : 'dumbbell'
    const ex: Exercise = {
      id: uid(),
      name: name.trim(),
      muscleGroup: group as Exercise['muscleGroup'],
      equipment: equipment as Exercise['equipment'],
      icon,
      isCustom: true,
    }
    await repo.addExercise(ex)
    inv(qk.exercises)
    onPick(ex.id)
    setName('')
    setCreating(false)
  }

  return (
    <Sheet open={open} onClose={onClose} title={creating ? 'New exercise' : 'Add exercise'}>
      {creating ? (
        <div className="flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Exercise name"
            aria-label="Exercise name"
            className="w-full bg-glass border border-edge rounded-xl px-4 py-3 text-ink placeholder:text-ink-faint focus:border-edge-hi outline-none"
          />
          <div>
            <p className="eyebrow mb-2">Muscle group</p>
            <div className="flex flex-wrap gap-2">
              {['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'calves', 'abs'].map((g) => (
                <Chip key={g} label={g} selected={group === g} onClick={() => setGroup(g)} />
              ))}
            </div>
          </div>
          <div>
            <p className="eyebrow mb-2">Equipment</p>
            <div className="flex flex-wrap gap-2">
              {['barbell', 'dumbbell', 'band', 'bodyweight'].map((e) => (
                <Chip key={e} label={e} selected={equipment === e} onClick={() => setEquipment(e)} />
              ))}
            </div>
          </div>
          <GlowButton onClick={create} disabled={!name.trim()}>
            Create & add
          </GlowButton>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <GlowButton variant="ghost" onClick={() => setCreating(true)} className="inline-flex items-center justify-center gap-2">
            <IconPlus size={18} /> Create custom exercise
          </GlowButton>
          {GROUP_ORDER.map((group) => {
            const inGroup = exercises
              .filter((e) => e.muscleGroup === group && !exclude.has(e.id))
              .sort((a, b) => a.name.localeCompare(b.name))
            if (inGroup.length === 0) return null
            return (
              <div key={group} className="pt-2 border-t border-edge first-of-type:border-t-0">
                <p className="eyebrow mb-2 capitalize">{group}</p>
                <div className="flex flex-col gap-2">
                  {inGroup.map((e) => (
                    <Card key={e.id} onClick={() => onPick(e.id)} className="p-3 flex items-center gap-3">
                      <span className="w-9 h-9 rounded-lg bg-glass-hi text-lime flex items-center justify-center shrink-0">
                        <ExerciseIcon icon={e.icon} size={18} />
                      </span>
                      <p className="text-sm font-medium">{e.name}</p>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Sheet>
  )
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-2 rounded-xl text-sm capitalize cursor-pointer transition-all ${
        selected ? 'bg-lime-dim text-lime-hi border border-edge-hi' : 'bg-glass border border-edge text-ink-dim'
      }`}
    >
      {label}
    </button>
  )
}
