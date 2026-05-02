'use client'

/**
 * Member access QR card.
 *
 * Premium minimalist treatment: white inset QR panel framed by hairline
 * corner crosshairs, status pill, soft scan-line animation, ghost
 * refresh affordance. Refresh policy and offline cache behaviour are
 * unchanged from the prior implementation.
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

const REFRESH_INTERVAL_MS = 4 * 60 * 1000
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
  isAccessAllowed: boolean
}) {
  const online = useOnlineStatus()
  // State must match SSR output (no localStorage on server). The cached
  // QR is hydrated in a post-mount effect to avoid hydration mismatch.
  const [qr, setQr] = useState<QrResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [stale, setStale] = useState<boolean>(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const cached = readCached()
    if (!cached) return
    // Hydrating from localStorage on mount — runs once, not a cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQr(cached)
    setLoading(false)
    setStale(cached.expiresAt < Date.now())
  }, [])

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchQr()
  }, [fetchQr])

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

  const cornerClass =
    'absolute h-4 w-4 border-foreground/80'

  return (
    <section
      aria-labelledby="qr-card-title"
      className="ring-elevated relative h-full overflow-hidden rounded-[28px] bg-card p-6 md:p-7"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            id="qr-card-title"
            className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
          >
            Il tuo accesso
          </p>
          <p className="mt-1 truncate font-display text-lg tracking-tight">
            {qr?.fullName ?? initialFullName}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset',
            isAccessAllowed
              ? 'bg-success/10 text-success ring-success/20'
              : 'bg-destructive/10 text-destructive ring-destructive/25',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'inline-block size-1.5 rounded-full',
              isAccessAllowed ? 'bg-success' : 'bg-destructive',
              isAccessAllowed && 'animate-pulse',
            )}
          />
          <ShieldCheckIcon size={12} />
          {isAccessAllowed ? 'Attivo' : 'Bloccato'}
        </span>
      </div>

      <div className="relative mx-auto mt-5 aspect-square w-full max-w-[280px] md:mt-6 md:max-w-[320px]">
        <span aria-hidden="true" className={cn(cornerClass, 'left-0 top-0 border-l-2 border-t-2 rounded-tl-md')} />
        <span aria-hidden="true" className={cn(cornerClass, 'right-0 top-0 border-r-2 border-t-2 rounded-tr-md')} />
        <span aria-hidden="true" className={cn(cornerClass, 'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-md')} />
        <span aria-hidden="true" className={cn(cornerClass, 'bottom-0 right-0 border-b-2 border-r-2 rounded-br-md')} />

        <div className="absolute inset-2 overflow-hidden rounded-2xl bg-white p-3">
          {loading && !qr ? (
            <div className="shimmer relative h-full w-full overflow-hidden rounded-xl bg-muted" />
          ) : qr ? (
            <>
              <div
                className="h-full w-full"
                dangerouslySetInnerHTML={{ __html: qr.svg }}
              />
              {isAccessAllowed && !stale ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-3 top-3 h-12 rounded-full"
                  style={{
                    background:
                      'linear-gradient(180deg, color-mix(in oklab, var(--accent) 35%, transparent), transparent)',
                    animation: 'scan 3.2s ease-in-out infinite',
                  }}
                />
              ) : null}
            </>
          ) : (
            <p className="flex h-full items-center justify-center px-4 text-center text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </div>

      <p className="mt-5 text-center text-xs text-muted-foreground">
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

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={() => {
            setLoading(true)
            void fetchQr()
          }}
          className="tap-shrink inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Rigenera QR code"
        >
          <RefreshCwIcon size={12} className={cn(loading && 'animate-spin')} />
          Aggiorna QR
        </button>
      </div>
    </section>
  )
}
