import { AlertTriangleIcon, RotateCwIcon } from 'lucide-react'
import Link from 'next/link'

import { FailedHeroIcon } from './failed-hero-icon'

import { Button } from '@/components/ui/button'
import { LEGAL_CONFIG } from '@/lib/legal/config'

export const dynamic = 'force-dynamic'

export default async function PayFailedPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ reason?: string }>
}) {
  const { token } = await params
  const { reason } = await searchParams

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-8 text-center">
      <FailedHeroIcon icon={<AlertTriangleIcon />} />

      <div className="flex flex-col items-center gap-3">
        <p className="eyebrow text-destructive">Pagamento non completato</p>
        <h1 className="heading-display text-balance text-4xl sm:text-5xl">
          Pagamento non riuscito
        </h1>
        <p className="max-w-md text-pretty text-[0.9375rem] leading-relaxed text-muted-foreground">
          {reason
            ? reason
            : 'Si è verificato un problema durante il pagamento. Nessun importo è stato addebitato. Puoi riprovare oppure contattare la palestra.'}
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Button asChild size="lg" variant="accent">
          <Link href={`/pay/${token}`}>
            <RotateCwIcon className="size-4" />
            Riprova
          </Link>
        </Button>
        <Button asChild size="lg" variant="ghost">
          <Link href={`mailto:${LEGAL_CONFIG.app.support_email}`}>
            Contatta il supporto
          </Link>
        </Button>
      </div>
    </div>
  )
}
