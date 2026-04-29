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
import { ArrowDownIcon, ArrowUpIcon, PencilIcon, PlusIcon } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import {
  createPlanAction,
  reorderPlansAction,
  togglePlanActiveAction,
  updatePlanAction,
} from '@/app/actions/owner'
import { PlanDialog } from '@/components/owner/plan-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
    <>
      <div className="flex items-center justify-end">
        <Button onClick={() => setEditing({ mode: 'create' })}>
          <PlusIcon className="size-4" />
          Nuovo piano
        </Button>
      </div>

      {ordered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nessun piano configurato. Crea il primo per iniziare ad accettare
            iscrizioni.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16" />
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
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={idx === 0 || isPending}
                        onClick={() => move(plan, -1)}
                        aria-label="Sposta su"
                        className="size-7"
                      >
                        <ArrowUpIcon className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={idx === ordered.length - 1 || isPending}
                        onClick={() => move(plan, 1)}
                        aria-label="Sposta giù"
                        className="size-7"
                      >
                        <ArrowDownIcon className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{plan.name}</span>
                      {plan.description ? (
                        <span className="text-xs text-muted-foreground">
                          {plan.description}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {plan.duration_days} giorni
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCurrency(plan.price_cents)}
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
                      <Badge
                        variant="outline"
                        className={
                          plan.is_active
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-muted text-muted-foreground'
                        }
                      >
                        {plan.is_active ? 'Attivo' : 'Inattivo'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditing({ mode: 'edit', plan })}
                      aria-label="Modifica piano"
                    >
                      <PencilIcon className="size-4" />
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
    </>
  )
}
