/**
 * Owner members autocomplete endpoint.
 *
 * Used by the cash-payment dialog member picker. Returns up to 8 members of
 * the caller's gym whose name/email/phone matches the query. The route is
 * gated by `requireOwnerOrStaff()`; RLS scopes the SELECT.
 */
import { NextResponse } from 'next/server'

import { requireOwnerOrStaff } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  await requireOwnerOrStaff()
  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) {
    return NextResponse.json({ members: [] })
  }
  const term = q.replace(/[%_]/g, '')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone')
    .eq('role', 'member')
    .or(
      `full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`,
    )
    .order('full_name', { ascending: true })
    .limit(8)

  if (error) {
    return NextResponse.json(
      { error: error.message, members: [] },
      { status: 500 },
    )
  }
  return NextResponse.json({ members: data ?? [] })
}
