/**
 * Daily-close report PDF download.
 *
 * GET /api/owner/payments/daily-report?date=YYYY-MM-DD
 *
 * Owner/staff only. Looks up the saved `daily_close_reports` row for the
 * caller's gym and 302-redirects to a fresh signed URL on the stored PDF.
 */
import { NextResponse } from 'next/server'

import { requireOwnerOrStaff } from '@/lib/auth'
import { createSignedReceiptUrl } from '@/lib/pdf/generate-receipt'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const owner = await requireOwnerOrStaff()
  const url = new URL(req.url)
  const date = url.searchParams.get('date')
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: 'date param required (YYYY-MM-DD)' },
      { status: 400 },
    )
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('daily_close_reports')
    .select('pdf_path')
    .eq('gym_id', owner.gym_id)
    .eq('close_date', date)
    .maybeSingle()

  if (error || !data?.pdf_path) {
    return NextResponse.json(
      { error: 'Report non trovato per questa data' },
      { status: 404 },
    )
  }

  try {
    const signed = await createSignedReceiptUrl(data.pdf_path)
    return NextResponse.redirect(signed)
  } catch (err) {
    console.error('[api/daily-report] sign failed:', err)
    return NextResponse.json(
      { error: 'Impossibile generare il link' },
      { status: 500 },
    )
  }
}
