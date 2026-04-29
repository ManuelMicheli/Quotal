/**
 * Receipt PDF download endpoint.
 *
 * GET /api/owner/payments/receipt?payment=<uuid>&kind=receipt|invoice
 *
 * Validates the caller (owner/staff of the gym, or the owning member),
 * mints a fresh signed URL for the stored PDF, and 302-redirects.
 * Regenerates the PDF if the path is missing.
 */
import { NextResponse } from 'next/server'

import { regenerateReceiptUrlAction } from '@/app/actions/payments'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const paymentId = url.searchParams.get('payment')
  const kindRaw = url.searchParams.get('kind') ?? 'receipt'
  if (!paymentId) {
    return NextResponse.json({ error: 'payment param required' }, { status: 400 })
  }
  const kind = kindRaw === 'invoice' ? 'invoice' : 'receipt'

  const result = await regenerateReceiptUrlAction(paymentId, kind)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 })
  }
  return NextResponse.redirect(result.data!.url)
}
