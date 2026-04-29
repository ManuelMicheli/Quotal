'use client'

/**
 * "Esporta dati mese" — downloads the current month's payments as a CSV.
 *
 * The file is generated on demand by `GET /api/owner/payments/export?month=…`,
 * which streams CSV. Client component because we trigger an `<a>` download
 * with `download` attribute and (optionally) a loading state.
 */
import { DownloadIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

function currentMonthParam(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

export function ExportPaymentsButton() {
  const month = currentMonthParam()
  return (
    <Button asChild variant="outline">
      <a href={`/api/owner/payments/export?month=${month}`} download>
        <DownloadIcon className="size-4" />
        Esporta dati mese
      </a>
    </Button>
  )
}
