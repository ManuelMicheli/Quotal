/**
 * Tablet kiosk for the access terminal.
 *
 * URL: /access?token=qd_<id>_<secret>
 *
 * Public route — anonymous browsers must be able to reach it because the
 * tablet is typically logged out. We validate the device token server-side
 * before rendering the kiosk; an invalid token shows a hard error screen
 * instead of letting random visitors poke around.
 *
 * The kiosk doesn't speak directly to the DB — it POSTs to
 * /api/access/verify with the same token. That keeps the surface area
 * tight: hardware vendors can use the same flow without running a
 * browser.
 */
import { ShieldAlertIcon } from 'lucide-react'

import { AccessTerminal } from '@/components/access/access-terminal'
import { Logo } from '@/components/shared/logo'
import { verifyDeviceToken } from '@/lib/access/device-auth'

export const dynamic = 'force-dynamic'
// Don't index the kiosk page — it's a fixed installation, not content.
export const metadata = {
  title: 'Quotal — Accesso',
  robots: { index: false, follow: false },
}

export default async function AccessKioskPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const sp = await searchParams
  const token = sp.token?.trim()

  if (!token) {
    return <KioskError message="Token mancante. Configura la URL con ?token=..." />
  }

  const device = await verifyDeviceToken(token)
  if (!device || !device.is_active) {
    return (
      <KioskError message="Dispositivo non autorizzato. Contatta il titolare." />
    )
  }

  return (
    <AccessTerminal
      deviceId={device.id}
      deviceName={device.name}
      deviceToken={token}
    />
  )
}

function KioskError({ message }: { message: string }) {
  return (
    <div className="bg-aurora-soft relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div className="bg-grain pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-8 text-center">
        <Logo size="md" />
        <div className="glass-strong relative flex flex-col items-center gap-5 rounded-3xl px-8 py-12">
          <div className="bg-destructive-soft text-destructive ring-soft flex size-16 items-center justify-center rounded-2xl">
            <ShieldAlertIcon className="size-8" aria-hidden />
          </div>
          <div className="flex flex-col gap-2">
            <p className="eyebrow">Errore terminale</p>
            <h1 className="heading-display text-3xl text-balance md:text-4xl">
              Accesso non disponibile
            </h1>
            <p className="text-muted-foreground text-pretty text-sm leading-relaxed md:text-base">
              {message}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
