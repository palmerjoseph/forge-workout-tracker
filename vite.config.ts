import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Stamped into the bundle so the on-device diagnostic (?diag=1) can prove
  // which build a phone is actually running — see src/lib/sw.ts.
  define: { __BUILD_ID__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // We register the worker ourselves (src/lib/sw.ts) so a new build can
      // take over an installed PWA instead of it serving cached code forever.
      injectRegister: false,
      workbox: { cleanupOutdatedCaches: true, clientsClaim: true, skipWaiting: true },
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'FORGE — Workout Tracker',
        short_name: 'FORGE',
        description: "Palmer's personal workout tracker",
        theme_color: '#050705',
        background_color: '#050705',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
