'use client'

/**
 * "Invia link di pagamento" dialog.
 *
 * Owner picks a plan; we create a `payment_sessions` row server-side and
 * surface the public URL. Email delivery is Phase 09 — for now the URL is
 * shown with a copy button.
 */
import { CheckIcon, CopyIcon, LinkIcon } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import { createPaymentSessionAction } from '@/app/actions/payments'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SubscriptionPlan } from '@/lib/domain-types'
import { formatCurrency } from '@/lib/format'

export function SendPayLinkDialog({
  memberId,
  plans,
}: {
  memberId: string
  plans: SubscriptionPlan[]
}) {
  const [open, setOpen] = React.useState(false)
  const [planId, setPlanId] = React.useState<string>(plans[0]?.id ?? '')
  const [link, setLink] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()

  function reset() {
    setLink(null)
    setCopied(false)
    setPlanId(plans[0]?.id ?? '')
  }

  function generate() {
    if (!planId) {
      toast.error('Seleziona un piano')
      return
    }
    startTransition(async () => {
      const r = await createPaymentSessionAction({
        member_id: memberId,
        plan_id: planId,
      })
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      setLink(r.data!.paymentUrl)
      toast.success('Link di pagamento creato')
    })
  }

  async function copy() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        setOpen(o)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <LinkIcon className="mr-2 size-4" />
          Invia link pagamento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link di pagamento</DialogTitle>
          <DialogDescription>
            Genera un link che il membro può aprire (anche senza login) per
            pagare con carta o autorizzare un addebito SEPA.
          </DialogDescription>
        </DialogHeader>

        {!link ? (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Piano</Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona piano" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · {formatCurrency(p.price_cents)} ·{' '}
                      {p.duration_days} gg
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Il link scade dopo 7 giorni se non utilizzato.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            <Label>URL del link</Label>
            <div className="flex gap-2">
              <Input value={link} readOnly className="font-mono text-xs" />
              <Button
                variant="outline"
                size="icon"
                aria-label="Copia link"
                onClick={copy}
              >
                {copied ? (
                  <CheckIcon className="size-4 text-emerald-600" />
                ) : (
                  <CopyIcon className="size-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Inviai il link al membro via WhatsApp o email. La consegna
              automatica via email arriverà nella Fase 09.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset()
              setOpen(false)
            }}
            disabled={isPending}
          >
            Chiudi
          </Button>
          {!link ? (
            <Button onClick={generate} disabled={isPending || !planId}>
              {isPending ? 'Creazione...' : 'Genera link'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
