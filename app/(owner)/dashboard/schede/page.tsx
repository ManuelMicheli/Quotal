/**
 * Workout plans (schede allenamento) — owner index.
 *
 * Lists every plan in the gym, newest first, with a link to the assigned
 * member and quick edit / delete actions. Empty state nudges the trainer to
 * create the first one.
 */
import { ClipboardListIcon, PencilIcon, PlusIcon } from 'lucide-react'
import Link from 'next/link'

import { EmptyState } from '@/components/owner/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/format'
import { getWorkoutPlansList } from '@/lib/queries/owner'

export const dynamic = 'force-dynamic'

export default async function WorkoutPlansPage() {
  const plans = await getWorkoutPlansList()

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Allenamenti</p>
          <h1 className="font-display text-3xl tracking-tight md:text-4xl lg:text-5xl">
            Schede allenamento
          </h1>
        </div>
        <Button asChild>
          <Link href="/dashboard/schede/nuova">
            <PlusIcon className="size-4" />
            Nuova scheda
          </Link>
        </Button>
      </header>

      {plans.length === 0 ? (
        <EmptyState
          icon={ClipboardListIcon}
          title="Nessuna scheda creata"
          description="Crea la prima scheda di allenamento e assegnala a un membro. La vedrà subito nella sua app."
          action={
            <Button asChild>
              <Link href="/dashboard/schede/nuova">
                <PlusIcon className="size-4" />
                Crea scheda
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titolo</TableHead>
                <TableHead>Membro</TableHead>
                <TableHead>Split</TableHead>
                <TableHead>Giorni</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Aggiornata</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => {
                const dayCount = Array.isArray(plan.days)
                  ? plan.days.length
                  : 0
                return (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/schede/${plan.id}`}
                        className="hover:underline"
                      >
                        {plan.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {plan.member ? (
                        <Link
                          href={`/dashboard/membri/${plan.member.id}`}
                          className="hover:underline"
                        >
                          {plan.member.full_name}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {plan.split ?? '—'}
                    </TableCell>
                    <TableCell className="tabular-nums">{dayCount}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          plan.is_active
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-muted text-muted-foreground'
                        }
                      >
                        {plan.is_active ? 'Attiva' : 'Archiviata'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(plan.updated_at, 'short')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/schede/${plan.id}`}>
                          <PencilIcon className="size-3.5" />
                          Apri
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
