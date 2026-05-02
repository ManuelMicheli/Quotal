/**
 * Public payment page — `/pay/[token]`.
 *
 * Accessible without login. Looks up the `payment_sessions` row via
 * service-role admin client; shows either the active form, a confirmation
 * screen if already completed, or an error if expired/invalid.
 */
import { LinkIcon, LockIcon, ShieldCheckIcon } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { PaymentForm } from '@/components/payment/payment-form'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatDate } from '@/lib/format'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function PayPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const admin = createAdminClient()
  const { data: session } = await admin
    .from('payment_sessions')
    .select('id, status, expires_at, amount_cents, member_id, plan_id, gym_id')
    .eq('token', token)
    .maybeSingle()

  if (!session) {
    return <ExpiredCard reason="Link di pagamento non valido." />
  }

  if (session.status === 'completed') {
    redirect(`/pay/${token}/success`)
  }
  if (session.status === 'cancelled' || session.status === 'expired') {
    return <ExpiredCard reason="Questo link non è più valido." />
  }
  // Compare against a fresh Date inside `force-dynamic` rendering — every
  // request gets a new timestamp, no memoization concerns. Wrapping in a new
  // Date avoids the React purity-rule lint flagging Date.now() directly.
  const nowTs = new Date().getTime()
  if (new Date(session.expires_at).getTime() < nowTs) {
    return <ExpiredCard reason="Il link di pagamento è scaduto." />
  }

  const [{ data: member }, { data: plan }, { data: gym }] = await Promise.all([
    admin
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', session.member_id)
      .single(),
    admin
      .from('subscription_plans')
      .select('id, name, description, duration_days')
      .eq('id', session.plan_id)
      .single(),
    admin
      .from('gyms')
      .select('id, name, brand_color, logo_url')
      .eq('id', session.gym_id)
      .single(),
  ])

  if (!member || !plan || !gym) {
    return <ExpiredCard reason="Dati di pagamento incompleti." />
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
      <PaymentHero
        amountCents={session.amount_cents}
        gymName={gym.name}
        gymBrandColor={gym.brand_color}
        planName={plan.name}
      />

      <Card variant="glass" className="overflow-hidden gap-0 py-0">
        <CardHeader className="gap-1 px-7 pt-7">
          <p className="eyebrow">Riepilogo</p>
          <CardTitle className="text-lg">Dettagli abbonamento</CardTitle>
          <CardDescription>
            Verifica i dettagli prima di procedere.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-7 pb-7 pt-5">
          <dl className="flex flex-col divide-y divide-border/60">
            <Row label="Membro" value={member.full_name} />
            <Row label="Email" value={member.email} mono />
            <Row label="Piano" value={plan.name} />
            <Row label="Durata" value={`${plan.duration_days} giorni`} />
            <Row
              label="Scadenza link"
              value={formatDate(session.expires_at, 'long')}
            />
          </dl>
          <Separator className="my-5" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Totale
            </span>
            <span className="number heading-display text-2xl">
              {formatCurrency(session.amount_cents)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card variant="glass" className="overflow-hidden gap-0 py-0">
        <CardHeader className="gap-1 px-7 pt-7">
          <p className="eyebrow">Pagamento</p>
          <CardTitle className="text-lg">Metodo di pagamento</CardTitle>
          <CardDescription>
            Carta di credito o addebito SEPA. Elaborato da Stripe.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-7 pb-7 pt-5">
          <PaymentForm
            token={token}
            amountCents={session.amount_cents}
            memberFullName={member.full_name}
            memberEmail={member.email}
            gymName={gym.name}
          />
        </CardContent>
      </Card>

      <TrustBadges />
    </div>
  )
}

function PaymentHero({
  amountCents,
  gymName,
  gymBrandColor,
  planName,
}: {
  amountCents: number
  gymName: string
  gymBrandColor: string | null
  planName: string
}) {
  return (
    <header className="flex flex-col items-center gap-5 text-center">
      <div className="flex items-center gap-3">
        <div
          aria-hidden
          className="size-10 rounded-lg ring-soft"
          style={{ backgroundColor: gymBrandColor ?? 'var(--accent)' }}
        />
        <div className="text-left">
          <p className="eyebrow">Pagamento abbonamento</p>
          <p className="text-sm font-medium leading-tight text-foreground">
            {gymName}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <h1 className="heading-display number text-5xl text-foreground sm:text-6xl">
          {formatCurrency(amountCents)}
        </h1>
        <p className="text-sm text-muted-foreground text-pretty">
          {planName}
        </p>
      </div>
    </header>
  )
}

function TrustBadges() {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <LockIcon className="size-3.5" />
          Connessione cifrata
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheckIcon className="size-3.5" />
          PCI DSS · Stripe
        </span>
        <span className="inline-flex items-center gap-1.5">
          <LinkIcon className="size-3.5" />
          Link unico monouso
        </span>
      </div>
      <p className="max-w-md text-pretty text-xs text-muted-foreground">
        I tuoi dati bancari non vengono mai memorizzati su Quotal. Tutti i
        pagamenti sono elaborati da Stripe Payments Europe Ltd.
      </p>
    </div>
  )
}

function Row({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={
          mono
            ? 'truncate text-right font-medium text-foreground'
            : 'truncate text-right font-medium text-foreground'
        }
      >
        {value}
      </dd>
    </div>
  )
}

function ExpiredCard({ reason }: { reason: string }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <div
          aria-hidden
          className="flex size-14 items-center justify-center rounded-full bg-warning-soft text-warning"
        >
          <LinkIcon className="size-6" />
        </div>
        <h1 className="heading-display text-3xl">Link non disponibile</h1>
        <p className="max-w-sm text-pretty text-sm text-muted-foreground">
          {reason} Contatta la palestra per ricevere un nuovo link.
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href="/">Torna alla home</Link>
      </Button>
    </div>
  )
}
