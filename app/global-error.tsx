'use client'

/**
 * Last-resort error page that wraps even the root layout.
 * Must define its own <html> + <body>.
 */
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[global-error.tsx]', error)
  }, [error])

  return (
    <html lang="it">
      <body
        style={{
          margin: 0,
          padding: '4rem 1.5rem',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          textAlign: 'center',
          color: '#0A0A0A',
          background: '#FAFAF9',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
        }}
      >
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Errore di sistema</h1>
        <p style={{ maxWidth: 480, color: '#57534E' }}>
          Quotal ha riscontrato un errore irreversibile in questa pagina.
          Prova a ricaricare; se il problema persiste, scrivi a
          support@quotal.it.
        </p>
        {error.digest ? (
          <p style={{ fontSize: '0.75rem', color: '#57534E' }}>
            ID errore: {error.digest}
          </p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          style={{
            background: '#0A0A0A',
            color: '#FAFAFA',
            border: 'none',
            padding: '0.625rem 1.25rem',
            borderRadius: '0.5rem',
            cursor: 'pointer',
          }}
        >
          Ricarica
        </button>
      </body>
    </html>
  )
}
