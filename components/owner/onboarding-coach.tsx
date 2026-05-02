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
  const dismissed = React.useSyncExternalStore(
    subscribeToStorage,
    readDismissedSnapshot,
    readDismissedServerSnapshot,
  )

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1')
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
        'relative overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-accent-soft via-card to-card p-5 shadow-[var(--shadow-1)] sm:p-6',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-accent/10 blur-2xl"
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-[var(--shadow-2)]">
          <SparklesIcon className="size-5" />
        </div>
        <div className="flex-1">
          <p className="eyebrow text-accent">Benvenuto in Quotal</p>
          <h2 className="mt-1 text-pretty text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            Aggiungi il tuo primo membro per iniziare
          </h2>
          <p className="mt-1 max-w-xl text-pretty text-sm text-muted-foreground">
            Crea la prima scheda anagrafica e Quotal si occuperà del resto:
            QR badge, ricevute, promemoria di scadenza.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="accent" size="sm">
            <Link href="/dashboard/membri/nuovo">Aggiungi primo membro</Link>
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={dismiss}
            aria-label="Chiudi banner di benvenuto"
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
