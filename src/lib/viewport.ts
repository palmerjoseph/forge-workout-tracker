/** Publishes the REAL viewport height as `--app-h` on <html>.
 *
 *  The app is a fixed-height shell (see CLAUDE.md §v3.4), so its height has
 *  to match the screen exactly — too short leaves an unpainted black band
 *  under the bottom nav, too tall pushes the nav off-screen.
 *
 *  `height: 100%` is NOT that number: percentage heights resolve against the
 *  initial containing block, which on iOS excludes the area under a collapsed
 *  toolbar / the safe-area insets. `100dvh` is correct on modern browsers and
 *  is the CSS fallback (index.css); this listener is the authority where it
 *  matters most — it also tracks the on-screen keyboard, so the shell shrinks
 *  above it instead of hiding content underneath.
 *
 *  Pinch-zoom also shrinks visualViewport, so anything zoomed in is ignored
 *  and we fall back to innerHeight. */
export function trackViewportHeight() {
  const vv = window.visualViewport
  const apply = () => {
    const h = vv && vv.scale <= 1.01 ? vv.height : window.innerHeight
    if (h > 0) document.documentElement.style.setProperty('--app-h', `${Math.round(h)}px`)
  }
  apply()
  vv?.addEventListener('resize', apply)
  window.addEventListener('resize', apply)
  window.addEventListener('orientationchange', () => setTimeout(apply, 250))
  // iOS settles the viewport a beat after launch / toolbar transitions
  window.addEventListener('pageshow', apply)
  setTimeout(apply, 300)
}
