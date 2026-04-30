/**
 * Create-member form. Loads the active plans server-side so the dropdown
 * is server-rendered with stable data.
 */
import Link from 'next/link'

import { MemberForm } from '@/components/owner/member-form'
import { getActiveSubscriptionPlans } from '@/lib/queries/owner'

export default async function NewMemberPage() {
  const plans = await getActiveSubscriptionPlans()

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Link
          href="/dashboard/membri"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Torna alla lista
        </Link>
        <h1 className="font-display text-3xl tracking-tight md:text-4xl lg:text-5xl">Nuovo membro</h1>
        <p className="text-sm text-muted-foreground">
          Aggiungi un membro alla palestra. Riceverà un&apos;email con un link
          per impostare la sua password.
        </p>
      </header>
      <MemberForm mode="create" plans={plans} />
    </div>
  )
}
