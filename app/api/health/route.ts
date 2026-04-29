import { NextResponse } from 'next/server'

/**
 * Healthcheck endpoint.
 *
 * Returns a small JSON payload used by uptime monitors and deploy smoke
 * tests. Intentionally cheap: no DB calls, no auth.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
}
