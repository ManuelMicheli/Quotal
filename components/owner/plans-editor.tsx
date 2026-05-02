'use client'

/**
 * Editor for the gym's subscription plans.
 *
 * Capabilities:
 *   - List existing plans with name, price, duration, active status.
 *   - Toggle active/inactive in place.
 *   - Open a dialog to create a new plan or edit an existing one.
 *
 * Drag-and-drop reordering is left for a follow-up — the server action
 * `reorderPlansAction` is wired and ready (see `app/actions/owner.ts`); the
 * UI here uses up/down buttons to call it. Less polished than @dnd-kit but
 * keeps Phase 04 simple and accessible.
 */
import { ArrowDownIcon, ArrowUpIcon, CreditCardIcon, PencilIcon, PlusIcon } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import {
  createPlanAction,
  reorderPlansAction,
  togglePlanActiveAction,
  updatePlanAction,
} from '@/app/actions/owner'
import { PlanDialog } from '@/components/owner/plan-dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { SubscriptionPlan } from '@/lib/domain-types'
import { formatCurrency } from '@/lib/format'
import type { PlanInput } from '@/lib/validations/owner'

export function PlansEditor({ plans }: { plans: SubscriptionPlan[] }) {
  const [isPending, startTransition] = React.useTransition()
  const [editing, setEditing] = React.useState<
    | { mode: 'create' }
    | { mode: 'edit'; plan: SubscriptionPlan }
    | null
  >(null)

  const ordered = React.useMemo(
    () => [...plans].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [plans],
  )

  function toggleActive(plan: SubscriptionPlan) {
    startTransition(async () => {
      const r = await togglePlanActiveAction(plan.id)
      if (!r.ok) toast.error(r.error)
    })
  }

  function move(plan: SubscriptionPlan, direction: -1 | 1) {
    const ids = ordered.map((p) => p.id)
    const idx = ids.indexOf(plan.id)
    const target = idx + direction
    if (target < 0 || target >= ids.length) return
    const next = [...ids]
    const [item] = next.splice(idx, 1)
    next.splice(target, 0, item!)
    startTransition(async () => {
      const r = await reorderPlansAction(next)
      if (!r.ok) toast.error(r.error)
    })
  }

  async function onSave(values: PlanInput): Promise<boolean> {
    if (!editing) return false
    const r =
      editing.mode === 'create'
        ? await createPlanAction(values)
        : await updatePlanAction(editing.plan.id, values)
    if (!r.ok) {
      toast.error(r.error)
      return false
    }
    toast.success(r.message ?? 'Salvato.')
    setEditing(null)
    return true
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button onClick={() => setEditing({ mode: 'create' })}>
          <PlusIcon className="size-4" />
          Nuovo piano
        </Button>
      </div>

      {ordered.length === 0 ? (
        <EmptyState
          variant="bordered"
          icon={<CreditCardIcon />}
          title="Nessun piano configurato"
          description="Crea il primo piano per iniziare ad accettare iscrizioni."
          action={
            <Button onClick={() => setEditing({ mode: 'create' })}>
              <PlusIcon className="size-4" />
              Crea primo piano
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-1)]">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-20">Ordine</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Durata</TableHead>
                <TableHead className="text-right">Prezzo</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="w-12 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordered.map((plan, idx) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        disabled={idx === 0 || isPending}
                        onClick={() => move(plan, -1)}
                        aria-label="Sposta su"
                      >
                        <ArrowUpIcon />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        disabled={idx === ordered.length - 1 || isPending}
                        onClick={() => move(plan, 1)}
                        aria-label="Sposta giù"
                      >
                        <ArrowDownIcon />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold tracking-tight">
                        {plan.name}
                      </span>
                      {plan.description ? (
                        <span className="text-xs text-muted-foreground">
                          {plan.description}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="tabular text-[0.8125rem]">
                    {plan.duration_days} giorni
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="number font-semibold">
                      {formatCurrency(plan.price_cents)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={plan.is_active}
                        onCheckedChange={() => toggleActive(plan)}
                        disabled={isPending}
                        aria-label={
                          plan.is_active ? 'Disattiva piano' : 'Attiva piano'
                        }
                      />
                      <Badge variant={plan.is_active ? 'success' : 'secondary'}>
                        {plan.is_active ? 'Attivo' : 'Inattivo'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setEditing({ mode: 'edit', plan })}
                      aria-label="Modifica piano"
                    >
                      <PencilIcon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PlanDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        plan={editing?.mode === 'edit' ? editing.plan : null}
        onSave={onSave}
      />
    </div>
  )
}
