/**
 * Member detail — server component with tab-driven layout.
 *
 * Tab content is rendered inline (no client tab data fetching). The member
 * actions (renew/suspend/resume) live in a client component that reads
 * `?action=` from the URL.
 */
import { AlertTriangleIcon, DownloadIcon, MailIcon, PhoneIcon } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { CashPaymentDialog } from '@/components/owner/cash-payment-dialog'
import { MemberActions } from '@/components/owner/member-actions'
import { MemberForm } from '@/components/owner/member-form'
import { PaymentMethodBadge } from '@/components/owner/payment-method-badge'
import { RefundCashButton } from '@/components/owner/refund-cash-button'
import { RefundPaymentButton } from '@/components/owner/refund-payment-button'
import { SendPayLinkDialog } from '@/components/owner/send-pay-link-dialog'
import {
  PaymentStatusBadge,
  SubscriptionStatusBadge,
} from '@/components/owner/subscription-status-badge'
import { TriggerRenewalButton } from '@/components/owner/trigger-renewal-button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  getActiveSubscriptionPlans,
  getMemberDetail,
} from '@/lib/queries/owner'
import { formatCurrency, formatDate, formatPhone } from '@/lib/format'

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

function daysRemainingFor(endDate: string): number {
  const end = new Date(endDate + 'T00:00:00Z')
  const today = new Date()
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  )
  return Math.round((end.getTime() - todayUtc.getTime()) / (1000 * 60 * 60 * 24))
}

