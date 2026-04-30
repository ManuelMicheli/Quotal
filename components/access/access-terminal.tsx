'use client'

/**
 * Fullscreen tablet kiosk UI.
 *
 * MVP scope — keep it dependency-light and obvious:
 *   - Manual entry of a member's QR token (paste) or badge UID. A camera-
 *     based scanner ships in the next iteration; that requires html5-qrcode
 *     (~140KB) and is an opinionated upgrade we'd rather defer until a
 *     specific tablet model is on the bench.
 *   - On submit: POST /api/access/verify with the device token in headers.
 *   - Result screen for 3 seconds (green / red), then back to scan.
 *
 * The page is intentionally simple — gym kiosks live in unforgiving
 * environments (loud, busy, dim) so the visual language is large and
 * unambiguous.
 */
import { CheckCircle2Icon, KeyboardIcon, XCircleIcon } from 'lucide-react'
import * as React from 'react'

const RESULT_DURATION_MS = 3000

type VerifyResponse = {
  allow: boolean
  reason?: string
  member_name?: string
  message: string
}

type Mode = 'idle' | 'submitting' | 'result'

const REASON_LABEL_IT: Record<string, string> = {
  unknown_badge: 'Badge sconosciuto',
  no_subscription: 'Nessun abbonamento',
  expired: 'Abbonamento scaduto',
  suspended: 'Abbonamento sospeso',
  cancelled: 'Abbonamento disdetto',
  invalid_token: 'QR non valido',
  wrong_gym: 'Codice non valido qui',
  problematic_member: 'Accesso bloccato',
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
  const [result, setResult] = React.useState<VerifyResponse | null>(null)
  const [input, setInput] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)
  const resetTimerRef = React.useRef<number | null>(null)

  // Auto-clear result after RESULT_DURATION_MS, return to idle scanner.
  React.useEffect(() => {
    if (mode !== 'result') return
    resetTimerRef.current = window.setTimeout(() => {
      setMode('idle')
      setResult(null)
      setInput('')
      inputRef.current?.focus()
    }, RESULT_DURATION_MS)
    return () => {
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current)
    }
  }, [mode])

  React.useEffect(() => {
    if (mode === 'idle') inputRef.current?.focus()
  }, [mode])

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
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="font-display text-xl tracking-tight">Quotal</div>
        <div className="text-xs text-zinc-400">
          Dispositivo: <span className="text-zinc-200">{deviceName}</span>
          <span className="ml-2 font-mono text-zinc-500">
            {deviceId.slice(0, 8)}
          </span>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6">
        {mode === 'result' && result ? (
          <ResultScreen result={result} />
        ) : (
          <ScannerInput
            ref={inputRef}
            value={input}
            disabled={mode === 'submitting'}
            onChange={setInput}
            onSubmit={() => submit(input)}
          />
        )}
      </main>

      <footer className="border-t border-zinc-800 px-6 py-3 text-center text-xs text-zinc-500">
        Modalità chiosco. Esci dal browser per disabilitare.
      </footer>
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
      className="flex w-full max-w-xl flex-col items-center gap-6"
    >
      <KeyboardIcon className="size-16 text-zinc-600" aria-hidden />
      <h2 className="font-display text-3xl tracking-tight text-zinc-100">
        In attesa di scansione
      </h2>
      <p className="text-center text-sm text-zinc-400">
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
        className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 font-mono text-base text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-500"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="rounded-md bg-zinc-100 px-6 py-3 font-medium text-zinc-900 transition-colors disabled:opacity-50"
      >
        {disabled ? 'Verifica…' : 'Verifica accesso'}
      </button>
    </form>
  )
})

function ResultScreen({ result }: { result: VerifyResponse }) {
  const reasonLabel = result.reason
    ? (REASON_LABEL_IT[result.reason] ?? result.reason)
    : null
  return (
    <div
      className={`flex w-full max-w-xl flex-col items-center gap-4 rounded-2xl border px-6 py-12 text-center ${
        result.allow
          ? 'border-emerald-700 bg-emerald-950/40 text-emerald-100'
          : 'border-red-800 bg-red-950/40 text-red-100'
      }`}
      role="status"
      aria-live="polite"
    >
      {result.allow ? (
        <CheckCircle2Icon className="size-24" />
      ) : (
        <XCircleIcon className="size-24" />
      )}
      <h2 className="font-display text-4xl tracking-tight">
        {result.allow ? 'Accesso consentito' : 'Accesso negato'}
      </h2>
      {result.member_name ? (
        <p className="text-xl">{result.member_name}</p>
      ) : null}
      <p className="text-base">{result.message}</p>
      {!result.allow && reasonLabel ? (
        <p className="text-xs uppercase tracking-wide opacity-80">
          {reasonLabel}
        </p>
      ) : null}
    </div>
  )
}
