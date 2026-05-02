/**
 * Workout plans (schede allenamento) — owner index.
 *
 * Lists every plan in the gym, newest first, with a link to the assigned
 * member and quick edit / delete actions. Empty state nudges the trainer to
 * create the first one.
 */
import { ClipboardListIcon, PencilIcon, PlusIcon } from 'lucide-react'
import Link from 'next/link'

import { EmptyState } from '@/components/shared/empty-state'
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderHeading,
} from '@/components/shared/page-header'
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
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Allenamenti</PageHeaderEyebrow>
          <PageHeaderHeading>Schede allenamento</PageHeaderHeading>
          <PageHeaderDescription>
            Crea e assegna programmi personalizzati. I membri li vedranno
            nella loro app.
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button asChild>
            <Link href="/dashboard/schede/nuova">
              <PlusIcon className="size-4" />
              Nuova scheda
            </Link>
          </Button>
        </PageHeaderActions>
      </PageHeader>

      {plans.length === 0 ? (
        <EmptyState
          variant="bordered"
          icon={<ClipboardListIcon />}
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
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-1)]">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
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
                const dayCount = Array.isArray(plan.days) ? plan.days.length : 0
                return (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/schede/${plan.id}`}
                        className="font-semibold tracking-tight transition-colors hover:text-accent"
                      >
                        {plan.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {plan.member ? (
                        <Link
                          href={`/dashboard/membri/${plan.member.id}`}
                          className="text-[0.8125rem] transition-colors hover:text-accent hover:underline"
                        >
                          {plan.member.full_name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-[0.8125rem] text-muted-foreground">
                      {plan.split ?? '—'}
                    </TableCell>
                    <TableCell className="tabular text-[0.8125rem]">
                      {dayCount}
                    </TableCell>
                    <TableCell>
                      {plan.is_active ? (
                        <Badge variant="success">Attiva</Badge>
                      ) : (
                        <Badge variant="secondary">Archiviata</Badge>
                      )}
                    </TableCell>
                    <TableCell className="tabular text-[0.8125rem] text-muted-foreground">
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
