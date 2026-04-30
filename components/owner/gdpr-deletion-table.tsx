'use client'

/**
 * Owner table — pending/processed account deletion requests.
 *
 * Each pending row shows a "Anonimizza" button + a "Rifiuta" button. The
 * action is destructive (PII scrubbed, cannot be undone) so we wrap both
 * in a confirm dialog with an optional notes field.
 */
import { format } from 'date-fns'
import { it as itLocale } from 'date-fns/locale'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { processAccountDeletionAction } from '@/app/actions/legal'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

type DeletionRow = {
  id: string
  member_id: string
  member_full_name: string
  member_email: string | null
  reason: string | null
  status: string
  requested_at: string
  processed_at: string | null
  notes: string | null
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'In attesa',
  processed: 'Processata',
  rejected: 'Rifiutata',
}

export function GdprDeletionTable({ rows }: { rows: DeletionRow[] }) {
  const [target, setTarget] = useState<{
    row: DeletionRow
    decision: 'processed' | 'rejected'
  } | null>(null)
  const [notes, setNotes] = useState('')
  const [pending, startTransition] = useTransition()

  function openDialog(row: DeletionRow, decision: 'processed' | 'rejected') {
    setTarget({ row, decision })
    setNotes('')
  }

  function confirm() {
    if (!target) return
    startTransition(async () => {
      const result = await processAccountDeletionAction({
        request_id: target.row.id,
        decision: target.decision,
        notes: notes.trim() || undefined,
      })
      if (result.ok) {
        toast.success(result.message ?? 'Aggiornato.')
        setTarget(null)
      } else {
        toast.error(result.error)
      }
    })
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nessuna richiesta di cancellazione al momento.
      </p>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3">Membro</th>
              <th className="py-2 pr-3">Richiesta il</th>
              <th className="py-2 pr-3">Motivo</th>
              <th className="py-2 pr-3">Stato</th>
              <th className="py-2 pr-3">Azioni</th>
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
                  {format(new Date(row.requested_at), 'd MMM yyyy', {
                    locale: itLocale,
                  })}
                </td>
                <td className="py-3 pr-3 text-muted-foreground">
                  {row.reason ?? '—'}
                </td>
                <td className="py-3 pr-3">
                  <span
                    className={
                      row.status === 'pending'
                        ? 'rounded-full bg-warning/10 px-2 py-0.5 text-xs text-warning'
                        : row.status === 'processed'
                          ? 'rounded-full bg-success/10 px-2 py-0.5 text-xs text-success'
                          : 'rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground'
                    }
                  >
                    {STATUS_LABEL[row.status] ?? row.status}
                  </span>
                </td>
                <td className="py-3 pr-3">
                  {row.status === 'pending' ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openDialog(row, 'processed')}
                      >
                        Anonimizza
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDialog(row, 'rejected')}
                      >
                        Rifiuta
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {row.processed_at
                        ? format(new Date(row.processed_at), 'd MMM yyyy', {
                            locale: itLocale,
                          })
                        : '—'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={target !== null} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {target?.decision === 'processed'
                ? 'Confermi l’anonimizzazione?'
                : 'Confermi il rifiuto?'}
            </DialogTitle>
            <DialogDescription>
              {target?.decision === 'processed'
                ? 'I dati personali del profilo verranno scrubbati. Le ricevute fiscali resteranno conservate per 10 anni come da legge.'
                : 'Il membro vedrà la richiesta marcata come rifiutata. Annota il motivo per audit.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Note interne (opzionali)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={1000}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTarget(null)}
              disabled={pending}
            >
              Annulla
            </Button>
            <Button
              variant={
                target?.decision === 'processed' ? 'destructive' : 'default'
              }
              onClick={confirm}
              disabled={pending}
            >
              {pending ? 'Elaboro…' : 'Conferma'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
