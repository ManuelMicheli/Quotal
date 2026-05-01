/**
 * Next.js instrumentation entrypoint. Runs once per server runtime
 * (Node + Edge) and once per build. Used to bootstrap Sentry on the
 * server side so unhandled exceptions in Server Components, Server
 * Actions, route handlers, and middleware are captured.
 *
 * The browser counterpart is `instrumentation-client.ts`.
 */
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN

export async function register() {
  if (!dsn) return

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV ?? 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
      sendDefaultPii: false,
    })
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV ?? 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
      sendDefaultPii: false,
    })
  }
}

export const onRequestError = Sentry.captureRequestError
