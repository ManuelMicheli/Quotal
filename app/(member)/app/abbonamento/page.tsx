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
import Link from 'next/link'

import { PageHeader } from '@/components/member/page-header'
import { SubscriptionStatusBadge } from '@/components/owner/subscription-status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Abbonamento"
        subtitle={data.gym?.name ?? undefined}
        showBack={false}
      />

      <Tabs defaultValue="current" className="w-full">
        <TabsList className="w-full">
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

        <TabsContent value="current" className="space-y-3">
          {data.subscription ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    {data.subscription.plan.name}
                  </CardTitle>
                  <SubscriptionStatusBadge status={data.subscription.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Inizio
                    </p>
                    <p className="font-medium">
                      {formatDate(data.subscription.start_date, 'short')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Scadenza
                    </p>
                    <p className="font-medium">
                      {formatDate(data.subscription.end_date, 'short')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Prezzo
                    </p>
                    <p className="font-medium">
                      {formatCurrency(data.subscription.plan.price_cents)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Rinnovo automatico
                    </p>
                    <p className="font-medium">
                      {data.subscription.auto_renew ? 'Attivo' : 'Disattivato'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                  <Button asChild className="w-full sm:w-auto">
                    <Link href="/app/abbonamento/rinnova">Rinnova ora</Link>
                  </Button>
                  {data.sepaMandate ? (
                    <Button asChild variant="outline" className="w-full sm:w-auto">
                      <Link href="/app/pagamenti/portal">Cambia metodo</Link>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nessun abbonamento attivo. Contatta la palestra per
                attivarne uno.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {history.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nessun abbonamento nello storico.
              </CardContent>
            </Card>
          ) : (
            history.map((sub) => (
              <Card key={sub.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm">{sub.plan.name}</CardTitle>
                    <SubscriptionStatusBadge status={sub.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-xs text-muted-foreground">
                  <p>
                    {formatDate(sub.start_date, 'short')} →{' '}
                    {formatDate(sub.end_date, 'short')}
                  </p>
                  <p>
                    {formatCurrency(sub.plan.price_cents)} ·{' '}
                    {sub.payment_method ?? 'metodo non registrato'}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {isSuspended && data.subscription ? (
          <TabsContent value="suspended" className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Abbonamento sospeso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
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
                <p className="pt-2">
                  Per riattivare, contatta {data.gym?.name ?? 'la palestra'}
                  {data.gym?.phone ? (
                    <>
                      {' '}
                      al{' '}
                      <a
                        href={`tel:${data.gym.phone}`}
                        className="font-medium text-accent underline"
                      >
                        {data.gym.phone}
                      </a>
                    </>
                  ) : null}
                  .
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  )
}
