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
import {
  ArrowUpRightIcon,
  CalendarIcon,
  CreditCardIcon,
  RepeatIcon,
  TagIcon,
} from 'lucide-react'
import Link from 'next/link'

import { PageHeader } from '@/components/member/page-header'
import { SubscriptionStatusBadge } from '@/components/owner/subscription-status-badge'
import { EmptyState } from '@/components/shared/empty-state'
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
        <TabsList variant="pill" className="w-full md:max-w-md">
          <TabsTrigger value="current" className="flex-1">
            Corrente
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1">
            Storico
          </TabsTrigger>
          {isSuspended ? (
            <TabsTrigger value="suspended" className="flex-1">
              Sospensione
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="current" className="mt-2 space-y-4">
          {data.subscription ? (
            <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
              <section className="ring-elevated relative overflow-hidden rounded-3xl bg-card p-6 md:p-10 lg:col-span-8 lg:p-12">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-60"
                  style={{
                    background:
                      'radial-gradient(closest-side, color-mix(in oklab, var(--accent) 30%, transparent), transparent)',
                  }}
                />
                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="eyebrow">Piano corrente</p>
                      <h2 className="heading-display mt-1 text-3xl md:text-5xl lg:text-6xl">
                        {data.subscription.plan.name}
                      </h2>
                    </div>
                    <SubscriptionStatusBadge status={data.subscription.status} />
                  </div>

                  <p className="number mt-4 text-3xl font-semibold md:mt-6 md:text-5xl lg:text-6xl">
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
                      value={
                        data.subscription.auto_renew ? 'Automatico' : 'Manuale'
                      }
                    />
                    {data.subscription.payment_method ? (
                      <DetailRow
                        icon={TagIcon}
                        label="Metodo"
                        value={data.subscription.payment_method}
                      />
                    ) : null}
                  </dl>
                </div>
              </section>

              <aside className="ring-soft flex flex-col gap-4 rounded-3xl bg-card p-6 md:p-7 lg:col-span-4">
                <div>
                  <p className="eyebrow">Azioni rapide</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Rinnova o gestisci il metodo di pagamento.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    asChild
                    variant="accent"
                    size="lg"
                    className="w-full rounded-full"
                  >
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
            <div className="ring-soft rounded-3xl bg-card">
              <EmptyState
                title="Nessun abbonamento attivo"
                description="Contatta la palestra per attivarne uno."
              />
            </div>
          )}
        </TabsContent>

        <TabsContent
          value="history"
          className="mt-2 space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 lg:grid-cols-3"
        >
          {history.length === 0 ? (
            <div className="ring-soft rounded-3xl bg-card md:col-span-2 lg:col-span-3">
              <EmptyState title="Nessun abbonamento nello storico." />
            </div>
          ) : (
            history.map((sub) => (
              <article
                key={sub.id}
                className="ring-soft hover-lift rounded-3xl bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{sub.plan.name}</p>
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
              <p className="eyebrow text-warning">Abbonamento sospeso</p>
              <h2 className="heading-display mt-1 text-2xl">In pausa</h2>
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
                        className="text-accent font-medium underline"
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
