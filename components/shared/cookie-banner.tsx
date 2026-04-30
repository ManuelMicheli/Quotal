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
import Link from 'next/link'
import { useSyncExternalStore, useState } from 'react'

import { Button } from '@/components/ui/button'

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
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-xl border border-border bg-card/95 p-4 text-sm shadow-lg backdrop-blur-sm sm:p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <p className="font-medium text-foreground">
                Cookie tecnici essenziali
              </p>
              <p className="mt-1 text-muted-foreground">
                Quotal utilizza solo cookie tecnici necessari al
                funzionamento del servizio (sessione di accesso, sicurezza,
                pagamenti). Non profiliamo gli utenti né condividiamo dati a
                fini di marketing.{' '}
                <Link
                  href="/cookie-policy"
                  className="underline-offset-4 hover:underline"
                >
                  Maggiori informazioni
                </Link>
                .
              </p>
            </div>
            <Button onClick={dismiss} size="sm" className="shrink-0">
              Ho capito
            </Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
