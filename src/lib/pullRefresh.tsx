import { useEffect, useRef, useState, type RefObject } from 'react'
import { useQueryClient } from '@tanstack/react-query'

const THRESHOLD = 70

/** Touch-only pull-to-refresh: drag down from the top of any tab to
 *  refetch everything. Renders the glow indicator; mount once in App.
 *  Listens on the app's scroll container (the document never scrolls, so
 *  window.scrollY is permanently 0) — which also keeps gestures inside
 *  portalled Sheets and the RestTimer from ever reaching this handler. */
export function PullToRefresh({ scrollRef }: { scrollRef: RefObject<HTMLElement | null> }) {
  const qc = useQueryClient()
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef<number | null>(null)
  const pullRef = useRef(0)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const setPullBoth = (v: number) => {
      pullRef.current = v
      setPull(v)
    }
    const onStart = (e: TouchEvent) => {
      startY.current = el.scrollTop <= 0 ? e.touches[0].clientY : null
    }
    const onMove = (e: TouchEvent) => {
      if (startY.current === null) return
      const dy = e.touches[0].clientY - startY.current
      setPullBoth(dy > 0 && el.scrollTop <= 0 ? Math.min(dy * 0.45, 110) : 0)
    }
    const onEnd = async () => {
      if (startY.current === null) return
      startY.current = null
      if (pullRef.current >= THRESHOLD) {
        setRefreshing(true)
        setPullBoth(48)
        await qc.invalidateQueries()
        setTimeout(() => {
          setRefreshing(false)
          setPullBoth(0)
        }, 500)
      } else {
        setPullBoth(0)
      }
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: true })
    el.addEventListener('touchend', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
    }
  }, [qc, scrollRef])

  const active = pull > 0 || refreshing
  if (!active) return null
  const ready = pull >= THRESHOLD || refreshing

  return (
    <div
      className="fixed left-0 right-0 z-30 flex justify-center pointer-events-none"
      style={{ top: `calc(env(safe-area-inset-top) + ${Math.min(pull, 90) - 40}px)`, opacity: Math.min(pull / 40, 1) }}
    >
      <div
        className={`w-9 h-9 rounded-full border-2 flex items-center justify-center bg-bg1 ${refreshing ? 'animate-spin' : ''}`}
        style={{
          borderColor: ready ? 'var(--color-lime)' : 'var(--color-edge-hi)',
          borderTopColor: refreshing ? 'transparent' : undefined,
          boxShadow: ready ? 'var(--shadow-glow)' : 'none',
        }}
      >
        {!refreshing && (
          <span className="text-lime text-lg leading-none" style={{ transform: `rotate(${Math.min(pull * 2.2, 180)}deg)` }}>
            ↓
          </span>
        )}
      </div>
    </div>
  )
}
