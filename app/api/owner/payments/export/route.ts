/**
 * GET /api/owner/payments/export?month=YYYY-MM
 *
 * Streams a CSV of every payment row in the given month, scoped to the
 * caller's gym via RLS. Owner/staff only.
 *
 * Phase 04 only handles current-month CSV; the full "esporta per
 * commercialista" flow with PDFs lives in Phase 06.
 */
import { NextResponse, type NextRequest } from 'next/server'

import { requireOwnerOrStaff } from '@/lib/auth'
import { formatCurrency, formatDate } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'

function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

export async function GET(req: NextRequest) {
  await requireOwnerOrStaff()

  const monthParam = req.nextUrl.searchParams.get('month')
  const now = new Date()
  const target = monthParam && /^\d{4}-\d{2}$/.test(monthParam)
    ? monthParam
    : `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const [yStr, mStr] = target.split('-')
  const year = Number(yStr)
  const month = Number(mStr) - 1
  const start = new Date(Date.UTC(year, month, 1))
  const end = new Date(Date.UTC(year, month + 1, 1))

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .select('*, member:profiles!payments_member_id_fkey(full_name, email)')
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const header = [
    'Data',
    'Membro',
    'Email',
    'Importo',
    'Importo (centesimi)',
    'Metodo',
    'Stato',
    'Numero ricevuta',
    'Numero fattura',
    'Note',
  ]
  const rows = (data ?? []).map((p) => [
    formatDate(p.created_at, 'short'),
    p.member?.full_name ?? '',
    p.member?.email ?? '',
    formatCurrency(p.amount_cents),
    String(p.amount_cents),
    p.payment_method,
    p.status,
    p.receipt_number ?? '',
    p.invoice_number ?? '',
    p.notes ?? '',
  ])

  const csv =
    [header, ...rows]
      .map((row) => row.map(csvEscape).join(','))
      .join('\n') + '\n'

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="quotal-pagamenti-${target}.csv"`,
    },
  })
}
