'use client'

/**
 * Service-worker registration shim.
 *
 * Mounted exactly once at the root of the (member)/app layout. Skipped
 * automatically in non-secure contexts (e.g. some local dev IPs) and on
 * browsers without SW support — both cases degrade gracefully to a
 * normal SSR'd app.
 *
 * We intentionally do NOT register the SW outside /app, because the
 * cached offline shell is member-specific (it points to /app routes).
 */
import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    if (!window.isSecureContext) return

    const isDev =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.endsWith('.local')

    const controller = new AbortController()
    void (async () => {
      try {
        if (isDev) {
          const regs = await navigator.serviceWorker.getRegistrations()
          await Promise.all(regs.map((r) => r.unregister()))
          if ('caches' in window) {
            const keys = await caches.keys()
            await Promise.all(keys.map((k) => caches.delete(k)))
          }
          return
        }
        await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      } catch (err) {
        console.warn('[sw] registration failed:', err)
      }
    })()

    return () => controller.abort()
  }, [])

  return null
}
