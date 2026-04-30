'use client'

/**
 * Add-to-home-screen prompt.
 *
 * Listens for the `beforeinstallprompt` event (Chrome/Edge/Android). When
 * fired, stashes the deferred event and shows a small banner above the
 * bottom nav. iOS Safari does not fire this event, so we detect Apple
 * mobile UA and render manual instructions instead.
 *
 * Dismissals are remembered for 7 days via localStorage so we don't
 * pester every visit.
 */
import { ShareIcon, XIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const DISMISS_KEY = 'quotal:install-dismissed-at'
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  // iOS Safari uses a non-standard property; everyone else uses the
  // display-mode media query.
  const navStandalone =
    'standalone' in window.navigator && Boolean(window.navigator.standalone)
  const mqStandalone = window.matchMedia('(display-mode: standalone)').matches
  return navStandalone || mqStandalone
}

function isAppleMobile(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function recentlyDismissed(): boolean {
  if (typeof window === 'undefined') return false
  const raw = window.localStorage.getItem(DISMISS_KEY)
  if (!raw) return false
  const ts = Number(raw)
  if (!Number.isFinite(ts)) return false
  return Date.now() - ts < DISMISS_TTL_MS
}

function rememberDismiss() {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  )
  const [showApple, setShowApple] = useState(false)
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setHidden(false)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)

    if (isAppleMobile()) {
      // No event on iOS — fall back to manual instructions. The setState
      // inside an effect is intentional here: this runs once on mount to
      // initialise UI state from a synchronous platform check that is not
      // observable as a prop or render input.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowApple(true)
      setHidden(false)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    }
  }, [])

  if (hidden) return null

  function dismiss() {
    rememberDismiss()
    setHidden(true)
  }

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    setHidden(true)
  }

  return (
    <div
      // Sits above the bottom nav (h-16) + safe-area; calc keeps clear.
      className={cn(
        'fixed inset-x-0 z-30 flex justify-center px-4',
      )}
      style={{
        bottom:
          'calc(4rem + env(safe-area-inset-bottom) + 0.5rem)',
      }}
      role="region"
      aria-label="Installa l'app sulla schermata Home"
    >
      <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <ShareIcon size={16} />
          </div>
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium">Installa Quotal</p>
            {showApple ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Tocca il pulsante &laquo;Condividi&raquo; e poi
                &laquo;Aggiungi a Home&raquo; per accedere all&apos;app dal
                telefono.
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Per un accesso rapido al tuo QR e ai pagamenti.
              </p>
            )}
            {!showApple ? (
              <div className="mt-2 flex gap-2">
                <Button size="sm" type="button" onClick={install}>
                  Installa
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={dismiss}
                >
                  Più tardi
                </Button>
              </div>
            ) : (
              <div className="mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={dismiss}
                >
                  Ho capito
                </Button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Chiudi"
            className="text-muted-foreground hover:text-foreground"
          >
            <XIcon size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
