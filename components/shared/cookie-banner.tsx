'use client'

/**
 * Cookie banner — informational only.
 *
 * Quotal MVP utilizza esclusivamente cookie tecnici essenziali. Le linee
 * guida del Garante (10 giugno 2021, par. 4.1) chiariscono che per cookie
 * tecnici non è necessario il consenso preventivo: è sufficiente
 * un&apos;informativa breve con rimando alla policy estesa. Nessun pulsante
 * &quot;Rifiuta&quot;, nessuna gestione di consensi a finestre, nessun
 * blocco di asset di terze parti — semplicemente: si entra, si è informati.
 *
 * La preferenza è memorizzata in `localStorage` (non in un cookie) per
 * evitare di settare un cookie aggiuntivo solo per ricordare la
 * visualizzazione dell&apos;avviso.
 */
import { motion, AnimatePresence } from 'framer-motion'
import { CookieIcon } from 'lucide-react'
import Link from 'next/link'
import { useSyncExternalStore, useState } from 'react'

import { Button } from '@/components/ui/button'
import { spring } from '@/lib/motion'

const STORAGE_KEY = 'quotal-cookie-notice'
const STORAGE_VALUE = 'acknowledged-v1'

/**
 * Subscribe to the dismissal flag via `useSyncExternalStore`.
 *
 * `useSyncExternalStore` is the React-recommended way to read browser-only
 * state without triggering the lint rule `react-hooks/set-state-in-effect`.
 * `getServerSnapshot` returns "acknowledged-v1" so the banner is never
 * rendered during SSR (no hydration mismatch).
 */
function readBannerStatus(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

function subscribeToBanner(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

export function CookieBanner() {
  const stored = useSyncExternalStore(
    subscribeToBanner,
    readBannerStatus,
    () => STORAGE_VALUE, // Server snapshot: pretend already acknowledged.
  )
  // Local override after the in-page click — the storage event only fires
  // for cross-tab updates, not for the originating tab.
  const [dismissedHere, setDismissedHere] = useState(false)

  const visible = stored !== STORAGE_VALUE && !dismissedHere

  function dismiss() {
    setDismissedHere(true)
    try {
      window.localStorage.setItem(STORAGE_KEY, STORAGE_VALUE)
    } catch {
      // ignore — in-memory dismissal is enough for the session.
    }
  }

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          role="region"
          aria-label="Avviso sui cookie"
          initial={{ y: 32, opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: spring.gentle }}
          exit={{ y: 32, opacity: 0, transition: { duration: 0.18 } }}
          className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl pb-safe sm:inset-x-6 sm:bottom-6"
        >
          <div className="glass-strong flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6">
            <div
              aria-hidden
              className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent sm:flex"
            >
              <CookieIcon className="size-5" />
            </div>

            <div className="flex-1 text-sm">
              <p className="font-semibold text-foreground">
                Cookie tecnici essenziali
              </p>
              <p className="mt-1 text-pretty leading-relaxed text-muted-foreground">
                Quotal utilizza solo cookie tecnici necessari al
                funzionamento del servizio (sessione, sicurezza, pagamenti).
                Non profiliamo gli utenti.{' '}
                <Link
                  href="/cookie-policy"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Maggiori informazioni
                </Link>
                .
              </p>
            </div>

            <div className="flex shrink-0 gap-2">
              <Button
                onClick={dismiss}
                size="sm"
                variant="accent"
                className="w-full sm:w-auto"
              >
                Ho capito
              </Button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
