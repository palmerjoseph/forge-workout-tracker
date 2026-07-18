import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Card, GlowButton, Segmented, Sheet, Stepper, EmptyState } from '../components/ui'
import { ExerciseIcon, IconChevronRight, IconMoon, IconReport, IconSliders, IconX } from '../components/icons'
import { clearOverride, pushToTomorrow, setOverride, upcomingSchedule } from '../lib/rotation'
import { qk, todayKey, useExercises, useInvalidate, useReports, useRotation, useRoutines, useSettings, useWorkouts } from '../lib/hooks'
import { repo } from '../lib/repo'
import { dayName, type DayType, type Report, type Routine } from '../lib/types'

const SEED_DAY_TYPES = new Set(['A', 'B', 'C'])

export function Plan() {
  const { data: rotation } = useRotation()
  const { data: routines = [] } = useRoutines()
  const { data: reports = [] } = useReports()
  const { data: workouts = [] } = useWorkouts()
  const { data: settings } = useSettings()
  const inv = useInvalidate()
  const today = todayKey()
  const [editDay, setEditDay] = useState<string | null>(null)
  const [editRoutine, setEditRoutine] = useState<DayType | null>(null)
  const [viewReport, setViewReport] = useState<Report | null>(null)

  if (!rotation || !settings) return null
  const days = upcomingSchedule(rotation, today, 14)

  const saveRotation = async (next: typeof rotation) => {
    await repo.saveRotation(next)
    inv(qk.rotation)
  }

  return (
    <div className="pt-6 flex flex-col gap-4">
      <header>
        <p className="eyebrow">The program</p>
        <h1 className="display text-4xl mt-1">Plan</h1>
      </header>

      {/* Upcoming schedule strip */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="eyebrow">Next 14 days · tap to change</p>
          <button
            className="text-xs text-lime cursor-pointer hover:text-lime-hi"
            onClick={() => saveRotation(pushToTomorrow(rotation, today))}
          >
            Push today → tomorrow
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {days.map((d) => {
            const isToday = d.date === today
            // Reality wins over the plan: show what was actually logged
            const done = workouts.filter((w) => w.date === d.date && (w.status === 'completed' || w.status === 'partial'))
            const doneTypes = [...new Set(done.map((w) => w.dayType))]
            const isMix = doneTypes.length > 1
            const isDone = done.length > 0
            return (
              <button
                key={d.date}
                onClick={() => setEditDay(d.date)}
                className={`flex flex-col items-center gap-1 min-w-13 py-2.5 px-1 rounded-xl cursor-pointer border transition-all ${
                  isDone
                    ? 'border-edge-hi bg-lime text-bg0 shadow-glow'
                    : isToday
                      ? 'border-edge-hi bg-lime-dim'
                      : 'border-edge bg-glass'
                } ${d.isOverride && !isDone ? 'border-dashed' : ''}`}
              >
                <span className={`text-[0.6rem] uppercase ${isDone ? 'text-bg0/70' : 'text-ink-faint'}`}>
                  {format(parseISO(d.date), 'EEE')}
                </span>
                <span className="stat text-lg">{format(parseISO(d.date), 'd')}</span>
                {isDone ? (
                  <span className="text-[0.65rem] font-bold">{isMix ? 'MIX' : doneTypes[0]} ✓</span>
                ) : d.dayType === 'rest' ? (
                  <span className="text-rest"><IconMoon size={14} /></span>
                ) : (
                  <span className={`text-[0.65rem] font-bold ${isToday ? 'text-lime-hi' : 'text-lime'}`}>{d.dayType}</span>
                )}
              </button>
            )
          })}
        </div>
        <div className="flex gap-3 mt-2 text-[0.65rem] text-ink-dim flex-wrap">
          {routines.map((r) => (
            <span key={r.dayType}>
              <b className="text-lime">{r.dayType}</b> {r.name}
            </span>
          ))}
        </div>
      </Card>

      {/* Rotation pattern */}
      <Card className="p-4">
        <p className="eyebrow mb-3 inline-flex items-center gap-2"><IconSliders size={14} /> Rotation rhythm</p>
        <Segmented
          value={JSON.stringify(rotation.pattern)}
          onChange={(v) => saveRotation({ ...rotation, pattern: JSON.parse(v) })}
          options={[
            { value: '[1,1,0]', label: '2 on · 1 off' },
            { value: '[1,0]', label: '1 on · 1 off' },
            { value: '[1,1,1,0]', label: '3 on · 1 off' },
          ]}
        />
        {/* Day cycle: which routines rotate, in what order */}
        <p className="eyebrow mt-4 mb-2">Day cycle · order of rotation</p>
        <div className="flex flex-wrap gap-2">
          {(rotation.cycle ?? ['A', 'B', 'C']).map((d, i, arr) => (
            <span key={`${d}${i}`} className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1.5 rounded-xl bg-lime-dim border border-edge-hi text-sm">
              <b className="text-lime-hi">{d}</b>
              <span className="text-ink-dim text-xs">{dayName(routines, d)}</span>
              <button
                aria-label={`move ${d} later in cycle`}
                disabled={i === arr.length - 1}
                onClick={() => {
                  const next = [...arr]
                  ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
                  saveRotation({ ...rotation, cycle: next })
                }}
                className="p-1 text-ink-faint hover:text-ink cursor-pointer disabled:opacity-25"
              >
                →
              </button>
              <button
                aria-label={`remove ${d} from cycle`}
                disabled={arr.length <= 1}
                onClick={() => saveRotation({ ...rotation, cycle: arr.filter((_, j) => j !== i) })}
                className="p-1 text-ink-faint hover:text-ember cursor-pointer disabled:opacity-25"
              >
                ✕
              </button>
            </span>
          ))}
          {routines
            .filter((r) => !(rotation.cycle ?? ['A', 'B', 'C']).includes(r.dayType))
            .map((r) => (
              <button
                key={r.dayType}
                onClick={() => saveRotation({ ...rotation, cycle: [...(rotation.cycle ?? ['A', 'B', 'C']), r.dayType] })}
                className="px-3 py-1.5 rounded-xl bg-glass border border-edge text-sm text-ink-dim cursor-pointer hover:border-edge-hi"
              >
                + {r.dayType} {r.name}
              </button>
            ))}
        </div>
      </Card>

      {/* Routines */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="eyebrow">Day routines</p>
          <button
            className="text-xs text-lime cursor-pointer hover:text-lime-hi"
            onClick={async () => {
              const used = new Set(routines.map((r) => r.dayType))
              let letter = 'D'
              while (used.has(letter)) letter = String.fromCharCode(letter.charCodeAt(0) + 1)
              await repo.addRoutine({
                dayType: letter,
                name: `My Routine ${letter}`,
                estMinutes: 35,
                challengeUnlocked: false,
                challengeEnabled: false,
                exercises: [],
              })
              inv(qk.routines)
              setEditRoutine(letter)
            }}
          >
            + New routine
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {routines.map((r) => (
            <button
              key={r.dayType}
              onClick={() => setEditRoutine(r.dayType)}
              className="flex items-center gap-3 p-3 rounded-xl bg-glass border border-edge cursor-pointer hover:border-edge-hi transition-colors text-left"
            >
              <span className="stat text-xl text-lime w-6">{r.dayType}</span>
              <div className="flex-1">
                <p className="text-sm font-medium">{r.name}</p>
                <p className="text-xs text-ink-dim">
                  {r.exercises.filter((e) => !e.challengeOnly || (r.challengeUnlocked && r.challengeEnabled)).length} exercises · ~{r.estMinutes} min
                  {r.challengeUnlocked && r.challengeEnabled && <span className="text-lime"> · challenge on</span>}
                </p>
              </div>
              <span className="text-ink-faint"><IconChevronRight size={18} /></span>
            </button>
          ))}
        </div>
      </Card>

      {/* Reports archive */}
      <Card className="p-4">
        <p className="eyebrow mb-3 inline-flex items-center gap-2"><IconReport size={14} /> Reports</p>
        {reports.length === 0 ? (
          <EmptyState
            icon={<IconReport size={34} />}
            title="No reports yet"
            body="Weekly reports land Sunday 9 AM. Every one is archived here."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {reports.map((r) => (
              <button key={r.id} onClick={() => setViewReport(r)} className="p-3 rounded-xl bg-glass border border-edge cursor-pointer text-left hover:border-edge-hi transition-colors">
                <p className="text-sm font-medium">{r.title}</p>
                <p className="text-xs text-ink-dim mt-0.5">{r.headline}</p>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Day override sheet */}
      <Sheet open={!!editDay} onClose={() => setEditDay(null)} title={editDay ? format(parseISO(editDay), 'EEEE, MMM d') : ''}>
        <div className="grid grid-cols-2 gap-3">
          {routines.map((r) => (
            <GlowButton
              key={r.dayType}
              variant="ghost"
              onClick={async () => {
                await saveRotation(setOverride(rotation, editDay!, r.dayType))
                setEditDay(null)
              }}
            >
              {r.dayType} · {r.name}
            </GlowButton>
          ))}
          <GlowButton
            variant="ghost"
            onClick={async () => {
              await saveRotation(setOverride(rotation, editDay!, 'rest'))
              setEditDay(null)
            }}
          >
            Rest day
          </GlowButton>
          <GlowButton
            variant="ghost"
            onClick={async () => {
              await saveRotation(clearOverride(rotation, editDay!))
              setEditDay(null)
            }}
          >
            Back to rotation
          </GlowButton>
        </div>
      </Sheet>

      {/* Routine editor sheet */}
      {editRoutine && (
        <RoutineEditor dayType={editRoutine} onClose={() => setEditRoutine(null)} />
      )}

      {/* Report viewer */}
      <Sheet open={!!viewReport} onClose={() => setViewReport(null)} title={viewReport?.title ?? ''}>
        {viewReport && (
          <div className="prose-report text-sm text-ink leading-relaxed" dangerouslySetInnerHTML={{ __html: viewReport.html }} />
        )}
      </Sheet>
    </div>
  )
}

function RoutineEditor({ dayType, onClose }: { dayType: DayType; onClose: () => void }) {
  const { data: routines = [] } = useRoutines()
  const { data: exercises = [] } = useExercises()
  const { data: rotation } = useRotation()
  const inv = useInvalidate()
  const routine = routines.find((r) => r.dayType === dayType)
  const [adding, setAdding] = useState(false)
  if (!routine) return null
  const byId = new Map(exercises.map((e) => [e.id, e]))
  const isCustom = !SEED_DAY_TYPES.has(dayType)

  const save = async (next: Routine) => {
    await repo.saveRoutine(next)
    inv(qk.routines)
  }

  const remove = async () => {
    await repo.deleteRoutine(dayType)
    // Also drop it from the rotation cycle so the schedule stays valid
    if (rotation?.cycle?.includes(dayType)) {
      await repo.saveRotation({ ...rotation, cycle: rotation.cycle.filter((d) => d !== dayType) })
      inv(qk.rotation)
    }
    inv(qk.routines)
    onClose()
  }

  const rows = [...routine.exercises].sort((a, b) => a.order - b.order)

  return (
    <Sheet open onClose={onClose} title={`Day ${dayType} · ${routine.name}`}>
      <input
        value={routine.name}
        onChange={(e) => save({ ...routine, name: e.target.value })}
        aria-label="Routine name"
        className="w-full bg-glass border border-edge rounded-xl px-4 py-3 mb-3 text-ink focus:border-edge-hi outline-none"
      />
      <div className="flex flex-col gap-2 mb-4">
        {rows.map((re, idx) => {
          const ex = byId.get(re.exerciseId)
          if (!ex) return null
          return (
            <div key={re.exerciseId} className={`p-3 rounded-xl bg-glass border border-edge ${re.challengeOnly ? 'border-dashed' : ''}`}>
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-glass-hi text-lime flex items-center justify-center shrink-0">
                  <ExerciseIcon icon={ex.icon} size={16} />
                </span>
                <p className="flex-1 text-sm font-medium">
                  {ex.name}
                  {re.challengeOnly && <span className="text-lime text-[0.65rem] uppercase tracking-wider ml-2">challenge</span>}
                </p>
                <button
                  aria-label={`move ${ex.name} up`}
                  disabled={idx === 0}
                  onClick={() => {
                    const next = rows.map((r) => ({ ...r }))
                    ;[next[idx - 1].order, next[idx].order] = [next[idx].order, next[idx - 1].order]
                    save({ ...routine, exercises: next })
                  }}
                  className="p-1.5 text-ink-faint cursor-pointer disabled:opacity-20 hover:text-ink"
                >
                  ↑
                </button>
                <button
                  aria-label={`remove ${ex.name}`}
                  onClick={() => save({ ...routine, exercises: routine.exercises.filter((r) => r.exerciseId !== re.exerciseId) })}
                  className="p-1.5 text-ink-faint cursor-pointer hover:text-ember"
                >
                  <IconX size={16} />
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 mt-2">
                <div>
                  <p className="eyebrow mb-1">Sets</p>
                  <Stepper
                    value={re.targetSets}
                    min={1}
                    step={1}
                    onChange={(v) =>
                      save({ ...routine, exercises: routine.exercises.map((r) => (r.exerciseId === re.exerciseId ? { ...r, targetSets: v } : r)) })
                    }
                  />
                </div>
                <div>
                  <p className="eyebrow mb-1">{ex.isTimed ? 'Seconds' : 'Reps'}</p>
                  <Stepper
                    value={re.targetReps}
                    min={1}
                    step={ex.isTimed ? 15 : 1}
                    onChange={(v) =>
                      save({ ...routine, exercises: routine.exercises.map((r) => (r.exerciseId === re.exerciseId ? { ...r, targetReps: v } : r)) })
                    }
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {adding ? (
        <div className="flex flex-col gap-2 mb-4 max-h-60 overflow-y-auto">
          {exercises
            .filter((e) => !routine.exercises.some((r) => r.exerciseId === e.id))
            .map((e) => (
              <button
                key={e.id}
                onClick={() => {
                  save({
                    ...routine,
                    exercises: [
                      ...routine.exercises,
                      { exerciseId: e.id, order: Math.max(0, ...routine.exercises.map((r) => r.order)) + 1, targetSets: 3, targetReps: e.isTimed ? 30 : 10, warmupSets: 0 },
                    ],
                  })
                  setAdding(false)
                }}
                className="p-3 rounded-xl bg-glass border border-edge cursor-pointer text-left text-sm flex items-center gap-2.5 hover:border-edge-hi"
              >
                <span className="w-8 h-8 rounded-lg bg-glass-hi text-lime flex items-center justify-center shrink-0">
                  <ExerciseIcon icon={e.icon} size={16} />
                </span>
                {e.name}
              </button>
            ))}
        </div>
      ) : (
        <GlowButton variant="ghost" className="w-full mb-3" onClick={() => setAdding(true)}>
          + Add exercise to this day
        </GlowButton>
      )}

      {/* Challenge mode */}
      <div className="p-3.5 rounded-xl bg-glass border border-edge flex items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium">Challenge mode</p>
          <p className="text-xs text-ink-dim mt-0.5">
            {routine.challengeUnlocked
              ? 'Adds the dashed exercises and extra intensity. Your call — it never auto-escalates.'
              : 'Unlocks after 6 fully completed sessions of this day. Earn it.'}
          </p>
        </div>
        <button
          role="switch"
          aria-checked={routine.challengeEnabled}
          disabled={!routine.challengeUnlocked}
          onClick={() => save({ ...routine, challengeEnabled: !routine.challengeEnabled })}
          className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default ${
            routine.challengeEnabled ? 'bg-lime' : 'bg-glass-hi border border-edge'
          }`}
        >
          <span
            className={`block w-5 h-5 rounded-full bg-ink transition-transform ${routine.challengeEnabled ? 'translate-x-5 bg-bg0' : ''}`}
          />
        </button>
      </div>

      {isCustom && (
        <GlowButton variant="danger" className="w-full mt-3" onClick={remove}>
          Delete this routine
        </GlowButton>
      )}
    </Sheet>
  )
}
