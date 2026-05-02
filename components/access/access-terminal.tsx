'use client'

/**
 * Fullscreen tablet kiosk UI.
 *
 *   - Two input modes: camera (lazy-loaded @zxing/browser) and manual /
 *     hardware-reader keyboard input. The operator picks at the top.
 *   - On submit: POST /api/access/verify with the device token in headers.
 *   - Result screen for 3 seconds (green / red), then back to scan.
 *
 * The page is intentionally simple — gym kiosks live in unforgiving
 * environments (loud, busy, dim) so the visual language is large and
 * unambiguous.
 */
import { AnimatePresence, motion } from 'framer-motion'
import {
  CameraIcon,
  CheckCircle2Icon,
  KeyboardIcon,
  RadioIcon,
  ShieldOffIcon,
  WifiIcon,
  WifiOffIcon,
  XCircleIcon,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import * as React from 'react'

import { Logo } from '@/components/shared/logo'
import { Badge } from '@/components/ui/badge'
import { spring } from '@/lib/motion'

const CameraScanner = dynamic(
  () => import('./camera-scanner').then((m) => m.CameraScanner),
  { ssr: false, loading: () => <CameraScannerLoading /> },
)

function CameraScannerLoading() {
  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="glass-strong relative aspect-square w-full overflow-hidden rounded-3xl">
        <div className="shimmer absolute inset-[3px] rounded-[calc(var(--radius-3xl)-3px)] bg-black/60" />
      </div>
      <p className="text-muted-foreground text-sm">Caricamento fotocamera…</p>
    </div>
  )
}

type InputMode = 'camera' | 'manual'

const ALLOW_DURATION_MS = 4000
const DENY_DURATION_MS = 6000

type VerifyResponse = {
  allow: boolean
  reason?: string
  member_name?: string
  message: string
}

type Mode = 'idle' | 'submitting' | 'result'

function useOnlineStatus() {
  const subscribe = React.useCallback((cb: () => void) => {
    window.addEventListener('online', cb)
    window.addEventListener('offline', cb)
    return () => {
      window.removeEventListener('online', cb)
      window.removeEventListener('offline', cb)
    }
  }, [])
  return React.useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  )
}

function useClockTick() {
  return React.useSyncExternalStore(
    (cb) => {
      const id = window.setInterval(cb, 30_000)
      return () => window.clearInterval(id)
    },
    () => Date.now(),
    () => null,
  )
}

const REASON_LABEL_IT: Record<string, string> = {
  unknown_badge: 'Badge sconosciuto',
  no_subscription: 'Nessun abbonamento',
  expired: 'Abbonamento scaduto',
  suspended: 'Abbonamento sospeso',
  cancelled: 'Abbonamento disdetto',
  invalid_token: 'QR non valido',
  wrong_gym: 'Codice non valido qui',
  problematic_member: 'Accesso bloccato',
  network_error: 'Errore di rete',
}

