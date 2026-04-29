'use client'

/**
 * "Registra pagamento contanti" dialog.
 *
 * Two modes:
 *   - `member` mode: the owner already opened a specific member's profile,
 *     so the form skips the member picker and uses the prop.
 *   - `picker` mode: launched from the dashboard quick-action; the owner
 *     searches a member first, then fills the payment form.
 *
 * On submit the dialog calls `registerCashPaymentAction` and (if a receipt
 * URL came back) opens it in a new tab so the printable PDF is one click
 * away.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckIcon, PlusIcon, ReceiptIcon, SearchIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { toast } from 'sonner'

import { registerCashPaymentAction } from '@/app/actions/payments'
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { Profile, SubscriptionPlan } from '@/lib/domain-types'
import { formatCurrency } from '@/lib/format'
import {
  registerCashPaymentSchema,
  type RegisterCashPaymentInput,
} from '@/lib/validations/payments'

type Mode =
  | { kind: 'member'; member: Pick<Profile, 'id' | 'full_name' | 'email'> }
  | { kind: 'picker' }

type MemberSearchResult = Pick<Profile, 'id' | 'full_name' | 'email' | 'phone'>

export function CashPaymentDialog({
  plans,
  mode,
  trigger,
}: {
  plans: SubscriptionPlan[]
  mode: Mode
  /** Optional custom trigger button — defaults to a primary "Registra pagamento contanti" CTA. */
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const [picked, setPicked] = React.useState<MemberSearchResult | null>(
    mode.kind === 'member'
      ? {
          id: mode.member.id,
          full_name: mode.member.full_name,
          email: mode.member.email,
          phone: null,
        }
      : null,
  )

  function reset() {
    setPicked(
      mode.kind === 'member'
        ? {
            id: mode.member.id,
            full_name: mode.member.full_name,
            email: mode.member.email,
            phone: null,
          }
        : null,
    )
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
        {trigger ?? (
          <Button>
            <PlusIcon className="size-4" />
            Registra pagamento contanti
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registra pagamento</DialogTitle>
          <DialogDescription>
            Pagamento incassato in palestra (contanti o bonifico). Verrà
            generata la ricevuta PDF.
          </DialogDescription>
        </DialogHeader>

        {mode.kind === 'picker' && !picked ? (
          <MemberPicker onPick={setPicked} />
        ) : picked ? (
          <PaymentForm
            plans={plans}
            member={picked}
            onSuccess={() => {
              setOpen(false)
              reset()
            }}
            onChangeMember={
              mode.kind === 'picker' ? () => setPicked(null) : undefined
            }
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Member picker (autocomplete via server search)
// ---------------------------------------------------------------------------

function MemberPicker({
  onPick,
}: {
  onPick: (m: MemberSearchResult) => void
}) {
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<MemberSearchResult[]>([])
  const [isPending, startTransition] = React.useTransition()

  const trimmed = query.trim()
  const tooShort = trimmed.length < 2

  React.useEffect(() => {
    if (tooShort) return
    let cancelled = false
    const handle = setTimeout(() => {
      startTransition(async () => {
        const url = `/api/owner/members/search?q=${encodeURIComponent(trimmed)}`
        const res = await fetch(url, { method: 'GET' })
        if (!res.ok || cancelled) return
        const json = (await res.json()) as { members: MemberSearchResult[] }
        if (!cancelled) setResults(json.members)
      })
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [trimmed, tooShort])

  // Effective results: empty when the query is too short (computed, not stored).
  const visibleResults = tooShort ? [] : results

  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        <Label>Cerca membro</Label>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Nome, email o telefono"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
      </div>
      <div className="max-h-72 overflow-y-auto rounded-md border border-border">
        {isPending ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">Cerco…</p>
        ) : visibleResults.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">
            {tooShort
              ? 'Inserisci almeno 2 caratteri.'
              : 'Nessun membro trovato.'}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {visibleResults.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => onPick(m)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{m.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.email}
                    </p>
                  </div>
                  <CheckIcon className="size-4 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Payment form
// ---------------------------------------------------------------------------

function PaymentForm({
  plans,
  member,
  onSuccess,
  onChangeMember,
}: {
  plans: SubscriptionPlan[]
  member: MemberSearchResult
  onSuccess: () => void
  onChangeMember?: () => void
}) {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)
  const defaultPlan = plans[0]

  const form = useForm<RegisterCashPaymentInput>({
    resolver: zodResolver(registerCashPaymentSchema) as unknown as Resolver<
      RegisterCashPaymentInput
    >,
    defaultValues: {
      member_id: member.id,
      plan_id: defaultPlan?.id ?? '',
      start_date: today,
      amount_cents: defaultPlan?.price_cents ?? 0,
      payment_method: 'cash',
      notes: undefined,
      emit_invoice: false,
      invoice_fiscal_code: undefined,
    },
  })

  const watchedPlanId = form.watch('plan_id')
  const watchedAmount = form.watch('amount_cents')
  const emitInvoice = form.watch('emit_invoice')

  // When the user changes plan, sync the amount field to the plan price (only
  // if the user hasn't manually edited it).
  const userEditedAmountRef = React.useRef(false)
  React.useEffect(() => {
    if (userEditedAmountRef.current) return
    const plan = plans.find((p) => p.id === watchedPlanId)
    if (plan) form.setValue('amount_cents', plan.price_cents)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedPlanId])

  const [isPending, startTransition] = React.useTransition()

  function onSubmit(values: RegisterCashPaymentInput) {
    startTransition(async () => {
      const result = await registerCashPaymentAction(values)
      if (!result.ok) {
        if (result.fieldErrors) {
          for (const [field, msg] of Object.entries(result.fieldErrors)) {
            form.setError(field as keyof RegisterCashPaymentInput, {
              message: msg,
            })
          }
        }
        toast.error(result.error)
        return
      }
      toast.success(result.message ?? 'Pagamento registrato.', {
        description: result.data?.receipt_url
          ? 'Ricevuta PDF generata.'
          : 'Ricevuta in fase di generazione.',
        action: result.data?.receipt_url
          ? {
              label: 'Scarica ricevuta',
              onClick: () =>
                window.open(result.data!.receipt_url!, '_blank', 'noopener'),
            }
          : undefined,
      })
      // Auto-open the PDF if available.
      if (result.data?.receipt_url) {
        window.open(result.data.receipt_url, '_blank', 'noopener')
      }
      onSuccess()
      router.refresh()
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{member.full_name}</p>
            <p className="truncate text-xs text-muted-foreground">{member.email}</p>
          </div>
          {onChangeMember ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onChangeMember}
            >
              Cambia
            </Button>
          ) : null}
        </div>

        <FormField
          control={form.control}
          name="plan_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Piano</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona un piano" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · {p.duration_days} gg ·{' '}
                      {formatCurrency(p.price_cents)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data inizio</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="amount_cents"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Importo (€)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={(watchedAmount / 100).toFixed(2)}
                    onChange={(e) => {
                      userEditedAmountRef.current = true
                      const euros = Number(e.target.value)
                      const cents = Math.round((Number.isFinite(euros) ? euros : 0) * 100)
                      field.onChange(cents)
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Auto-compilato dal piano. Modifica per casi speciali.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="payment_method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Metodo</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="cash">Contanti</SelectItem>
                  <SelectItem value="bank_transfer">Bonifico</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note (opzionali)</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  {...field}
                  value={field.value ?? ''}
                  placeholder="Es. acconto, sconto, etc."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-3 rounded-md border border-border bg-muted/30 p-3">
          <FormField
            control={form.control}
            name="emit_invoice"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-3 space-y-0">
                <div>
                  <FormLabel className="text-sm">Emetti fattura</FormLabel>
                  <FormDescription className="text-xs">
                    In aggiunta alla ricevuta. Richiede codice fiscale.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {emitInvoice ? (
            <>
              <FormField
                control={form.control}
                name="invoice_fiscal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Codice fiscale</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        placeholder="RSSMRA85M01H501Z"
                        maxLength={16}
                        className="font-mono uppercase"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {watchedAmount > 7747 ? (
                <p className="text-xs text-warning">
                  Importo superiore a € 77,47: verrà inclusa la marca da
                  bollo virtuale (€ 2,00).
                </p>
              ) : null}
            </>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              'Registro…'
            ) : (
              <>
                <ReceiptIcon className="size-4" />
                Conferma e stampa ricevuta
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