export const dynamic = 'force-dynamic'

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [detail, plans] = await Promise.all([
    getMemberDetail(id),
    getActiveSubscriptionPlans(),
  ])

  if (!detail) notFound()

  const { profile, active_subscription, subscriptions, payments, access_logs } =
    detail

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div>
        <Link
          href="/dashboard/membri"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Torna ai membri
        </Link>
      </div>

      <header className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            {profile.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
            ) : null}
            <AvatarFallback className="bg-muted text-lg">
              {initialsFor(profile.full_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl tracking-tight md:text-4xl lg:text-5xl">
                {profile.full_name}
              </h1>
              {profile.is_problematic ? (
                <Badge
                  variant="outline"
                  className="bg-destructive/10 text-destructive border-destructive/20"
                >
                  <AlertTriangleIcon className="size-3" />
                  Problematico
                </Badge>
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MailIcon className="size-3.5" />
                {profile.email}
              </span>
              {profile.phone ? (
                <span className="inline-flex items-center gap-1">
                  <PhoneIcon className="size-3.5" />
                  {formatPhone(profile.phone)}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CashPaymentDialog
            plans={plans}
            mode={{
              kind: 'member',
              member: {
                id: profile.id,
                full_name: profile.full_name,
                email: profile.email,
              },
            }}
          />
          <SendPayLinkDialog memberId={profile.id} plans={plans} />
          {active_subscription &&
          active_subscription.auto_renew &&
          active_subscription.payment_method === 'sepa' &&
          active_subscription.status === 'active' ? (
            <TriggerRenewalButton subscriptionId={active_subscription.id} />
          ) : null}
          <MemberActions
            memberId={profile.id}
            activeSubscription={active_subscription}
            plans={plans}
          />
        </div>
      </header>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="subscriptions">Storico abbonamenti</TabsTrigger>
          <TabsTrigger value="payments">Pagamenti</TabsTrigger>
          <TabsTrigger value="access">Ingressi</TabsTrigger>
          <TabsTrigger value="edit">Modifica</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Profilo</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <Row label="Email" value={profile.email} />
                <Row
                  label="Telefono"
                  value={profile.phone ? formatPhone(profile.phone) : '—'}
                />
                <Row
                  label="Data di nascita"
                  value={
                    profile.birth_date
                      ? formatDate(profile.birth_date, 'short')
                      : '—'
                  }
                />
                <Row
                  label="Codice fiscale"
                  value={profile.fiscal_code ?? '—'}
                />
                <Row
                  label="Indirizzo"
                  value={
                    [
                      profile.address,
                      profile.postal_code,
                      profile.city,
                      profile.province,
                    ]
                      .filter(Boolean)
                      .join(', ') || '—'
                  }
                />
                <Row label="Badge UID" value={profile.badge_uid ?? '—'} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
                <CardTitle>Abbonamento corrente</CardTitle>
                <SubscriptionStatusBadge
                  status={active_subscription?.status ?? null}
                />
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                {active_subscription ? (
                  <>
                    <Row
                      label="Piano"
                      value={`${active_subscription.plan.name} · ${formatCurrency(
                        active_subscription.plan.price_cents,
                      )}`}
                    />
                    <Row
                      label="Inizio"
                      value={formatDate(active_subscription.start_date, 'short')}
                    />
                    <Row
                      label="Fine"
                      value={formatDate(active_subscription.end_date, 'short')}
                    />
                    <Row
                      label="Giorni rimanenti"
                      value={
                        active_subscription.status === 'active'
                          ? daysRemainingFor(active_subscription.end_date).toString()
                          : '—'
                      }
                    />
                    <Row
                      label="Auto-rinnovo"
                      value={active_subscription.auto_renew ? 'Sì' : 'No'}
                    />
                    <Row
                      label="Giorni sospensione usati"
                      value={`${active_subscription.suspension_days_used} / 60`}
                    />
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    Nessun abbonamento attivo. Usa &ldquo;Rinnova&rdquo; per
                    creare il primo.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
          {profile.notes ? (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm">Note interne</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">
                {profile.notes}
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-6">
          <Card>
            <CardContent className="p-0">
              {subscriptions.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  Nessun abbonamento.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Piano</TableHead>
                      <TableHead>Periodo</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead className="text-right">Prezzo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          {s.plan.name}
                        </TableCell>
                        <TableCell>
                          {formatDate(s.start_date, 'short')} →{' '}
                          {formatDate(s.end_date, 'short')}
                        </TableCell>
                        <TableCell>
                          <SubscriptionStatusBadge status={s.status} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(s.plan.price_cents)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <Card>
            <CardContent className="p-0">
              {payments.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  Nessun pagamento registrato.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Importo</TableHead>
                      <TableHead>Metodo</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Ricevuta</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => {
                      const isCashLike =
                        p.payment_method === 'cash' ||
                        p.payment_method === 'bank_transfer'
                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            {formatDate(p.paid_at ?? p.created_at, 'short')}
                          </TableCell>
                          <TableCell className="font-medium tabular-nums">
                            {formatCurrency(p.amount_cents)}
                          </TableCell>
                          <TableCell>
                            <PaymentMethodBadge method={p.payment_method} />
                          </TableCell>
                          <TableCell>
                            <PaymentStatusBadge status={p.status} />
                          </TableCell>
                          <TableCell>{p.receipt_number ?? '—'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {p.receipt_number ? (
                                <Button
                                  asChild
                                  size="sm"
                                  variant="outline"
                                  title="Scarica ricevuta"
                                >
                                  <a
                                    href={`/api/owner/payments/receipt?payment=${p.id}&kind=receipt`}
                                    target="_blank"
                                    rel="noopener"
                                  >
                                    <DownloadIcon className="size-4" />
                                  </a>
                                </Button>
                              ) : null}
                              {p.invoice_number ? (
                                <Button
                                  asChild
                                  size="sm"
                                  variant="outline"
                                  title="Scarica fattura"
                                >
                                  <a
                                    href={`/api/owner/payments/receipt?payment=${p.id}&kind=invoice`}
                                    target="_blank"
                                    rel="noopener"
                                  >
                                    <DownloadIcon className="size-4" />
                                    Fatt.
                                  </a>
                                </Button>
                              ) : null}
                              {p.status === 'succeeded' &&
                              p.stripe_payment_intent_id ? (
                                <RefundPaymentButton paymentId={p.id} />
                              ) : null}
                              {p.status === 'succeeded' && isCashLike ? (
                                <RefundCashButton paymentId={p.id} />
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="mt-6">
          <Card>
            <CardContent className="p-0">
              {access_logs.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  Nessun ingresso registrato (Phase 08).
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data e ora</TableHead>
                      <TableHead>Esito</TableHead>
                      <TableHead>Badge</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {access_logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {formatDate(log.accessed_at, 'short')}{' '}
                          {new Date(log.accessed_at).toLocaleTimeString('it-IT', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell>
                          {log.granted ? (
                            <Badge
                              variant="outline"
                              className="bg-success/10 text-success border-success/20"
                            >
                              Consentito
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-destructive/10 text-destructive border-destructive/20"
                            >
                              Negato
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{log.badge_uid ?? '—'}</TableCell>
                        <TableCell>{log.denial_reason ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edit" className="mt-6">
          <Separator className="mb-6" />
          <MemberForm mode="edit" member={profile} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/40 py-1.5 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}
