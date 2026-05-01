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
import { CameraIcon, CameraOffIcon } from 'lucide-react'
import * as React from 'react'

const DEDUPE_WINDOW_MS = 2000

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
  const [error, setError] = React.useState<string | null>(null)
  const [ready, setReady] = React.useState(false)

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
      } catch (err) {
        if (cancelled) return
        const name = (err as { name?: string } | null)?.name
        if (name === 'NotAllowedError') {
          setError('Permesso fotocamera negato. Abilitalo dalle impostazioni del browser.')
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
          setError('Nessuna fotocamera disponibile su questo dispositivo.')
        } else {
          setError('Impossibile avviare la fotocamera. Riprova.')
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
  }, [])

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-4">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-zinc-700 bg-black">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
        />
        {/* Reticle — purely decorative; helps the user aim. */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="size-2/3 rounded-2xl border-2 border-emerald-400/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
        {paused ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/70 text-zinc-200">
            <CameraOffIcon className="size-12" />
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <CameraIcon className="size-4" aria-hidden />
        {error
          ? <span className="text-red-300">{error}</span>
          : ready
            ? <span>Inquadra il QR del membro.</span>
            : <span>Avvio fotocamera…</span>}
      </div>
    </div>
  )
}
