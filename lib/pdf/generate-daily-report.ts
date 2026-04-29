import 'server-only'

/**
 * Daily cash-close PDF generator + Storage upload.
 */
import { renderToBuffer } from '@react-pdf/renderer'

import { createAdminClient } from '@/lib/supabase/admin'

import {
  DailyReportDocument,
  type DailyReportPayment,
} from './daily-report-template'
import {
  RECEIPT_BUCKET_NAME,
  dailyReportStoragePath,
} from './generate-receipt'

export async function generateAndStoreDailyReport(input: {
  gymId: string
  closeDate: string // YYYY-MM-DD
  closedAt: Date
  closedBy: string
  payments: DailyReportPayment[]
  totals: {
    total_cents: number
    cash_cents: number
    card_cents: number
    sepa_cents: number
    bank_transfer_cents: number
    transactions_count: number
  }
}): Promise<{ path: string; signedUrl: string }> {
  const admin = createAdminClient()

  const { data: gym, error: gymErr } = await admin
    .from('gyms')
    .select('name, vat_number, address, city, province, postal_code')
    .eq('id', input.gymId)
    .single()
  if (gymErr || !gym) {
    throw new Error(`Gym ${input.gymId} not found: ${gymErr?.message ?? ''}`)
  }

  const buffer = await renderToBuffer(
    DailyReportDocument({
      gym,
      closeDate: input.closeDate,
      closedAt: input.closedAt,
      closedBy: input.closedBy,
      payments: input.payments,
      totals: input.totals,
    }),
  )

  const path = dailyReportStoragePath(input.gymId, input.closeDate)
  const { error: uploadErr } = await admin.storage
    .from(RECEIPT_BUCKET_NAME)
    .upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: true,
      cacheControl: '3600',
    })
  if (uploadErr) {
    throw new Error(`Storage upload failed: ${uploadErr.message}`)
  }

  const { data: signed, error: signErr } = await admin.storage
    .from(RECEIPT_BUCKET_NAME)
    .createSignedUrl(path, 60 * 60 * 24)
  if (signErr || !signed?.signedUrl) {
    throw new Error(
      `Signed URL failed: ${signErr?.message ?? 'unknown error'}`,
    )
  }

  return { path, signedUrl: signed.signedUrl }
}
