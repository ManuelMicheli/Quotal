/**
 * Access logs list.
 *
 * Real data lands with the turnstile integration in Phase 08. For now we
 * render whatever rows happen to be in `access_logs` (RLS-scoped). When the
 * table is empty we show a placeholder with the eventual layout sketched out.
 */
import { DoorOpenIcon } from 'lucide-react'

import { EmptyState } from '@/components/shared/empty-state'
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderHeading,
} from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getAccessLogsList } from '@/lib/queries/owner'
import { formatDate } from '@/lib/format'

export const dynamic = 'force-dynamic'

const DENIAL_LABEL_IT: Record<string, string> = {
  unknown_badge: 'Badge sconosciuto',
  no_subscription: 'Nessun abbonamento',
  expired: 'Scaduto',
  suspended: 'Sospeso',
  cancelled: 'Disdetto',
  invalid_token: 'QR non valido',
  wrong_gym: 'Codice di un altro impianto',
  problematic_member: 'Membro bloccato',
}

export default async function AccessLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    granted?: string
    page?: string
  }>
}) {
  const sp = await searchParams
  const result = await getAccessLogsList({
    granted:
      sp.granted === 'granted' || sp.granted === 'denied' ? sp.granted : 'all',
    page: sp.page ? Math.max(1, Number(sp.page) || 1) : 1,
  })

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Operazioni</PageHeaderEyebrow>
          <PageHeaderHeading>Ingressi</PageHeaderHeading>
          <PageHeaderDescription>
            Storico degli accessi dal tornello e dal tablet kiosk. Ogni
            tentativo è registrato — riuscito o negato.
          </PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>

      {result.logs.length === 0 ? (
        <EmptyState
          variant="bordered"
          icon={<DoorOpenIcon />}
          title="Nessun ingresso registrato"
          description="Quando il tornello sarà connesso, vedrai qui ogni accesso al locale."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-1)]">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Data e ora</TableHead>
                <TableHead>Membro</TableHead>
                <TableHead>Badge</TableHead>
                <TableHead>Esito</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="tabular text-[0.8125rem]">
                    {formatDate(log.accessed_at, 'short')}{' '}
                    <span className="text-muted-foreground">
                      {new Date(log.accessed_at).toLocaleTimeString('it-IT', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {log.member?.full_name ?? '—'}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {log.badge_uid ?? '—'}
                  </TableCell>
                  <TableCell>
                    {log.granted ? (
                      <Badge variant="success">Consentito</Badge>
                    ) : (
                      <Badge variant="destructive">Negato</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-[0.8125rem] text-muted-foreground">
                    {log.denial_reason
                      ? (DENIAL_LABEL_IT[log.denial_reason] ?? log.denial_reason)
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
