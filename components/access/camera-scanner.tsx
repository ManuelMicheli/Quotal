'use client'

/**
 * Camera-driven QR scanner for the access kiosk. Lazy-loaded via
 * `next/dynamic` from `AccessTerminal` so the @zxing/browser bundle
 * (~140KB) only ships when the operator switches the kiosk into camera
 * mode.
 *
 * The component owns the lifecycle of a single MediaStream — it stops the
 * stream on unmount so the camera LED turns off cleanly. Detected codes
 * are deduplicated within a short window so a member holding their phone
 * up doesn't trigger 30 verifications a second.
 */
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser'
import { CameraOffIcon, RefreshCwIcon, ScanLineIcon, VideoOffIcon } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/empty-state'

const DEDUPE_WINDOW_MS = 2000

type ErrorKind = 'permission' | 'no-camera' | 'generic'

type ScannerError = {
  kind: ErrorKind
  message: string
}

export function CameraScanner({
  onScan,
  paused,
}: {
  /** Fires when a QR code is decoded; receives the raw text content. */
  onScan: (value: string) => void
  /** When true, suspends the scanner without tearing down the stream. */
  paused?: boolean
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const controlsRef = React.useRef<IScannerControls | null>(null)
  const lastScanRef = React.useRef<{ value: string; at: number } | null>(null)
  const onScanRef = React.useRef(onScan)
  const [error, setError] = React.useState<ScannerError | null>(null)
  const [ready, setReady] = React.useState(false)
  const [restartTick, setRestartTick] = React.useState(0)

  React.useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  React.useEffect(() => {
    let cancelled = false
    const reader = new BrowserQRCodeReader()

    async function start() {
      const video = videoRef.current
      if (!video) return

      try {
        // Prefer the back camera on tablets; fall back to whatever's there.
        const constraints: MediaStreamConstraints = {
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        }
        const controls = await reader.decodeFromConstraints(
          constraints,
          video,
          (result, err) => {
            if (cancelled) return
            if (result) {
              const value = result.getText()
              const now = Date.now()
              const last = lastScanRef.current
              if (
                last &&
                last.value === value &&
                now - last.at < DEDUPE_WINDOW_MS
              ) {
                return
              }
              lastScanRef.current = { value, at: now }
              onScanRef.current(value)
            }
            // Ignore decode errors — they fire constantly while no code is in
            // frame. Real failures (camera lost, permission revoked) bubble
            // through the start() promise rejection above.
            void err
          },
        )
        if (cancelled) {
          controls.stop()
          return
        }
        controlsRef.current = controls
        setReady(true)
        setError(null)
      } catch (err) {
        if (cancelled) return
        const name = (err as { name?: string } | null)?.name
        if (name === 'NotAllowedError') {
          setError({
            kind: 'permission',
            message:
              'Permesso fotocamera negato. Abilitalo dalle impostazioni del browser.',
          })
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
          setError({
            kind: 'no-camera',
            message: 'Nessuna fotocamera disponibile su questo dispositivo.',
          })
        } else {
          setError({
            kind: 'generic',
            message: 'Impossibile avviare la fotocamera. Riprova.',
          })
        }
      }
    }

    void start()

    return () => {
      cancelled = true
      controlsRef.current?.stop()
      controlsRef.current = null
      setReady(false)
    }
  }, [restartTick])

  if (error) {
    return <ScannerError error={error} onRetry={() => setRestartTick((t) => t + 1)} />
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="relative aspect-square w-full overflow-hidden rounded-3xl">
        {/* Glass border + inner shadow frame around the video */}
        <div className="glass-strong absolute inset-0 rounded-3xl" aria-hidden />
        <div className="absolute inset-[3px] overflow-hidden rounded-[calc(var(--radius-3xl)-3px)] bg-black">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline
            muted
          />

          {/* Soft vignette to focus attention on the reticle */}
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            style={{
              background:
                'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)',
            }}
          />

          {/* Reticle frame with corner brackets */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative size-[68%]">
              <CornerBracket className="absolute -left-1 -top-1" position="tl" />
              <CornerBracket className="absolute -right-1 -top-1" position="tr" />
              <CornerBracket className="absolute -bottom-1 -left-1" position="bl" />
              <CornerBracket className="absolute -bottom-1 -right-1" position="br" />

              {/* Animated scan line — uses the @keyframes scan from globals.css */}
              {ready && !paused ? (
                <div className="absolute inset-x-2 top-0 overflow-hidden rounded-full">
                  <div
                    className="h-[3px] w-full rounded-full"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent, color-mix(in oklab, var(--accent) 80%, transparent) 20%, color-mix(in oklab, var(--accent) 100%, transparent) 50%, color-mix(in oklab, var(--accent) 80%, transparent) 80%, transparent)',
                      boxShadow:
                        '0 0 20px color-mix(in oklab, var(--accent) 80%, transparent), 0 0 40px color-mix(in oklab, var(--accent) 40%, transparent)',
                      animation: 'scan 2.4s var(--ease-soft) infinite',
                    }}
                  />
                </div>
              ) : null}

              {/* Subtle ambient pulse halo when idle */}
              {ready && !paused ? (
                <div
                  className="pulse-glow pointer-events-none absolute inset-0 rounded-2xl"
                  aria-hidden
                  style={{
                    boxShadow:
                      '0 0 0 1px color-mix(in oklab, var(--accent) 40%, transparent), 0 0 60px color-mix(in oklab, var(--accent) 20%, transparent)',
                  }}
                />
              ) : null}
            </div>
          </div>

          {/* Loading state */}
          {!ready && !paused ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3 text-zinc-200">
                <div
                  className="size-8 rounded-full border-2 border-white/20 border-t-white"
                  style={{ animation: 'orbit 1s linear infinite' }}
                  aria-hidden
                />
                <p className="text-sm tracking-tight">Avvio fotocamera…</p>
              </div>
            </div>
          ) : null}

          {/* Paused (during verification) */}
          {paused ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/65 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3 text-zinc-100">
                <CameraOffIcon className="size-12 opacity-90" aria-hidden />
                <p className="text-sm tracking-tight">Verifica in corso…</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <ScanLineIcon className="text-accent size-4" aria-hidden />
        <span>
          {ready
            ? 'Inquadra il QR del membro al centro del riquadro.'
            : 'Preparazione del lettore in corso…'}
        </span>
      </div>
    </div>
  )
}

