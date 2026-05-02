/**
 * Owner-side GDPR queue.
 *
 * Lists pending/processed deletion requests + the audit log of data export
 * requests. The titolare uses the action buttons to anonymise a profile
 * (`processAccountDeletionAction`) or to mark a request as rejected with
 * a motivation.
 */
import { ArrowLeftIcon } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { GdprDeletionTable } from '@/components/owner/gdpr-deletion-table'
import { GdprExportsTable } from '@/components/owner/gdpr-exports-table'
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderHeading,
} from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
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
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 w-fit text-muted-foreground"
      >
        <Link href="/dashboard/impostazioni">
          <ArrowLeftIcon className="size-3.5" />
          Tutte le impostazioni
        </Link>
      </Button>
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Privacy</PageHeaderEyebrow>
          <PageHeaderHeading>Richieste GDPR</PageHeaderHeading>
          <PageHeaderDescription>
            Coda di richieste di portabilità (Art. 20) e cancellazione (Art.
            17) inoltrate dai membri. Da processare entro 30 giorni.
          </PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Richieste di cancellazione</CardTitle>
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
          <CardTitle>Esportazioni dati richieste</CardTitle>
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
