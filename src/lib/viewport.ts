/** Publishes the REAL viewport height as `--app-h` on <html>, and exposes the
 *  raw measurements for the on-device diagnostic (`?diag=1`).
 *
 *  The app is a fixed-height shell (CLAUDE.md §v3.4), so its height must match
 *  what the user can actually see — too short leaves an unpainted black band
 *  under the bottom nav, too tall pushes the nav off-screen.
 *
 *  `height: 100%` is NOT that number: percentage heights resolve against the
 *  initial containing block, which on iOS excludes the strip under a collapsed
 *  toolbar / the safe-area insets. `visualViewport.height` is, by definition,
 *  the region the user can see — that is the primary source.
 *
 *  The one exception is an installed iOS PWA: there is no browser chrome, so
 *  the web view owns the whole screen. When the safe-area insets are non-zero
 *  (proof `viewport-fit=cover` is in effect, i.e. the web view really does
 *  reach the screen edges) any shortfall against `screen.height` is iOS
 *  under-reporting, and the screen height is the honest answer. Without that
 *  proof we never overshoot — painting past a genuinely inset web view would
 *  hide the nav, which is worse than a gap. */

export function isStandalone(): boolean {
  return (
    (navigator as { standalone?: boolean }).standalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches === true
  )
}

/** Reads an `env(safe-area-inset-*)` value in px (0 when cover isn't active). */
export function safeAreaInset(side: 'top' | 'bottom'): number {
  if (!document.body) return 0
  const probe = document.createElement('div')
  probe.style.cssText = `position:absolute;visibility:hidden;padding-${side}:env(safe-area-inset-${side})`
  document.body.appendChild(probe)
  const v = parseFloat(getComputedStyle(probe).getPropertyValue(`padding-${side}`)) || 0
  probe.remove()
  return v
}

function measure(): number {
  const vv = window.visualViewport
  const zoomed = vv ? vv.scale > 1.01 : false
  let h = vv && !zoomed ? vv.height : window.innerHeight
  const keyboardOpen = vv ? window.innerHeight - vv.height > 120 : false
  const portrait = window.innerWidth <= window.innerHeight
  if (isStandalone() && portrait && !zoomed && !keyboardOpen && safeAreaInset('bottom') > 0) {
    const screenH = window.screen?.height ?? 0
    if (screenH > h && screenH - h < 200) h = screenH
  }
  return h
}

export function viewportDiag() {
  const vv = window.visualViewport
  const root = document.documentElement
  return {
    build: __BUILD_ID__,
    appH: getComputedStyle(root).getPropertyValue('--app-h').trim(),
    innerHeight: window.innerHeight,
    innerWidth: window.innerWidth,
    vvHeight: vv ? Math.round(vv.height) : null,
    vvScale: vv ? vv.scale : null,
    vvOffsetTop: vv ? Math.round(vv.offsetTop) : null,
    screenHeight: window.screen?.height ?? null,
    clientHeight: root.clientHeight,
    safeTop: safeAreaInset('top'),
    safeBottom: safeAreaInset('bottom'),
    standalone: isStandalone(),
    dpr: window.devicePixelRatio,
  }
}

export function trackViewportHeight() {
  const apply = () => {
    const h = measure()
    if (h > 0) document.documentElement.style.setProperty('--app-h', `${Math.round(h)}px`)
  }
  apply()
  const vv = window.visualViewport
  vv?.addEventListener('resize', apply)
  window.addEventListener('resize', apply)
  window.addEventListener('pageshow', apply)
  // iOS settles the viewport a beat after launch / rotation
  window.addEventListener('orientationchange', () => setTimeout(apply, 250))
  setTimeout(apply, 300)
  setTimeout(apply, 1000)
}
