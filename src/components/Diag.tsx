import { useEffect, useState } from 'react'
import { viewportDiag } from '../lib/viewport'

/** On-device layout diagnostic — open `<url>/?diag=1` and screenshot it.
 *
 *  Exists because iOS viewport bugs cannot be reproduced on a desktop
 *  browser: this prints what the phone actually reports (and which build is
 *  running, which is how a stale service worker gets caught). It renders
 *  NOTHING unless explicitly asked for, and mounts outside AuthGate so it
 *  works from the login screen too.
 *
 *  The lime hairline marks where the app thinks the bottom of the screen is:
 *  if there is black BELOW that line, the web view is bigger than the app;
 *  if the line is off-screen, the app is bigger than the web view. */
export function Diag() {
  const on =
    typeof window !== 'undefined' &&
    (new URLSearchParams(window.location.search).get('diag') === '1' ||
      window.location.hash === '#diag')
  const [info, setInfo] = useState(() => (on ? viewportDiag() : null))
  const [nav, setNav] = useState<{ bottom: number; gap: number } | null>(null)

  useEffect(() => {
    if (!on) return
    const read = () => {
      setInfo(viewportDiag())
      const el = document.querySelector('nav[aria-label="Main"]')
      if (el) {
        const b = el.getBoundingClientRect().bottom
        setNav({ bottom: Math.round(b), gap: Math.round(window.innerHeight - b) })
      }
    }
    read()
    const t = setInterval(read, 500)
    window.addEventListener('resize', read)
    return () => {
      clearInterval(t)
      window.removeEventListener('resize', read)
    }
  }, [on])

  if (!on || !info) return null

  const rows: [string, string][] = [
    ['build', info.build],
    ['standalone (PWA)', String(info.standalone)],
    ['--app-h', info.appH],
    ['innerHeight', String(info.innerHeight)],
    ['visualViewport.h', String(info.vvHeight)],
    ['screen.height', String(info.screenHeight)],
    ['clientHeight', String(info.clientHeight)],
    ['safe-area top', `${info.safeTop}px`],
    ['safe-area bottom', `${info.safeBottom}px`],
    ['vv scale / offsetTop', `${info.vvScale} / ${info.vvOffsetTop}`],
    ['nav bottom', nav ? String(nav.bottom) : '—'],
    ['GAP under nav', nav ? `${nav.gap}px` : '—'],
  ]

  return (
    <>
      {/* Where the app believes the bottom edge is */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: 2,
          background: '#a8e063',
          zIndex: 2147483647,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: 'env(safe-area-inset-top)',
          left: 8,
          right: 8,
          zIndex: 2147483646,
          background: 'rgba(5,7,5,0.94)',
          border: '1px solid #a8e063',
          borderRadius: 12,
          padding: '10px 12px',
          font: '12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace',
          color: '#e8f0e0',
        }}
      >
        <div style={{ color: '#a8e063', marginBottom: 6, letterSpacing: '0.08em' }}>
          FORGE VIEWPORT DIAG
        </div>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ opacity: 0.7 }}>{k}</span>
            <span style={{ fontWeight: 600 }}>{v}</span>
          </div>
        ))}
        <div style={{ opacity: 0.6, marginTop: 6 }}>
          Screenshot this. Green line = app's bottom edge.
        </div>
      </div>
    </>
  )
}
