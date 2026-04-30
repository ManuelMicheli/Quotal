/**
 * Member self-service renew page.
 *
 * Logged-in member picks a plan and is redirected to a freshly-created
 * `/pay/[token]` URL. Reuses the same payment flow as the owner-issued link.
 */
import { ArrowUpRightIcon } from 'lucide-react'
import { redirect } from 'next/navigation'

import { createSelfPaymentSessionAction } from '@/app/actions/payments'
import { Button } from '@/components/ui/button'
import { requireMember } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function MemberRenewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const profile = await requireMember()
  const supabase = await createClient()
  const { error: errorParam } = await searchParams

  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('gym_id', profile.gym_id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  async function startRenewal(formData: FormData) {
    'use server'
    const planId = formData.get('plan_id')?.toString() ?? ''
    if (!planId) {
      redirect('/app/abbonamento/rinnova?error=plan')
    }
    const result = await createSelfPaymentSessionAction({ plan_id: planId })
    if (!result.ok || !result.data) {
      const msg = encodeURIComponent(!result.ok ? result.error : 'unknown')
      redirect(`/app/abbonamento/rinnova?error=${msg}`)
    }
    redirect(`/pay/${result.data.token}`)
  }

  return (
    <div className="flex flex-col gap-6 md:gap-10">
      <header className="pt-2 md:pt-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground md:text-xs">
          Rinnova abbonamento
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-tight md:text-5xl lg:text-6xl">
          Scegli il piano
        </h1>
      </header>

      {errorParam ? (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          Pagamento non avviato. Riprova o contatta la palestra.
        </div>
      ) : null}

      {!plans || plans.length === 0 ? (
        <div className="ring-soft rounded-3xl bg-card px-5 py-12 text-center text-sm text-muted-foreground">
          Nessun piano attivo. Contatta la palestra.
        </div>
      ) : (
        <form
          action={startRenewal}
          className="grid gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4"
        >
          {plans.map((p) => (
            <article
              key={p.id}
              className="ring-elevated tap-shrink flex flex-col gap-4 rounded-3xl bg-card p-6 md:p-7"
            >
              <div className="flex-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground md:text-xs">
                  {p.duration_days} giorni
                </p>
                <h2 className="mt-2 font-display text-2xl tracking-tight md:text-3xl lg:text-4xl">
                  {p.name}
                </h2>
                <p className="tabular mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                  {formatCurrency(p.price_cents)}
                </p>
              </div>
              <Button
                type="submit"
                name="plan_id"
                value={p.id}
                size="lg"
                className="w-full rounded-full"
              >
                Paga ora
                <ArrowUpRightIcon size={16} />
              </Button>
            </article>
          ))}
        </form>
      )}
    </div>
  )
}
