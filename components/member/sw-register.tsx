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
    // Only register on secure contexts. localhost is treated as secure
    // by browsers, so this still works in dev.
    if (!window.isSecureContext) return

    const controller = new AbortController()
    void (async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      } catch (err) {
        // Non-fatal — log but never throw to the user.
        console.warn('[sw] registration failed:', err)
      }
    })()

    return () => controller.abort()
  }, [])

  return null
}
