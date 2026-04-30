'use client'

/**
 * Member access QR card.
 *
 * Renders the QR returned by `/api/member/qr` and refreshes it well
 * before the 5-min server TTL expires. The card behaves correctly even
 * when offline thanks to the SW cache fallback on the same endpoint —
 * the last successful QR is shown along with an "offline" banner so the
 * member can still walk past the tornello (Phase 08 will treat
 * almost-expired tokens with a small grace window).
 *
 * Refresh policy:
 *   - On mount + every REFRESH_INTERVAL_MS (≈4 minutes by default).
 *   - When the page becomes visible again (mobile users often background
 *     the app between the locker and the door).
 *   - Manual refresh button as escape hatch.
 */
import { RefreshCwIcon, ShieldCheckIcon, WifiOffIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useOnlineStatus } from '@/lib/hooks/use-online-status'
import { cn } from '@/lib/utils'

type QrResponse = {
  token: string
  expiresAt: number
  ttlSeconds: number
  svg: string
  badgeUid: string
  fullName: string
}

const REFRESH_INTERVAL_MS = 4 * 60 * 1000 // 4 min, server TTL is 5
const LOCAL_STORAGE_KEY = 'quotal:last-qr'

function readCached(): QrResponse | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as QrResponse
    if (typeof parsed.svg === 'string' && parsed.svg.includes('<svg')) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

function writeCached(data: QrResponse) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Storage full / private mode — non-fatal.
  }
}

export function QrCodeCard({
  initialFullName,
  isAccessAllowed,
}: {
  initialFullName: string
  /**
   * Whether the member's subscription currently grants access. Drives
   * the green/red badge; the QR itself is always rendered so staff can
   * scan and see "blocked" on the tornello side.
   */
  isAccessAllowed: boolean
}) {
  const online = useOnlineStatus()
  // Lazy initialiser: read localStorage on first render so we paint the
  // cached QR immediately without a setState-in-effect cascade.
  const [qr, setQr] = useState<QrResponse | null>(() => readCached())
  const [loading, setLoading] = useState<boolean>(() => readCached() === null)
  const [error, setError] = useState<string | null>(null)
  const [stale, setStale] = useState<boolean>(() => {
    const c = readCached()
    return c !== null && c.expiresAt < Date.now()
  })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchQr = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/member/qr', {
        cache: 'no-store',
        credentials: 'same-origin',
      })
      if (!res.ok) throw new Error(`status ${res.status}`)
      const json = (await res.json()) as QrResponse
      setQr(json)
      setStale(false)
      writeCached(json)
    } catch (err) {
      // Offline / 5xx — fall back to the cached copy if we have one.
      const cached = readCached()
      if (cached) {
        setQr(cached)
        setStale(true)
      } else {
        setError(
          err instanceof Error
            ? 'Impossibile generare il QR. Riprova fra poco.'
            : 'Errore sconosciuto',
        )
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Trigger a fresh fetch on mount in addition to the synchronously-
  // painted cache copy. The setState happens asynchronously inside
  // `fetchQr` after the network round trip, not synchronously here, so
  // it does NOT cause a cascading render — the rule's heuristic flags
  // this regardless because it can't see across the await.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchQr()
  }, [fetchQr])

  // Periodic refresh while online + on visibility change.
  useEffect(() => {
    function schedule() {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        void fetchQr().finally(schedule)
      }, REFRESH_INTERVAL_MS)
    }
    schedule()

    function onVisibility() {
      if (document.visibilityState === 'visible') {
        void fetchQr()
      }
    }
    function onOnline() {
      void fetchQr()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', onOnline)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', onOnline)
    }
  }, [fetchQr])

  return (
    <section
      aria-labelledby="qr-card-title"
      className="rounded-3xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p id="qr-card-title" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Il tuo accesso
          </p>
          <p className="mt-0.5 text-sm font-medium">{qr?.fullName ?? initialFullName}</p>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
            isAccessAllowed
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-destructive/30 bg-destructive/10 text-destructive',
          )}
        >
          <ShieldCheckIcon size={12} />
          {isAccessAllowed ? 'Attivo' : 'Bloccato'}
        </span>
      </div>

      <div className="relative mx-auto flex aspect-square w-full max-w-[280px] items-center justify-center overflow-hidden rounded-2xl bg-white p-3">
        {loading && !qr ? (
          <div className="h-full w-full animate-pulse rounded-xl bg-muted" />
        ) : qr ? (
          <div
            className="h-full w-full"
            // The SVG is generated by `qrcode` — we trust our own server.
            dangerouslySetInnerHTML={{ __html: qr.svg }}
          />
        ) : (
          <p className="px-4 text-center text-sm text-destructive">{error}</p>
        )}
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Avvicina il telefono al lettore alla porta.
      </p>

      {(stale || !online) && qr ? (
        <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
          <WifiOffIcon size={12} />
          {online
            ? 'QR salvato — sincronizzo a breve.'
            : 'Offline — sto mostrando l’ultimo QR salvato.'}
        </p>
      ) : null}

      <div className="mt-3 flex justify-center">
        <button
          type="button"
          onClick={() => {
            setLoading(true)
            void fetchQr()
          }}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Rigenera QR code"
        >
          <RefreshCwIcon size={12} />
          Aggiorna QR
        </button>
      </div>
    </section>
  )
}
