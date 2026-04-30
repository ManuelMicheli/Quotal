'use client'

/**
 * GDPR self-service actions for the member profile page.
 *
 * Two operations:
 *   1. Esporta i miei dati (Art. 20 portability) — triggers
 *      `exportMyDataAction`, then shows the signed URL plus a copy/download
 *      shortcut. Link is valid for 24h.
 *   2. Richiedi cancellazione (Art. 17) — opens a small confirm dialog with
 *      an optional motivation, then queues a deletion request the titolare
 *      will process within 30 days.
 *
 * Errors and successes funnel through `sonner` toasts (already wired in the
 * member layout via `<Toaster />`).
 */
import { DownloadIcon, Trash2Icon } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import {
  exportMyDataAction,
  requestAccountDeletionAction,
} from '@/app/actions/legal'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

export function PrivacyActions() {
  const [exportPending, startExportTransition] = useTransition()
  const [deletePending, startDeleteTransition] = useTransition()
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [deletionDialogOpen, setDeletionDialogOpen] = useState(false)
  const [reason, setReason] = useState('')

  function onExportClick() {
    setDownloadUrl(null)
    startExportTransition(async () => {
      const result = await exportMyDataAction()
      if (result.ok && result.data) {
        setDownloadUrl(result.data.downloadUrl)
        toast.success(result.message ?? 'Esportazione pronta.')
      } else if (!result.ok) {
        toast.error(result.error)
      }
    })
  }

  function onDeletionConfirm() {
    startDeleteTransition(async () => {
      const result = await requestAccountDeletionAction({
        reason: reason.trim() || undefined,
      })
      if (result.ok) {
        toast.success(result.message ?? 'Richiesta inviata.')
        setDeletionDialogOpen(false)
        setReason('')
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={onExportClick}
          disabled={exportPending}
        >
          <DownloadIcon size={16} />
          {exportPending ? 'Preparazione…' : 'Esporta i miei dati'}
        </Button>
        {downloadUrl ? (
          <a
            href={downloadUrl}
            className="text-xs text-accent underline"
            download
            rel="noreferrer noopener"
          >
            Scarica il file ZIP (link valido 24h)
          </a>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Riceverai un archivio ZIP con tutti i dati che Quotal detiene su di
          te (profilo, abbonamenti, pagamenti, accessi).
        </p>
      </div>

      <Dialog open={deletionDialogOpen} onOpenChange={setDeletionDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-destructive hover:text-destructive"
          >
            <Trash2Icon size={16} />
            Richiedi cancellazione account
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancellare il tuo account</DialogTitle>
            <DialogDescription>
              La richiesta verrà processata entro 30 giorni dal titolare,
              come previsto dal GDPR. Il profilo verrà anonimizzato. Le
              ricevute fiscali sono conservate per 10 anni come richiesto
              dalla legge italiana.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label
              htmlFor="deletion-reason"
              className="text-sm font-medium text-foreground"
            >
              Motivo (opzionale)
            </label>
            <Textarea
              id="deletion-reason"
              maxLength={1000}
              placeholder="Aiutaci a capire (facoltativo)…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletionDialogOpen(false)}
              disabled={deletePending}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={onDeletionConfirm}
              disabled={deletePending}
            >
              {deletePending ? 'Invio…' : 'Conferma richiesta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
