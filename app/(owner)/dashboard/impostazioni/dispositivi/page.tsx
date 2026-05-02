/**
 * Access devices settings — list, create, rotate, delete.
 *
 * Each device gets a long-lived bearer token to call /api/access/verify.
 * Cleartext tokens are shown ONCE in a dialog right after creation/rotate;
 * only the SHA-256 hash lives in the DB.
 */
import { ArrowLeftIcon, CpuIcon } from 'lucide-react'
import Link from 'next/link'

import { AccessDevicesEditor } from '@/components/owner/access-devices-editor'
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderHeading,
} from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 w-fit text-muted-foreground"
      >
        <Link href="/dashboard/impostazioni">
          <ArrowLeftIcon className="size-3.5" />
          Tutte le impostazioni
        </Link>
      </Button>
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Impostazioni</PageHeaderEyebrow>
          <PageHeaderHeading>Dispositivi controllo accessi</PageHeaderHeading>
          <PageHeaderDescription>
            Tornelli, tablet e lettori autorizzati a verificare gli accessi.
            Ogni dispositivo ha un token bearer da configurare lato hardware.
          </PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle className="flex items-center gap-2">
            <CpuIcon className="size-4 text-accent" />
            Adapter hardware corrente
          </CardTitle>
          <Badge variant="accent">{ADAPTER_LABEL[adapter] ?? adapter}</Badge>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Cambialo via variabile{' '}
            <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
              ACCESS_CONTROL_ADAPTER
            </code>{' '}
            in{' '}
            <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
              .env
            </code>{' '}
            (valori:{' '}
            <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
              mock
            </code>
            ,{' '}
            <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
              rest
            </code>
            ).
          </p>
          {adapter === 'rest' ? (
            <p>
              Per{' '}
              <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                rest
              </code>{' '}
              imposta anche{' '}
              <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                ACCESS_CONTROL_BASE_URL
              </code>{' '}
              e{' '}
              <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                ACCESS_CONTROL_API_KEY
              </code>
              .
            </p>
          ) : null}
        </CardContent>
      </Card>

      <AccessDevicesEditor devices={devices} />
    </div>
  )
}
