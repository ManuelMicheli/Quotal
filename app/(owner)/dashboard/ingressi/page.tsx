/**
 * Access logs list.
 *
 * Real data lands with the turnstile integration in Phase 08. For now we
 * render whatever rows happen to be in `access_logs` (RLS-scoped). When the
 * table is empty we show a placeholder with the eventual layout sketched out.
 */
import { DoorOpenIcon } from 'lucide-react'

import { EmptyState } from '@/components/owner/empty-state'
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
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Operazioni</p>
        <h1 className="font-display text-3xl tracking-tight">Ingressi</h1>
        <p className="text-sm text-muted-foreground">
          I log accessi popolati dal tornello arriveranno con la Phase 08.
        </p>
      </header>

      {result.logs.length === 0 ? (
        <EmptyState
          icon={DoorOpenIcon}
          title="Nessun ingresso registrato"
          description="Quando il tornello sarà connesso, vedrai qui ogni accesso al locale."
        />
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
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
                  <TableCell className="text-sm">
                    {formatDate(log.accessed_at, 'short')}{' '}
                    {new Date(log.accessed_at).toLocaleTimeString('it-IT', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell>
                    {log.member?.full_name ?? '—'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.badge_uid ?? '—'}
                  </TableCell>
                  <TableCell>
                    {log.granted ? (
                      <Badge
                        variant="outline"
                        className="bg-success/10 text-success border-success/20"
                      >
                        Consentito
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-destructive/10 text-destructive border-destructive/20"
                      >
                        Negato
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.denial_reason ?? '—'}
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
