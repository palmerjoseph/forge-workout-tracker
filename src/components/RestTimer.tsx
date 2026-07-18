import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

/* THE RED ZONE — full-screen rest countdown.
   Circular ring drains second by second; pulse escalates as time runs
   out (calm > 30s · warning 10–30s · critical < 10s). Tap anywhere or
   ✕ to skip, +30s to extend. Uses the reserved alarm-red role — the
   only red takeover in the app. */

const RING_SIZE = 260
const STROKE = 10

export function RestTimer({
  seconds,
  onDone,
}: {
  seconds: number
  onDone: () => void
}) {
  const reduce = useReducedMotion()
  const [total, setTotal] = useState(seconds)
  const [left, setLeft] = useState(seconds)
  const endAt = useRef(Date.now() + seconds * 1000)

  useEffect(() => {
    const t = setInterval(() => {
      const remaining = Math.max(0, Math.round((endAt.current - Date.now()) / 1000))
      setLeft(remaining)
      if (remaining <= 0) {
        clearInterval(t)
        setTimeout(onDone, 450) // brief zero-flash before dismissing
      }
    }, 250)
    return () => clearInterval(t)
  }, [onDone])

  const addThirty = (e: React.MouseEvent) => {
    e.stopPropagation()
    endAt.current += 30_000
    setTotal((v) => v + 30)
    setLeft((v) => v + 30)
  }

  const phase = left <= 10 ? 'critical' : left <= 30 ? 'warn' : 'calm'
  const pulseClass = reduce ? '' : phase === 'critical' ? 'pulse-critical' : phase === 'warn' ? 'pulse-warn' : 'pulse-calm'
  const alarm = phase === 'critical' ? 'var(--color-alarm-hi)' : 'var(--color-alarm)'

  const r = (RING_SIZE - STROKE) / 2
  const c = 2 * Math.PI * r
  const frac = total > 0 ? left / total : 0

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Rest timer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onDone}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center cursor-pointer"
      style={{ background: 'radial-gradient(circle at 50% 42%, #1c0906 0%, #0a0505 55%, #050303 100%)' }}
    >
      <p className="eyebrow" style={{ color: 'rgba(255,122,107,0.75)' }}>
        Rest · tap to skip
      </p>

      <div className="relative my-6" style={{ width: RING_SIZE, height: RING_SIZE }}>
        {/* pulsing glow bloom behind the ring */}
        <div
          className={`absolute inset-[-15%] rounded-full ${pulseClass}`}
          style={{ background: `radial-gradient(circle, rgba(255,80,64,${phase === 'critical' ? 0.34 : 0.22}) 0%, transparent 65%)` }}
        />
        {/* blurred glow arc (same iOS-safe technique as StatRing) */}
        <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90 absolute inset-0" style={{ overflow: 'visible', filter: 'blur(8px)' }} aria-hidden="true">
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={r}
            fill="none"
            stroke={alarm}
            strokeWidth={STROKE + 3}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - frac)}
            className={pulseClass}
            style={{ transition: 'stroke-dashoffset 0.9s linear' }}
          />
        </svg>
        {/* the draining ring */}
        <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90" style={{ overflow: 'visible' }}>
          <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={STROKE} />
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={r}
            fill="none"
            stroke={alarm}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - frac)}
            style={{ transition: 'stroke-dashoffset 0.9s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={phase === 'critical' && !reduce ? left : 'stable'}
              className={`stat text-white ${phase === 'critical' && !reduce ? 'thump' : ''}`}
              style={{
                fontSize: '5.5rem',
                textShadow: `0 0 ${phase === 'critical' ? 40 : 24}px rgba(255,80,64,0.8)`,
              }}
            >
              {left}
            </motion.span>
          </AnimatePresence>
          <span className="eyebrow" style={{ color: 'rgba(255,122,107,0.6)' }}>
            seconds
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={addThirty}
          className="min-h-11 px-6 rounded-2xl border text-[0.95rem] font-medium cursor-pointer active:scale-95 transition-transform"
          style={{ borderColor: 'rgba(255,80,64,0.4)', color: 'var(--color-alarm-hi)', background: 'rgba(255,80,64,0.08)' }}
        >
          +30s
        </button>
        <button
          onClick={onDone}
          className="min-h-11 px-6 rounded-2xl border border-edge text-ink-dim text-[0.95rem] cursor-pointer active:scale-95 transition-transform bg-glass"
        >
          Skip
        </button>
      </div>
    </motion.div>,
    document.body,
  )
}