function CornerBracket({
  position,
  className,
}: {
  position: 'tl' | 'tr' | 'bl' | 'br'
  className?: string
}) {
  const map: Record<typeof position, string> = {
    tl: 'border-l-[3px] border-t-[3px] rounded-tl-2xl',
    tr: 'border-r-[3px] border-t-[3px] rounded-tr-2xl',
    bl: 'border-l-[3px] border-b-[3px] rounded-bl-2xl',
    br: 'border-r-[3px] border-b-[3px] rounded-br-2xl',
  }
  return (
    <span
      aria-hidden
      className={`pointer-events-none block size-12 ${map[position]} border-accent ${className ?? ''}`}
      style={{
        boxShadow:
          '0 0 16px color-mix(in oklab, var(--accent) 35%, transparent)',
      }}
    />
  )
}

function ScannerError({
  error,
  onRetry,
}: {
  error: ScannerError
  onRetry: () => void
}) {
  if (error.kind === 'permission') {
    return (
      <EmptyState
        variant="hero"
        size="lg"
        className="glass w-full !rounded-3xl"
        icon={<VideoOffIcon className="text-warning" />}
        title="Concedi l'accesso alla fotocamera"
        description={error.message}
        action={
          <Button variant="accent" size="lg" onClick={onRetry}>
            <RefreshCwIcon aria-hidden />
            Riprova
          </Button>
        }
      />
    )
  }

  if (error.kind === 'no-camera') {
    return (
      <EmptyState
        variant="hero"
        size="lg"
        className="glass w-full !rounded-3xl"
        icon={<CameraOffIcon className="text-muted-foreground" />}
        title="Nessuna fotocamera rilevata"
        description={error.message}
        action={
          <Button variant="outline" size="lg" onClick={onRetry}>
            <RefreshCwIcon aria-hidden />
            Riprova
          </Button>
        }
      />
    )
  }

  return (
    <EmptyState
      variant="hero"
      size="lg"
      className="glass w-full !rounded-3xl"
      icon={<CameraOffIcon className="text-destructive" />}
      title="Impossibile avviare la fotocamera"
      description={error.message}
      action={
        <Button variant="accent" size="lg" onClick={onRetry}>
          <RefreshCwIcon aria-hidden />
          Riprova
        </Button>
      }
    />
  )
}