export function AccessTerminal({
  deviceId,
  deviceName,
  deviceToken,
}: {
  deviceId: string
  deviceName: string
  deviceToken: string
}) {
  const [mode, setMode] = React.useState<Mode>('idle')
  const [inputMode, setInputMode] = React.useState<InputMode>('camera')
  const [result, setResult] = React.useState<VerifyResponse | null>(null)
  const [input, setInput] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)
  const resetTimerRef = React.useRef<number | null>(null)

  const online = useOnlineStatus()
  const now = useClockTick()

  // Auto-clear result; deny lingers longer to give the member time to read the reason.
  React.useEffect(() => {
    if (mode !== 'result' || !result) return
    const duration = result.allow ? ALLOW_DURATION_MS : DENY_DURATION_MS
    resetTimerRef.current = window.setTimeout(() => {
      setMode('idle')
      setResult(null)
      setInput('')
      if (inputMode === 'manual') inputRef.current?.focus()
    }, duration)
    return () => {
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current)
    }
  }, [mode, result, inputMode])

  React.useEffect(() => {
    if (mode === 'idle' && inputMode === 'manual') inputRef.current?.focus()
  }, [mode, inputMode])

  async function submit(raw: string) {
    const value = raw.trim()
    if (!value || mode === 'submitting') return
    setMode('submitting')

    // Heuristic: a JWT has two dots (header.payload.signature). Anything
    // else, treat as a raw badge UID. Lets a hardware reader paste either.
    const isJwt = value.split('.').length === 3

    try {
      const res = await fetch('/api/access/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-token': deviceToken,
        },
        body: JSON.stringify(
          isJwt ? { qr_token: value } : { badge_uid: value },
        ),
      })
      const data = (await res.json()) as VerifyResponse
      setResult(data)
      setMode('result')
    } catch {
      setResult({
        allow: false,
        message: 'Errore di rete. Riprova.',
        reason: 'network_error',
      })
      setMode('result')
    }
  }

  return (
    <div className="bg-aurora relative flex min-h-screen flex-col overflow-hidden">
      <div className="bg-grain pointer-events-none absolute inset-0 opacity-30" />

      <header className="relative z-10 flex items-center justify-between gap-4 px-6 py-5 md:px-10 md:py-6">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <span className="text-muted-foreground hidden text-xs sm:inline">
            Terminale di accesso
          </span>
        </div>
        <div className="hidden items-center gap-6 sm:flex">
          {now ? (
            <time
              suppressHydrationWarning
              className="number text-foreground/80 text-sm md:text-base"
            >
              {new Date(now).toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </time>
          ) : null}
          <div className="text-muted-foreground text-right text-xs leading-tight">
            <div className="text-foreground/90 font-medium">{deviceName}</div>
            <div className="number font-mono text-[0.7rem] tracking-wider opacity-70">
              {deviceId.slice(0, 8)}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-8 md:px-10">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait">
            {mode === 'result' && result ? (
              <ResultScreen key="result" result={result} />
            ) : (
              <motion.div
                key="scan"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={spring.gentle}
                className="flex flex-col items-center gap-8"
              >
                <Headline />

                <InputModeToggle value={inputMode} onChange={setInputMode} />

                {inputMode === 'camera' ? (
                  <CameraScanner
                    onScan={(value) => submit(value)}
                    paused={mode === 'submitting'}
                  />
                ) : (
                  <ScannerInput
                    ref={inputRef}
                    value={input}
                    disabled={mode === 'submitting'}
                    onChange={setInput}
                    onSubmit={() => submit(input)}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="relative z-10 flex items-center justify-between gap-3 px-6 py-4 md:px-10 md:py-5">
        <StatusPill online={online} />
        <p className="text-muted-foreground hidden text-xs sm:block">
          Modalità chiosco · Esci dal browser per disabilitare
        </p>
      </footer>
    </div>
  )
}

function Headline() {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="eyebrow text-accent">Quotal · Accesso</span>
      <h1 className="heading-display float text-balance text-3xl md:text-5xl lg:text-6xl">
        Scansiona il tuo codice
      </h1>
      <p className="text-muted-foreground max-w-md text-pretty text-sm md:text-base">
        Inquadra il QR del membro o passa il badge per entrare in palestra.
      </p>
    </div>
  )
}

function StatusPill({ online }: { online: boolean }) {
  if (online) {
    return (
      <Badge variant="success" size="lg" className="gap-1.5 pl-2">
        <span className="relative flex size-2">
          <span className="bg-success absolute inset-0 animate-ping rounded-full opacity-60" />
          <span className="bg-success relative size-2 rounded-full" />
        </span>
        <WifiIcon className="size-3" aria-hidden />
        Connesso
      </Badge>
    )
  }
  return (
    <Badge variant="warning" size="lg" className="gap-1.5">
      <WifiOffIcon className="size-3" aria-hidden />
      Offline
    </Badge>
  )
}

function InputModeToggle({
  value,
  onChange,
}: {
  value: InputMode
  onChange: (mode: InputMode) => void
}) {
  const modes: Array<{ key: InputMode; label: string; Icon: typeof CameraIcon }> = [
    { key: 'camera', label: 'Fotocamera', Icon: CameraIcon },
    { key: 'manual', label: 'Manuale / lettore', Icon: KeyboardIcon },
  ]
  return (
    <div className="glass tap-shrink inline-flex rounded-full p-1">
      {modes.map(({ key, label, Icon }) => {
        const active = value === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={active}
            className={`focus-glow relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 md:px-5 md:py-2.5 md:text-base ${
              active
                ? 'text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {active ? (
              <motion.span
                layoutId="kiosk-mode-pill"
                transition={spring.snappy}
                className="bg-accent ring-floating absolute inset-0 -z-10 rounded-full"
                aria-hidden
              />
            ) : null}
            <Icon className="size-4 md:size-[1.05rem]" aria-hidden />
            {label}
          </button>
        )
      })}
    </div>
  )
}

const ScannerInput = React.forwardRef<
  HTMLInputElement,
  {
    value: string
    disabled: boolean
    onChange: (v: string) => void
    onSubmit: () => void
  }
>(function ScannerInput({ value, disabled, onChange, onSubmit }, ref) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="flex w-full flex-col items-center gap-6"
    >
      <div className="glass flex w-full flex-col items-center gap-5 rounded-3xl px-8 py-10">
        <div className="bg-accent-soft text-accent ring-soft flex size-16 items-center justify-center rounded-2xl">
          <RadioIcon className="size-8" aria-hidden />
        </div>
        <p className="text-muted-foreground max-w-md text-center text-sm md:text-base">
          Mostra il QR dal tuo telefono al lettore, oppure passa il badge.
          In alternativa, inserisci manualmente il codice qui sotto.
        </p>
        <input
          ref={ref}
          type="text"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          inputMode="text"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Codice QR o ID badge"
          className="bg-card/40 text-foreground placeholder:text-muted-foreground/60 focus:border-accent focus:ring-accent/20 number ring-soft w-full rounded-xl border border-transparent px-4 py-3.5 text-center font-mono text-base outline-none transition-[border,box-shadow] duration-200 focus:ring-4 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="bg-accent text-accent-foreground hover:bg-accent/92 focus-glow tap-shrink elev-2 rounded-full px-8 py-3 text-base font-medium transition-all duration-200 disabled:opacity-50"
        >
          {disabled ? 'Verifica…' : 'Verifica accesso'}
        </button>
      </div>
    </form>
  )
})

function ResultScreen({ result }: { result: VerifyResponse }) {
  const reasonLabel = result.reason
    ? (REASON_LABEL_IT[result.reason] ?? result.reason)
    : null

  const isAllow = result.allow

  return (
    <motion.div
      key={isAllow ? 'allow' : 'deny'}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-6 py-10"
      role="status"
      aria-live="polite"
    >
      {/* Tinted full-bleed background */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0"
        style={{
          background: isAllow
            ? 'radial-gradient(ellipse at center, color-mix(in oklab, var(--success) 35%, var(--background)) 0%, var(--background) 70%)'
            : 'radial-gradient(ellipse at center, color-mix(in oklab, var(--destructive) 30%, var(--background)) 0%, var(--background) 70%)',
        }}
      />
      <div className="bg-grain pointer-events-none absolute inset-0 opacity-25" />

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-8 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={spring.bouncy}
          className="relative"
        >
          {/* Halo */}
          <div
            className="pulse-glow absolute inset-0 rounded-full blur-2xl"
            aria-hidden
            style={{
              background: isAllow
                ? 'color-mix(in oklab, var(--success) 60%, transparent)'
                : 'color-mix(in oklab, var(--destructive) 60%, transparent)',
            }}
          />
          <div
            className="relative flex size-32 items-center justify-center rounded-full md:size-40"
            style={{
              background: isAllow
                ? 'color-mix(in oklab, var(--success) 22%, var(--card))'
                : 'color-mix(in oklab, var(--destructive) 22%, var(--card))',
              border: isAllow
                ? '1px solid color-mix(in oklab, var(--success) 40%, transparent)'
                : '1px solid color-mix(in oklab, var(--destructive) 40%, transparent)',
              boxShadow: isAllow
                ? '0 0 60px color-mix(in oklab, var(--success) 40%, transparent), inset 0 1px 0 0 color-mix(in oklab, white 12%, transparent)'
                : '0 0 60px color-mix(in oklab, var(--destructive) 40%, transparent), inset 0 1px 0 0 color-mix(in oklab, white 12%, transparent)',
            }}
          >
            {isAllow ? (
              <CheckCircle2Icon
                className="text-success size-20 md:size-24"
                strokeWidth={1.75}
                aria-hidden
              />
            ) : (
              <XCircleIcon
                className="text-destructive size-20 md:size-24"
                strokeWidth={1.75}
                aria-hidden
              />
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring.gentle, delay: 0.08 }}
          className="flex flex-col items-center gap-4"
        >
          <span
            className="eyebrow"
            style={{
              color: isAllow ? 'var(--success)' : 'var(--destructive)',
            }}
          >
            {isAllow ? 'Accesso consentito' : 'Accesso negato'}
          </span>

          {result.member_name ? (
            <h2 className="heading-display text-balance text-4xl md:text-6xl">
              {result.member_name}
            </h2>
          ) : (
            <h2 className="heading-display text-balance text-4xl md:text-6xl">
              {isAllow ? 'Benvenuto' : 'Impossibile entrare'}
            </h2>
          )}

          <p className="text-muted-foreground max-w-lg text-pretty text-base md:text-lg">
            {result.message}
          </p>

          {!isAllow && reasonLabel ? (
            <Badge variant="destructive" size="lg" className="mt-2 gap-1.5">
              <ShieldOffIcon className="size-3" aria-hidden />
              {reasonLabel}
            </Badge>
          ) : null}

          {!isAllow ? (
            <p className="text-muted-foreground/80 mt-4 text-xs md:text-sm">
              Rivolgiti allo staff per assistenza.
            </p>
          ) : null}
        </motion.div>
      </div>
    </motion.div>
  )
}
