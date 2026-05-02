'use client'

/**
 * Sticky offline banner shown above the app shell.
 *
 * Reads `useOnlineStatus()` and is hidden entirely when online so the
 * layout doesn't shift on transitions. Friendly copy reassures the
 * member that the QR still works locally.
 */
import { WifiOffIcon } from 'lucide-react'

import { useOnlineStatus } from '@/lib/hooks/use-online-status'

export function OnlineBanner() {
  const online = useOnlineStatus()
  if (online) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-warning-soft text-warning fixed inset-x-0 top-0 z-40 border-b border-warning/30 backdrop-blur-xl"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex max-w-md items-center justify-center gap-2 px-4 py-2 text-xs font-medium">
        <WifiOffIcon size={14} />
        Sei offline — il QR funziona comunque.
      </div>
    </div>
  )
}
