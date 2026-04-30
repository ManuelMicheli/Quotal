/**
 * Owner-side GDPR queue.
 *
 * Lists pending/processed deletion requests + the audit log of data export
 * requests. The titolare uses the action buttons to anonymise a profile
 * (`processAccountDeletionAction`) or to mark a request as rejected with
 * a motivation.
 */
import type { Metadata } from 'next'

import { GdprDeletionTable } from '@/components/owner/gdpr-deletion-table'
import { GdprExportsTable } from '@/components/owner/gdpr-exports-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireOwnerOrStaff } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata: Metadata = {
  title: 'Richieste GDPR',
}

export const dynamic = 'force-dynamic'

export default async function GdprRequestsPage() {
  const owner = await requireOwnerOrStaff()
  const admin = createAdminClient()

  const [deletionsRes, exportsRes] = await Promise.all([
    admin
      .from('account_deletion_requests')
      .select('id, member_id, reason, status, requested_at, processed_at, notes')
      .eq('gym_id', owner.gym_id)
      .order('requested_at', { ascending: false })
      .limit(200),
    admin
      .from('data_export_requests')
      .select('id, member_id, requested_at, fulfilled_at, status, expires_at')
      .eq('gym_id', owner.gym_id)
      .order('requested_at', { ascending: false })
      .limit(50),
  ])

  const memberIds = new Set<string>()
  for (const row of deletionsRes.data ?? []) memberIds.add(row.member_id)
  for (const row of exportsRes.data ?? []) memberIds.add(row.member_id)

  const profilesRes = memberIds.size
    ? await admin
        .from('profiles')
        .select('id, full_name, email')
        .in('id', Array.from(memberIds))
    : { data: [], error: null }

  const profileById = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p]),
  )

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Privacy</p>
        <h1 className="font-display text-3xl tracking-tight md:text-4xl lg:text-5xl">
          Richieste GDPR
        </h1>
        <p className="text-sm text-muted-foreground">
          Coda di richieste di portabilità (Art. 20) e cancellazione (Art.
          17) inoltrate dai membri. Da processare entro 30 giorni.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Richieste di cancellazione
          </CardTitle>
        </CardHeader>
        <CardContent>
          <GdprDeletionTable
            rows={(deletionsRes.data ?? []).map((row) => {
              const profile = profileById.get(row.member_id)
              return {
                ...row,
                member_full_name: profile?.full_name ?? '—',
                member_email: profile?.email ?? null,
              }
            })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Esportazioni dati richieste
          </CardTitle>
        </CardHeader>
        <CardContent>
          <GdprExportsTable
            rows={(exportsRes.data ?? []).map((row) => {
              const profile = profileById.get(row.member_id)
              return {
                ...row,
                member_full_name: profile?.full_name ?? '—',
                member_email: profile?.email ?? null,
              }
            })}
          />
        </CardContent>
      </Card>
    </div>
  )
}
