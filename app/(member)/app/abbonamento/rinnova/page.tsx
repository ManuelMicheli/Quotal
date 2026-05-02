/**
 * Member self-service renew page.
 *
 * Logged-in member picks a plan and is redirected to a freshly-created
 * `/pay/[token]` URL. Reuses the same payment flow as the owner-issued link.
 */
import { ArrowUpRightIcon } from 'lucide-react'
import { redirect } from 'next/navigation'

import { createSelfPaymentSessionAction } from '@/app/actions/payments'
import { PageHeader } from '@/components/member/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Stepper } from '@/components/shared/stepper'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
      <PageHeader
        title="Rinnova abbonamento"
        subtitle="Scegli il piano e completa il pagamento"
      />

      <div className="ring-soft rounded-3xl bg-card p-5 md:p-6">
        <Stepper
          steps={[
            { id: 'plan', title: 'Piano', description: 'Scegli un abbonamento' },
            { id: 'payment', title: 'Pagamento', description: 'Carta o SEPA' },
            { id: 'confirm', title: 'Conferma', description: 'Pronto ad allenarti' },
          ]}
          current={0}
        />
      </div>

      {errorParam ? (
        <Alert variant="destructive">
          <AlertDescription>
            Pagamento non avviato. Riprova o contatta la palestra.
          </AlertDescription>
        </Alert>
      ) : null}

      {!plans || plans.length === 0 ? (
        <div className="ring-soft rounded-3xl bg-card">
          <EmptyState
            title="Nessun piano attivo"
            description="Contatta la palestra per ricevere un nuovo piano."
          />
        </div>
      ) : (
        <form
          action={startRenewal}
          className="grid gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4"
        >
          {plans.map((p) => (
            <article
              key={p.id}
              className="ring-elevated tap-shrink hover-lift relative flex flex-col gap-4 overflow-hidden rounded-3xl bg-card p-6 md:p-7"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-50"
                style={{
                  background:
                    'radial-gradient(closest-side, color-mix(in oklab, var(--accent) 28%, transparent), transparent)',
                }}
              />
              <div className="relative flex-1">
                <p className="eyebrow">{p.duration_days} giorni</p>
                <h2 className="heading-display mt-2 text-2xl md:text-3xl lg:text-4xl">
                  {p.name}
                </h2>
                <p className="number mt-4 text-3xl font-semibold md:text-4xl">
                  {formatCurrency(p.price_cents)}
                </p>
              </div>
              <Button
                type="submit"
                name="plan_id"
                value={p.id}
                variant="accent"
                size="xl"
                className="relative w-full rounded-full"
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
