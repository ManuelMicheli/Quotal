/**
 * Client-side Sentry bootstrap. Loaded by Next.js automatically when this
 * file lives at the project root alongside `instrumentation.ts`.
 *
 * Keep the browser bundle small: no Replay, no profiler. Tracing is sampled
 * lightly so we get a few traces per session without flooding the quota.
 */
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
      process.env.NEXT_PUBLIC_VERCEL_ENV ??
      (process.env.NODE_ENV === 'production' ? 'production' : 'development'),
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
    sendDefaultPii: false,
  })
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
