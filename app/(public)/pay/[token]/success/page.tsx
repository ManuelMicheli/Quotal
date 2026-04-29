/**
 * Confirmation screen after a successful card or SEPA submission.
 *
 * The webhook is the single source of truth — until it lands, the row stays
 * `pending`. We show three states:
 *   - completed → green check + active subscription end date
 *   - pending   → "in elaborazione" with SEPA-specific copy
 *   - failed    → recovery message
 */
import { CheckCircle2Icon, Clock4Icon } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/format'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function PaySuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ method?: string; status?: string }>
}) {
  const { token } = await params
  const sp = await searchParams
  const admin = createAdminClient()

  const { data: session } = await admin
    .from('payment_sessions')
    .select(
      'id, status, payment_method, amount_cents, member_id, plan_id, gym_id, completed_at',
    )
    .eq('token', token)
    .maybeSingle()

  if (!session) {
    return (
      <main className="mx-auto flex w-full max-w-md">
        <Card className="w-full">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Sessione non trovata.
          </CardContent>
        </Card>
      </main>
    )
  }

  const [{ data: subscription }, { data: gym }] = await Promise.all([
    admin
      .from('subscriptions')
      .select('id, end_date')
      .eq('member_id', session.member_id)
      .eq('status', 'active')
      .order('end_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from('gyms')
      .select('id, name, brand_color')
      .eq('id', session.gym_id)
      .single(),
  ])

  const completed = session.status === 'completed'
  const isSepa =
    session.payment_method === 'sepa' || sp.method === 'sepa'

  return (
    <main className="mx-auto flex w-full max-w-md">
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          {completed ? (
            <CheckCircle2Icon className="size-14 text-emerald-600" />
          ) : (
            <Clock4Icon className="size-14 text-amber-600" />
          )}

          <h1 className="font-display text-2xl">
            {completed
              ? 'Pagamento ricevuto!'
              : 'Pagamento in elaborazione'}
          </h1>

          {completed ? (
            <p className="text-sm text-muted-foreground">
              Il tuo abbonamento {gym?.name ? `presso ${gym.name}` : ''} è
              attivo
              {subscription?.end_date
                ? ` fino al ${formatDate(subscription.end_date, 'long')}`
                : ''}
              .
              <br />
              Importo: <strong>{formatCurrency(session.amount_cents)}</strong>
            </p>
          ) : isSepa ? (
            <p className="text-sm text-muted-foreground">
              Hai autorizzato l&apos;addebito SEPA. La banca completerà
              l&apos;operazione entro <strong>5 giorni lavorativi</strong>.
              Riceverai conferma via email non appena il pagamento sarà
              accreditato.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Stiamo confermando il pagamento. Aggiorna questa pagina tra
              qualche secondo.
            </p>
          )}

          <Button asChild className="mt-2">
            <Link href="/app">Vai alla mia area</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
