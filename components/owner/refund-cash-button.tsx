'use client'

/**
 * Refund a cash / bank-transfer payment.
 *
 * Calls `refundCashPaymentAction` which inserts a negative-amount payment
 * row, marks the original as refunded, and rolls back the subscription
 * end_date. No external network call (unlike the Stripe refund).
 */
import { Undo2Icon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import { refundCashPaymentAction } from '@/app/actions/payments'
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

export function RefundCashButton({ paymentId }: { paymentId: string }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [reason, setReason] = React.useState('')
  const [isPending, startTransition] = React.useTransition()

  function confirm() {
    startTransition(async () => {
      const r = await refundCashPaymentAction({
        payment_id: paymentId,
        reason: reason.trim() || undefined,
      })
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success(r.message ?? 'Rimborso registrato.')
      setOpen(false)
      setReason('')
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Undo2Icon className="size-4" />
          Storna
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stornare il pagamento?</DialogTitle>
          <DialogDescription>
            Verrà registrata una nota di rimborso con importo negativo. La
            scadenza dell&apos;abbonamento collegato verrà arretrata della
            durata del piano.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="refund-reason">Motivo (opzionale)</Label>
          <Textarea
            id="refund-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Es. errore di registrazione, recesso entro 14 giorni…"
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
          <Button
            variant="destructive"
            onClick={confirm}
            disabled={isPending}
          >
            {isPending ? 'Storno…' : 'Conferma storno'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
