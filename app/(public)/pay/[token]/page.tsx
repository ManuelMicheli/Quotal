/**
 * Public payment page — `/pay/[token]`.
 *
 * Accessible without login. Looks up the `payment_sessions` row via
 * service-role admin client; shows either the active form, a confirmation
 * screen if already completed, or an error if expired/invalid.
 */
import { redirect } from 'next/navigation'

import { PaymentForm } from '@/components/payment/payment-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
    <main className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="flex items-center gap-3">
        <div
          className="size-10 rounded-md"
          style={{ backgroundColor: gym.brand_color ?? 'var(--accent)' }}
          aria-hidden
        />
        <div>
          <p className="text-xs text-muted-foreground">Pagamento abbonamento</p>
          <h1 className="font-display text-2xl">{gym.name}</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riepilogo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-1 text-sm">
            <Row label="Membro" value={member.full_name} />
            <Row label="Email" value={member.email} />
            <Row label="Piano" value={plan.name} />
            <Row
              label="Durata"
              value={`${plan.duration_days} giorni`}
            />
            <Row
              label="Scadenza link"
              value={formatDate(session.expires_at, 'long')}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Totale</span>
            <span className="font-display text-2xl">
              {formatCurrency(session.amount_cents)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Metodo di pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentForm
            token={token}
            amountCents={session.amount_cents}
            memberFullName={member.full_name}
            memberEmail={member.email}
            gymName={gym.name}
          />
        </CardContent>
      </Card>
    </main>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

function ExpiredCard({ reason }: { reason: string }) {
  return (
    <main className="mx-auto flex w-full max-w-md">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Link non disponibile</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {reason} Contatta la palestra per ricevere un nuovo link.
        </CardContent>
      </Card>
    </main>
  )
}
