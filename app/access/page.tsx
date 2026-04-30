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
import { AccessTerminal } from '@/components/access/access-terminal'
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
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-8 text-center text-zinc-100">
      <div className="max-w-md space-y-3">
        <h1 className="font-display text-3xl tracking-tight">Errore</h1>
        <p className="text-zinc-300">{message}</p>
      </div>
    </div>
  )
}
