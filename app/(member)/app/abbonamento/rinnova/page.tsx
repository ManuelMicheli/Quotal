/**
 * Member self-service renew page.
 *
 * Logged-in member picks a plan and is redirected to a freshly-created
 * `/pay/[token]` URL. Reuses the same payment flow as the owner-issued link.
 */
import { redirect } from 'next/navigation'

import { createPaymentSessionAction } from '@/app/actions/payments'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireMember } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function MemberRenewPage() {
  const profile = await requireMember()
  const supabase = await createClient()

  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('gym_id', profile.gym_id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  async function startRenewal(formData: FormData) {
    'use server'
    const me = await requireMember()
    const planId = formData.get('plan_id')?.toString() ?? ''
    if (!planId) return
    const result = await createPaymentSessionAction({
      member_id: me.id,
      plan_id: planId,
    })
    if (result.ok && result.data) {
      redirect(`/pay/${result.data.token}`)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 px-6 py-12">
      <header>
        <p className="text-sm text-muted-foreground">Rinnova abbonamento</p>
        <h1 className="font-display text-2xl tracking-tight">
          Scegli il piano
        </h1>
      </header>

      {!plans || plans.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nessun piano attivo. Contatta la palestra.
          </CardContent>
        </Card>
      ) : (
        <form action={startRenewal} className="flex flex-col gap-3">
          {plans.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="text-base">{p.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  {p.duration_days} giorni
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-lg">
                    {formatCurrency(p.price_cents)}
                  </span>
                  <Button
                    type="submit"
                    name="plan_id"
                    value={p.id}
                    size="sm"
                  >
                    Paga
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </form>
      )}
    </main>
  )
}
