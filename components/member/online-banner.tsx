'use client'

/**
 * Sticky offline banner shown above the bottom nav.
 *
 * Reads `useOnlineStatus()` and reserves vertical space only when the
 * user is offline so the layout doesn't shift on transition. Friendly
 * copy reassures the member that the QR still works locally.
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
      className="fixed inset-x-0 top-0 z-40 border-b border-warning/30 bg-warning/10 text-warning"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex max-w-md items-center justify-center gap-2 px-4 py-2 text-xs font-medium">
        <WifiOffIcon size={14} />
        Sei offline — il QR funziona comunque.
      </div>
    </div>
  )
}
