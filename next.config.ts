import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

/**
 * Phase 10 — security & polish.
 *
 * The CSP is intentionally explicit. `'unsafe-inline'` on `script-src` is
 * needed for Next.js' inline bootstrap script and React's hydration data;
 * we'd need a per-request nonce middleware to drop it (post-MVP). The
 * directive list below is restrictive enough to defeat trivial XSS while
 * still allowing Stripe (Elements + redirects), Supabase (REST + Storage +
 * Realtime), Resend (webhook callbacks), Google Fonts (used by Inter /
 * Instrument Serif loaded via `next/font/google`), and `data:` / `blob:`
 * for the QR code data URLs and PDF object URLs.
 *
 * In production set `CSP_REPORT_ONLY=true` for the first 24h to confirm no
 * legitimate request is blocked, then flip back to enforcing mode.
 */

const cspDirectives: Record<string, string[]> = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Next.js bootstrap + React hydration data
    "'unsafe-eval'", // Stripe Elements occasionally evaluates dynamically
    'https://js.stripe.com',
    'https://maps.googleapis.com',
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Tailwind inlines critical CSS, shadcn uses style props
    'https://fonts.googleapis.com',
  ],
  'img-src': [
    "'self'",
    'blob:',
    'data:',
    'https://*.supabase.co',
    'https://*.stripe.com',
  ],
  'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
  'connect-src': [
    "'self'",
    'https://*.supabase.co',
    'wss://*.supabase.co',
    'https://api.stripe.com',
    'https://hooks.stripe.com',
    'https://api.resend.com',
    'https://*.sentry.io',
    'https://*.ingest.sentry.io',
  ],
  'frame-src': [
    "'self'",
    'https://js.stripe.com',
    'https://hooks.stripe.com',
  ],
  'worker-src': ["'self'", 'blob:'],
  'manifest-src': ["'self'"],
  'media-src': ["'self'", 'blob:'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  // upgrade-insecure-requests has no value — stringified manually below.
}

function buildCsp(): string {
  return (
    Object.entries(cspDirectives)
      .map(([directive, values]) => `${directive} ${values.join(' ')}`)
      .join('; ') + '; upgrade-insecure-requests'
  )
}

const cspHeader = buildCsp()
const cspHeaderName =
  process.env.CSP_REPORT_ONLY === 'true'
    ? 'Content-Security-Policy-Report-Only'
    : 'Content-Security-Policy'

const baseSecurityHeaders = [
  // HSTS — only meaningful over https. Browsers that connect via http://
  // localhost ignore it, so it's safe to always emit.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // camera=self because the access PWA wants to scan QRs from the tablet
  // (Phase 08); microphone + geolocation aren't used anywhere.
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(), geolocation=(), interest-cohort=()',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: cspHeaderName, value: cspHeader },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Apply to every route. Static assets in /_next/static include
        // their own immutable cache headers from Next.
        source: '/:path*',
        headers: baseSecurityHeaders,
      },
    ]
  },
}

/**
 * Wrap with Sentry only when the auth token is present (build-time env).
 * Without it the wrapper still works but skips source-map upload, which is
 * what we want in CI / local builds with no Sentry credentials.
 */
const sentryEnabled = Boolean(process.env.SENTRY_AUTH_TOKEN)

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      tunnelRoute: '/monitoring',
      disableLogger: true,
      automaticVercelMonitors: true,
    })
  : nextConfig
