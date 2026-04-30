'use client'

/**
 * `useOnlineStatus` — boolean reflecting `navigator.onLine`, kept in sync
 * with the `online` / `offline` window events.
 *
 * Implemented with `useSyncExternalStore` so the React 19 compiler is
 * happy (no setState-in-effect warning) and SSR returns a stable `true`
 * — the post-hydration value flips correctly without a cascade.
 */
import { useSyncExternalStore } from 'react'

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function getSnapshot(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

function getServerSnapshot(): boolean {
  // Optimistic on the server: assume online so the SSR'd UI doesn't
  // flash an offline banner.
  return true
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
