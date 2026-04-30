/**
 * Owner table — GDPR data-export audit log.
 *
 * Server component: read-only display, no actions.
 */
import { format } from 'date-fns'
import { it as itLocale } from 'date-fns/locale'

type ExportRow = {
  id: string
  member_id: string
  member_full_name: string
  member_email: string | null
  requested_at: string
  fulfilled_at: string | null
  status: string
  expires_at: string | null
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'In corso',
  fulfilled: 'Completata',
  failed: 'Errore',
}

export function GdprExportsTable({ rows }: { rows: ExportRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nessuna esportazione richiesta finora.
      </p>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-3">Membro</th>
            <th className="py-2 pr-3">Richiesta</th>
            <th className="py-2 pr-3">Stato</th>
            <th className="py-2 pr-3">Scadenza link</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-border/60">
              <td className="py-3 pr-3">
                <div className="flex flex-col">
                  <span className="font-medium">{row.member_full_name}</span>
                  {row.member_email ? (
                    <span className="text-xs text-muted-foreground">
                      {row.member_email}
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="py-3 pr-3 text-muted-foreground">
                {format(new Date(row.requested_at), 'd MMM yyyy HH:mm', {
                  locale: itLocale,
                })}
              </td>
              <td className="py-3 pr-3">
                <span
                  className={
                    row.status === 'fulfilled'
                      ? 'rounded-full bg-success/10 px-2 py-0.5 text-xs text-success'
                      : row.status === 'failed'
                        ? 'rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive'
                        : 'rounded-full bg-warning/10 px-2 py-0.5 text-xs text-warning'
                  }
                >
                  {STATUS_LABEL[row.status] ?? row.status}
                </span>
              </td>
              <td className="py-3 pr-3 text-muted-foreground">
                {row.expires_at
                  ? format(new Date(row.expires_at), 'd MMM yyyy HH:mm', {
                      locale: itLocale,
                    })
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
