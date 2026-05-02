/**
 * Member subscription detail page — `/app/abbonamento`.
 *
 * Three tabs (shadcn Tabs):
 *   - Corrente: current plan + price + payment method + CTAs
 *   - Storico: chronological list of all subscriptions
 *   - Sospensione: visible only when the active subscription is suspended
 *
 * All data fetched server-side. Tabs are client-only because shadcn's
 * Tabs uses Radix Tabs which needs interactivity.
 */
import { ArrowUpRightIcon, CalendarIcon, CreditCardIcon, RepeatIcon, TagIcon } from 'lucide-react'
import Link from 'next/link'

import { PageHeader } from '@/components/member/page-header'
import { SubscriptionStatusBadge } from '@/components/owner/subscription-status-badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { requireMember } from '@/lib/auth'
import { SUBSCRIPTION_STATUS } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/format'
import {
  getMemberActiveSuspension,
  getMemberHomeData,
  getMemberSubscriptionHistory,
} from '@/lib/queries/member'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Abbonamento',
}

export default async function MemberSubscriptionPage() {
  const profile = await requireMember()
  const [data, history] = await Promise.all([
    getMemberHomeData(profile.id),
    getMemberSubscriptionHistory(profile.id),
  ])

  const isSuspended =
    data.subscription?.status === SUBSCRIPTION_STATUS.SUSPENDED
  const suspension =
    isSuspended && data.subscription
      ? await getMemberActiveSuspension(data.subscription.id)
      : null

  return (
    <div className="flex flex-col gap-5 md:gap-8">
      <PageHeader
        title="Abbonamento"
        subtitle={data.gym?.name ?? undefined}
        showBack={false}
      />

      <Tabs defaultValue="current" className="w-full">
        <TabsList className="w-full rounded-full bg-muted/60 p-1 md:max-w-md">
          <TabsTrigger value="current" className="flex-1 rounded-full">
            Corrente
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 rounded-full">
            Storico
          </TabsTrigger>
          {isSuspended ? (
            <TabsTrigger value="suspended" className="flex-1 rounded-full">
              Sospensione
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="current" className="mt-2 space-y-4">
          {data.subscription ? (
            <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
              <section className="ring-elevated relative overflow-hidden rounded-[28px] bg-card p-6 md:p-10 lg:col-span-8 lg:p-12">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground md:text-xs">
                      Piano corrente
                    </p>
                    <h2 className="mt-1 font-display text-3xl tracking-tight md:text-5xl lg:text-6xl">
                      {data.subscription.plan.name}
                    </h2>
                  </div>
                  <SubscriptionStatusBadge status={data.subscription.status} />
                </div>

                <p className="tabular mt-4 text-3xl font-semibold tracking-tight md:mt-6 md:text-5xl lg:text-6xl">
                  {formatCurrency(data.subscription.plan.price_cents)}
                </p>

                <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-border/60 pt-5 md:mt-10 md:grid-cols-4 md:gap-x-8 md:pt-7">
                  <DetailRow
                    icon={CalendarIcon}
                    label="Inizio"
                    value={formatDate(data.subscription.start_date, 'short')}
                  />
                  <DetailRow
                    icon={CalendarIcon}
                    label="Scadenza"
                    value={formatDate(data.subscription.end_date, 'short')}
                  />
                  <DetailRow
                    icon={RepeatIcon}
                    label="Rinnovo"
                    value={data.subscription.auto_renew ? 'Automatico' : 'Manuale'}
                  />
                  {data.subscription.payment_method ? (
                    <DetailRow
                      icon={TagIcon}
                      label="Metodo"
                      value={data.subscription.payment_method}
                    />
                  ) : null}
                </dl>
              </section>

              <aside className="ring-soft flex flex-col gap-4 rounded-3xl bg-card p-6 md:p-7 lg:col-span-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground md:text-xs">
                    Azioni rapide
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Rinnova o gestisci il metodo di pagamento.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button asChild size="lg" className="w-full rounded-full">
                    <Link href="/app/abbonamento/rinnova">
                      Rinnova ora
                      <ArrowUpRightIcon size={16} />
                    </Link>
                  </Button>
                  {data.sepaMandate ? (
                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="w-full rounded-full"
                    >
                      <Link href="/app/pagamenti/portal">
                        <CreditCardIcon size={16} />
                        Cambia metodo
                      </Link>
                    </Button>
                  ) : null}
                </div>
                {data.sepaMandate ? (
                  <div className="rounded-2xl bg-muted/40 p-4 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">SEPA attivo</p>
                    <p className="tabular mt-1">
                      IBAN ****{data.sepaMandate.iban_last4}
                    </p>
                  </div>
                ) : null}
              </aside>
            </div>
          ) : (
            <EmptyState>
              Nessun abbonamento attivo. Contatta la palestra per attivarne uno.
            </EmptyState>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-2 space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 lg:grid-cols-3">
          {history.length === 0 ? (
            <EmptyState>Nessun abbonamento nello storico.</EmptyState>
          ) : (
            history.map((sub) => (
              <article
                key={sub.id}
                className="ring-soft rounded-3xl bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {sub.plan.name}
                    </p>
                    <p className="tabular mt-0.5 text-xs text-muted-foreground">
                      {formatDate(sub.start_date, 'short')} →{' '}
                      {formatDate(sub.end_date, 'short')}
                    </p>
                  </div>
                  <SubscriptionStatusBadge status={sub.status} />
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="tabular font-medium text-foreground">
                    {formatCurrency(sub.plan.price_cents)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{sub.payment_method ?? 'metodo non registrato'}</span>
                </div>
              </article>
            ))
          )}
        </TabsContent>

        {isSuspended && data.subscription ? (
          <TabsContent value="suspended" className="mt-2 space-y-3">
            <section className="ring-soft rounded-3xl bg-card p-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-warning">
                Abbonamento sospeso
              </p>
              <h2 className="mt-1 font-display text-2xl tracking-tight">
                In pausa
              </h2>
              <div className="mt-4 space-y-2 text-sm">
                {suspension ? (
                  <>
                    <p className="text-muted-foreground">
                      Sospeso dal{' '}
                      <span className="text-foreground">
                        {formatDate(suspension.suspended_at, 'long')}
                      </span>
                    </p>
                    {suspension.reason ? (
                      <p>
                        <span className="text-muted-foreground">Motivo: </span>
                        {suspension.reason}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    L&apos;abbonamento risulta sospeso.
                  </p>
                )}
                <p className="pt-2 text-muted-foreground">
                  Per riattivare contatta {data.gym?.name ?? 'la palestra'}
                  {data.gym?.phone ? (
                    <>
                      {' '}
                      al{' '}
                      <a
                        href={`tel:${data.gym.phone}`}
                        className="font-medium text-[color:var(--accent)] underline"
                      >
                        {data.gym.phone}
                      </a>
                    </>
                  ) : null}
                  .
                </p>
              </div>
            </section>
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </dt>
        <dd className="mt-0.5 truncate text-sm font-medium">{value}</dd>
      </div>
    </div>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="ring-soft rounded-3xl bg-card px-5 py-12 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}
