'use client'

/**
 * Inline action panel for a member: Renew / Suspend / Resume / Edit.
 *
 * Uses three dialogs whose open/close state is driven by the URL
 * `?action=renew|suspend|resume|edit` so links from elsewhere in the app
 * (e.g. dashboard quick-action) can deep-link directly.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { toast } from 'sonner'

import {
  renewSubscriptionAction,
  resumeSubscriptionAction,
  suspendSubscriptionAction,
} from '@/app/actions/owner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { SubscriptionPlan, SubscriptionWithPlan } from '@/lib/domain-types'
import {
  renewSubscriptionSchema,
  suspendSubscriptionSchema,
  type RenewSubscriptionInput,
  type SuspendSubscriptionInput,
} from '@/lib/validations/owner'

type Action = 'renew' | 'suspend' | 'resume' | null

export function MemberActions({
  memberId,
  activeSubscription,
  plans,
}: {
  memberId: string
  activeSubscription: SubscriptionWithPlan | null
  plans: SubscriptionPlan[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawAction = searchParams.get('action')
  const action: Action =
    rawAction === 'renew' || rawAction === 'suspend' || rawAction === 'resume'
      ? rawAction
      : null

  function clearAction() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('action')
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : `?`)
  }

  function setAction(next: Exclude<Action, null>) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('action', next)
    router.replace(`?${params.toString()}`)
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setAction('renew')}>Rinnova</Button>
        {activeSubscription?.status === 'active' ? (
          <Button variant="outline" onClick={() => setAction('suspend')}>
            Sospendi
          </Button>
        ) : null}
        {activeSubscription?.status === 'suspended' ? (
          <Button variant="outline" onClick={() => setAction('resume')}>
            Riattiva
          </Button>
        ) : null}
      </div>

      <RenewDialog
        open={action === 'renew'}
        onOpenChange={(o) => (o ? setAction('renew') : clearAction())}
        memberId={memberId}
        plans={plans}
        activeSubscription={activeSubscription}
      />
      <SuspendDialog
        open={action === 'suspend'}
        onOpenChange={(o) => (o ? setAction('suspend') : clearAction())}
        subscription={activeSubscription}
      />
      <ResumeDialog
        open={action === 'resume'}
        onOpenChange={(o) => (o ? setAction('resume') : clearAction())}
        subscription={activeSubscription}
      />
    </>
  )
}

function RenewDialog({
  open,
  onOpenChange,
  memberId,
  plans,
  activeSubscription,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  memberId: string
  plans: SubscriptionPlan[]
  activeSubscription: SubscriptionWithPlan | null
}) {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)
  const startDefault =
    activeSubscription &&
    activeSubscription.status === 'active' &&
    activeSubscription.end_date >= today
      ? activeSubscription.end_date
      : today

  const form = useForm<RenewSubscriptionInput>({
    resolver: zodResolver(renewSubscriptionSchema) as unknown as Resolver<
      RenewSubscriptionInput
    >,
    defaultValues: {
      member_id: memberId,
      plan_id: activeSubscription?.plan_id ?? plans[0]?.id ?? '',
      payment_method: 'cash',
      start_date: startDefault,
    },
  })

  React.useEffect(() => {
    if (open) {
      form.reset({
        member_id: memberId,
        plan_id: activeSubscription?.plan_id ?? plans[0]?.id ?? '',
        payment_method: 'cash',
        start_date: startDefault,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const [isPending, startTransition] = React.useTransition()

  function onSubmit(values: RenewSubscriptionInput) {
    startTransition(async () => {
      const result = await renewSubscriptionAction(values)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(result.message ?? 'Abbonamento rinnovato.')
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rinnova abbonamento</DialogTitle>
          <DialogDescription>
            Crea una nuova subscription per questo membro.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4"
          >
            <FormField
              control={form.control}
              name="plan_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Piano</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona piano" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {plans.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} · {p.duration_days} gg
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Metodo pagamento</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">Contanti</SelectItem>
                      <SelectItem value="bank_transfer">Bonifico</SelectItem>
                      <SelectItem value="card">Carta (Stripe)</SelectItem>
                      <SelectItem value="sepa">SEPA</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data inizio</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Conferma…' : 'Conferma rinnovo'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function SuspendDialog({
  open,
  onOpenChange,
  subscription,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  subscription: SubscriptionWithPlan | null
}) {
  const router = useRouter()
  const form = useForm<SuspendSubscriptionInput>({
    resolver: zodResolver(suspendSubscriptionSchema) as unknown as Resolver<
      SuspendSubscriptionInput
    >,
    defaultValues: {
      subscription_id: subscription?.id ?? '',
      reason: '',
    },
  })

  React.useEffect(() => {
    if (open && subscription) {
      form.reset({ subscription_id: subscription.id, reason: '' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, subscription?.id])

  const [isPending, startTransition] = React.useTransition()

  function onSubmit(values: SuspendSubscriptionInput) {
    startTransition(async () => {
      const result = await suspendSubscriptionAction(values)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(result.message ?? 'Abbonamento sospeso.')
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sospendi abbonamento</DialogTitle>
          <DialogDescription>
            La sospensione mette in pausa il calcolo della scadenza. Quando
            riattiverai l&apos;abbonamento, i giorni di pausa verranno
            aggiunti alla data di fine.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo (opzionale)</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Annulla
              </Button>
              <Button type="submit" variant="destructive" disabled={isPending || !subscription}>
                {isPending ? 'Sospendo…' : 'Sospendi'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function ResumeDialog({
  open,
  onOpenChange,
  subscription,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  subscription: SubscriptionWithPlan | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  function onConfirm() {
    if (!subscription) return
    startTransition(async () => {
      const result = await resumeSubscriptionAction({
        subscription_id: subscription.id,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(result.message ?? 'Abbonamento riattivato.')
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Riattiva abbonamento</DialogTitle>
          <DialogDescription>
            La data di fine verrà prolungata del numero di giorni in cui
            l&apos;abbonamento è rimasto sospeso.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Annulla
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isPending || !subscription}>
            {isPending ? 'Riattivo…' : 'Riattiva'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
