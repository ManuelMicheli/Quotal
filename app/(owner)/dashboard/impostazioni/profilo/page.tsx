/**
 * Owner profile settings — minimal MVP.
 *
 * The owner can update their displayed name + email and request a password
 * reset. The password reset uses the same flow as `/login → reimposta` from
 * Phase 03 — Supabase sends an email with a one-time recovery link, so we
 * never have to know the user's old password here.
 */
import Link from 'next/link'

import { OwnerProfileForm } from '@/components/owner/owner-profile-form'
import { requireOwnerOrStaff } from '@/lib/auth'

export default async function OwnerProfilePage() {
  const profile = await requireOwnerOrStaff()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/dashboard/impostazioni"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Tutte le impostazioni
        </Link>
      </div>
      <header>
        <h1 className="font-display text-3xl tracking-tight">Il tuo profilo</h1>
        <p className="text-sm text-muted-foreground">
          Dati personali del titolare e cambio password.
        </p>
      </header>
      <OwnerProfileForm profile={profile} />
    </div>
  )
}
