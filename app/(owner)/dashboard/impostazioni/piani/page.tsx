/**
 * Subscription plans editor.
 *
 * Loads every plan (active + inactive) for the gym and renders the client-
 * side editor. The editor handles create/update/toggle/reorder via server
 * actions.
 */
import Link from 'next/link'

import { PlansEditor } from '@/components/owner/plans-editor'
import { getSubscriptionPlans } from '@/lib/queries/owner'

export const dynamic = 'force-dynamic'

export default async function PlansSettingsPage() {
  const plans = await getSubscriptionPlans()

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <Link
          href="/dashboard/impostazioni"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Tutte le impostazioni
        </Link>
      </div>
      <header>
        <h1 className="font-display text-3xl tracking-tight">
          Piani abbonamento
        </h1>
        <p className="text-sm text-muted-foreground">
          I membri sceglieranno tra questi piani. Nuovi piani richiedono di
          essere riassegnati ai membri esistenti — nessun rinnovo retroattivo.
        </p>
      </header>
      <PlansEditor plans={plans} />
    </div>
  )
}
