'use client'

/**
 * "Chiudi cassa" client component.
 *
 * Fires `closeCashAction` for the displayed day and (on success) opens the
 * resulting PDF in a new tab.
 */
import { LockIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import { closeCashAction } from '@/app/actions/payments'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export function CloseCashButton({
  closeDate,
  alreadyClosed,
}: {
  closeDate: string
  alreadyClosed: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [notes, setNotes] = React.useState('')
  const [isPending, startTransition] = React.useTransition()

  function confirm() {
    startTransition(async () => {
      const res = await closeCashAction({
        close_date: closeDate,
        notes: notes.trim() || undefined,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(res.message ?? 'Chiusura cassa registrata.', {
        action: res.data?.pdfUrl
          ? {
              label: 'Apri PDF',
              onClick: () =>
                window.open(res.data!.pdfUrl, '_blank', 'noopener'),
            }
          : undefined,
      })
      if (res.data?.pdfUrl) {
        window.open(res.data.pdfUrl, '_blank', 'noopener')
      }
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <LockIcon className="size-4" />
          {alreadyClosed ? 'Rigenera chiusura' : 'Chiudi cassa'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {alreadyClosed
              ? 'Rigenera chiusura cassa'
              : 'Chiudi cassa giornata'}
          </DialogTitle>
          <DialogDescription>
            Verrà generato un report PDF con il riepilogo del giorno e salvato
            negli archivi della palestra.
            {alreadyClosed
              ? ' Una chiusura per oggi esiste già: la rigenerazione la sovrascrive.'
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor="close-notes">Note (opzionali)</Label>
          <Textarea
            id="close-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Es. ammanco di cassa, segnalazioni, etc."
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Annulla
          </Button>
          <Button onClick={confirm} disabled={isPending}>
            {isPending ? 'Generazione…' : 'Conferma e genera PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
