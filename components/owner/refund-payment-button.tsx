'use client'

/**
 * Refund a Stripe-backed payment from the dashboard.
 *
 * Confirmation dialog → server action → Stripe API → DB flips on
 * `charge.refunded` webhook.
 */
import { Undo2Icon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import { refundPaymentAction } from '@/app/actions/payments'
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

export function RefundPaymentButton({ paymentId }: { paymentId: string }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()

  function confirm() {
    startTransition(async () => {
      const r = await refundPaymentAction({ payment_id: paymentId })
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success(r.message ?? 'Rimborso richiesto')
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Undo2Icon className="mr-2 size-4" />
          Rimborsa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confermare il rimborso?</DialogTitle>
          <DialogDescription>
            L&apos;importo verrà rimborsato sul metodo di pagamento originale.
            L&apos;abbonamento collegato verrà annullato.
          </DialogDescription>
        </DialogHeader>
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
            {isPending ? 'Richiesta in corso…' : 'Conferma rimborso'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
