'use client'

/**
 * Sticky "first run" banner for an empty dashboard.
 *
 * Persists the dismissal in localStorage. We render `null` on the server and
 * only re-evaluate on mount to avoid layout shift / hydration mismatch.
 */
import { SparklesIcon, XIcon } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'quotal:onboarding-coach-dismissed'

function subscribeToStorage(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback()
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}

function readDismissedSnapshot(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function readDismissedServerSnapshot(): boolean {
  // SSR: assume not dismissed so the markup matches first client paint.
  return true
}

export function OnboardingCoach({ className }: { className?: string }) {
  // useSyncExternalStore reads from localStorage without ever calling
  // setState inside an effect body. Hydration-safe because the server
  // snapshot returns `true` (hidden), so the banner appears only after
  // mount when we know whether the user has dismissed it.
  const dismissed = React.useSyncExternalStore(
    subscribeToStorage,
    readDismissedSnapshot,
    readDismissedServerSnapshot,
  )

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1')
      // Fire a synthetic storage event so subscribers in this same tab
      // re-read. Native `storage` events only fire across tabs.
      window.dispatchEvent(
        new StorageEvent('storage', { key: STORAGE_KEY, newValue: '1' }),
      )
    } catch {
      /* ignore quota errors */
    }
  }

  if (dismissed) return null

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-accent/30 bg-accent/5 p-4 sm:flex-row sm:items-center',
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-2 text-accent">
        <SparklesIcon className="size-5" />
        <span className="font-display text-lg">Benvenuto in Quotal!</span>
      </div>
      <p className="flex-1 text-sm text-muted-foreground">
        Per iniziare, aggiungi il tuo primo membro. Hai bisogno di aiuto?
        Guarda il video tutorial (2 min).
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm">
          <Link href="/dashboard/membri/nuovo">+ Aggiungi primo membro</Link>
        </Button>
        <Button size="sm" variant="outline" disabled title="Disponibile prossimamente">
          Guarda tutorial
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={dismiss}
          aria-label="Chiudi banner di benvenuto"
        >
          <XIcon className="size-4" />
        </Button>
      </div>
    </div>
  )
}
