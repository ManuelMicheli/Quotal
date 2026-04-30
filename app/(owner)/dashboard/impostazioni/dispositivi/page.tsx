/**
 * Access devices settings — list, create, rotate, delete.
 *
 * Each device gets a long-lived bearer token to call /api/access/verify.
 * Cleartext tokens are shown ONCE in a dialog right after creation/rotate;
 * only the SHA-256 hash lives in the DB.
 */
import Link from 'next/link'

import { AccessDevicesEditor } from '@/components/owner/access-devices-editor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { env } from '@/lib/env'
import { getAccessDevices } from '@/lib/queries/access'

export const dynamic = 'force-dynamic'

const ADAPTER_LABEL: Record<string, string> = {
  mock: 'Mock (nessuna azione fisica)',
  rest: 'REST (vendor HTTP API)',
}

export default async function AccessDevicesPage() {
  const devices = await getAccessDevices()
  const adapter = env.ACCESS_CONTROL_ADAPTER

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div>
        <Link
          href="/dashboard/impostazioni"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Tutte le impostazioni
        </Link>
      </div>
      <header>
        <h1 className="font-display text-3xl tracking-tight md:text-4xl lg:text-5xl">
          Dispositivi controllo accessi
        </h1>
        <p className="text-sm text-muted-foreground">
          Tornelli, tablet e lettori autorizzati a verificare gli accessi.
          Ogni dispositivo ha un token bearer da configurare lato hardware.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Adapter hardware corrente
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">
              {ADAPTER_LABEL[adapter] ?? adapter}
            </span>
            . Cambialo via variabile{' '}
            <code className="font-mono">ACCESS_CONTROL_ADAPTER</code> in{' '}
            <code className="font-mono">.env</code>{' '}
            (valori: <code className="font-mono">mock</code>,{' '}
            <code className="font-mono">rest</code>).
          </p>
          {adapter === 'rest' ? (
            <p className="mt-2">
              Per <code className="font-mono">rest</code> imposta anche{' '}
              <code className="font-mono">ACCESS_CONTROL_BASE_URL</code> e{' '}
              <code className="font-mono">ACCESS_CONTROL_API_KEY</code>.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <AccessDevicesEditor devices={devices} />
    </div>
  )
}
