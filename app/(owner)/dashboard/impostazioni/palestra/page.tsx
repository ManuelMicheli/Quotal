/**
 * Gym settings — name, P.IVA, address, brand color.
 *
 * Loads the gym row server-side and hands it to a client form. The form
 * round-trips through `updateGymSettingsAction` for validation + revalidation.
 */
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { GymSettingsForm } from '@/components/owner/gym-settings-form'
import { getCurrentGym } from '@/lib/queries/gym'

export default async function GymSettingsPage() {
  const gym = await getCurrentGym()
  if (!gym) notFound()

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
        <h1 className="font-display text-3xl tracking-tight">Palestra</h1>
        <p className="text-sm text-muted-foreground">
          Dati che appariranno su ricevute, fatture e comunicazioni ai membri.
        </p>
      </header>
      <GymSettingsForm gym={gym} />
    </div>
  )
}
