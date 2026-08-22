/** Service-worker registration with an update path.
 *
 *  The build precaches everything (vite-plugin-pwa, generateSW). The default
 *  injected registration only ever registers on `load`, so an installed iOS
 *  PWA that is resumed rather than cold-started can serve a cached build
 *  indefinitely — v3.5 shipped and the phone kept rendering the old bundle.
 *
 *  So: register ourselves, re-check for a new worker whenever the app comes
 *  back to the foreground, and reload once the new worker takes control
 *  (the SW is built with skipWaiting + clientsClaim, so control changes as
 *  soon as a new build is fetched). `updateViaCache: 'none'` keeps the
 *  browser's own HTTP cache from serving a stale sw.js. */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  window.addEventListener('load', async () => {
    // No controller yet = first ever visit; clientsClaim will fire
    // controllerchange for that install and a reload there is pointless.
    const hadController = !!navigator.serviceWorker.controller
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      })

      // A new worker taking over means new assets — reload once to run them.
      let reloading = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloading || !hadController) return
        reloading = true
        window.location.reload()
      })

      const check = () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {})
      }
      document.addEventListener('visibilitychange', check)
      window.addEventListener('focus', check)
      setInterval(check, 60 * 60 * 1000)
    } catch {
      /* offline or unsupported — the app still works from cache */
    }
  })
}
