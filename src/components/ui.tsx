import { motion, useReducedMotion } from 'framer-motion'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { createPortal } from 'react-dom'

/* Shared primitives — every screen composes these.
   Change a token or a primitive here and the whole app follows. */

export function Card({
  children,
  className = '',
  active = false,
  onClick,
}: {
  children: ReactNode
  className?: string
  active?: boolean
  onClick?: () => void
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={`card ${active ? 'card-active' : ''} ${onClick ? 'text-left w-full cursor-pointer transition-colors duration-200 hover:bg-glass-hi' : ''} ${className}`}
    >
      {children}
    </Tag>
  )
}

export function GlowButton({
  children,
  variant = 'primary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const styles = {
    primary:
      'bg-lime text-bg0 font-semibold shadow-glow hover:bg-lime-hi active:scale-[0.98]',
    ghost:
      'bg-glass border border-edge text-ink hover:border-edge-hi active:scale-[0.98]',
    danger: 'bg-glass border border-ember/40 text-ember active:scale-[0.98]',
  }[variant]
  return (
    <button
      className={`min-h-11 px-5 rounded-2xl text-[0.95rem] transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-default ${styles} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

/** The signature glow ring — animated conic progress with bloom. */
export function StatRing({
  progress,
  size = 120,
  stroke = 9,
  children,
  color = 'var(--color-lime)',
}: {
  progress: number // 0..1
  size?: number
  stroke?: number
  children?: ReactNode
  color?: string
}) {
  const reduce = useReducedMotion()
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, progress))
  const dashAnim = {
    initial: { strokeDashoffset: c },
    animate: { strokeDashoffset: c * (1 - clamped) },
    transition: reduce ? { duration: 0 } : { duration: 1.1, ease: [0.22, 1, 0.36, 1] as const },
  }
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size, overflow: 'visible' }}>
      {/* Glow = blurred duplicate of the progress arc. CSS blur renders on
          iOS Safari where SVG drop-shadow filters silently fail, and it
          isn't clipped by card bounds. Slow pulse via animate opacity. */}
      <svg width={size} height={size} className="-rotate-90 absolute inset-0" style={{ overflow: 'visible', filter: 'blur(7px)' }} aria-hidden="true">
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke + 2}
          strokeLinecap="round"
          strokeDasharray={c}
          {...dashAnim}
          animate={{
            strokeDashoffset: c * (1 - clamped),
            opacity: reduce || clamped === 0 ? 0.55 : [0.45, 0.9, 0.45],
          }}
          transition={{
            strokeDashoffset: reduce ? { duration: 0 } : { duration: 1.1, ease: [0.22, 1, 0.36, 1] },
            opacity: reduce ? { duration: 0 } : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
          }}
        />
      </svg>
      <svg width={size} height={size} className="-rotate-90" style={{ overflow: 'visible' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          {...dashAnim}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

export function Stepper({
  value,
  onChange,
  step = 5,
  min = 0,
  suffix,
  big = false,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  suffix?: string
  big?: boolean
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        aria-label="decrease"
        onClick={() => onChange(Math.max(min, value - step))}
        className="w-11 h-11 rounded-xl bg-glass border border-edge text-ink-dim text-xl leading-none cursor-pointer active:scale-95 transition-transform"
      >
        −
      </button>
      <div className={`stat text-center min-w-14 ${big ? 'text-3xl' : 'text-2xl'}`}>
        {value}
        {suffix && <span className="text-ink-dim text-sm font-body ml-0.5">{suffix}</span>}
      </div>
      <button
        aria-label="increase"
        onClick={() => onChange(value + step)}
        className="w-11 h-11 rounded-xl bg-glass border border-edge text-ink-dim text-xl leading-none cursor-pointer active:scale-95 transition-transform"
      >
        +
      </button>
    </div>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; disabled?: boolean }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex bg-glass border border-edge rounded-2xl p-1 gap-1" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={`flex-1 min-h-9 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-default ${
            value === o.value ? 'bg-lime-dim text-lime-hi shadow-glow-soft' : 'text-ink-dim hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  if (!open) return null
  // Portal: escape main's stacking context so the sheet always covers the nav
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="close" className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full max-w-107 bg-bg1 border-t border-x border-edge rounded-t-3xl p-5 pb-safe max-h-[88dvh] overflow-y-auto"
      >
        <div className="w-10 h-1 rounded-full bg-ink-faint mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="display text-2xl">{title}</h2>
          <button onClick={onClose} aria-label="close sheet" className="text-ink-dim p-2 -m-2 cursor-pointer">
            ✕
          </button>
        </div>
        <div className="pb-6">{children}</div>
      </motion.div>
    </div>,
    document.body,
  )
}

export function EmptyState({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-6 gap-3">
      <div className="text-ink-faint">{icon}</div>
      <p className="display text-xl text-ink-dim">{title}</p>
      <p className="text-sm text-ink-faint max-w-60">{body}</p>
    </div>
  )
}
