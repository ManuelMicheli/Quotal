import 'server-only'

/**
 * Receipt + invoice PDF pipeline.
 *
 * Renders the React-PDF template to a Buffer and uploads it to the private
 * `receipts` Supabase Storage bucket using the service-role client (RLS does
 * not apply when using the service-role key, so this code path always
 * succeeds regardless of the calling user). All access from the UI must go
 * through `createSignedReceiptUrl()` so the bucket policy stays in force.
 *
 * Path layout:
 *   <gym_id>/receipts/<receipt_number>.pdf
 *   <gym_id>/invoices/<invoice_number_safe>.pdf
 *   <gym_id>/daily-reports/<YYYY-MM-DD>.pdf
 *
 * The receipt_number / invoice_number is reserved by the SQL function
 * `register_cash_payment` BEFORE this code runs. If PDF generation fails the
 * payment row remains valid; the gap in the receipt sequence is acceptable
 * for a non-fiscal document and the owner can re-trigger generation later.
 */
import { renderToBuffer } from '@react-pdf/renderer'

import { createAdminClient } from '@/lib/supabase/admin'

import {
  ReceiptDocument,
  type ReceiptKind,
} from './receipt-template'

export const RECEIPT_BUCKET_NAME = 'receipts' as const
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 // 24h

/**
 * Sanitize a receipt or invoice number so it is safe as a storage path
 * fragment (slashes are not allowed in object names; spaces are normalised).
 */
function sanitizeNumber(num: string): string {
  return num.replace(/\//g, '_').replace(/\s+/g, '-')
}

export function receiptStoragePath(
  gymId: string,
  receiptNumber: string,
): string {
  return `${gymId}/receipts/${sanitizeNumber(receiptNumber)}.pdf`
}

export function invoiceStoragePath(
  gymId: string,
  invoiceNumber: string,
): string {
  return `${gymId}/invoices/${sanitizeNumber(invoiceNumber)}.pdf`
}

export function dailyReportStoragePath(
  gymId: string,
  closeDateIso: string,
): string {
  return `${gymId}/daily-reports/${closeDateIso}.pdf`
}

export type GenerateReceiptOptions = {
  paymentId: string
  /** 'receipt' renders the ricevuta non fiscale; 'invoice' renders the fattura. */
  kind: ReceiptKind
  /** Set true for fattura > €77.47 in regime forfettario. */
  withVirtualStamp?: boolean
}

export type GenerateReceiptResult = {
  path: string
  signedUrl: string
}

/**
 * Render the receipt PDF for the given payment, upload to Storage, and
 * persist the path + a fresh signed URL on the payment row.
 */
export async function generateAndStoreReceipt(
  options: GenerateReceiptOptions,
): Promise<GenerateReceiptResult> {
  const admin = createAdminClient()

  // 1) Load the payment + member + subscription + plan.
  const { data: payment, error: paymentErr } = await admin
    .from('payments')
    .select(
      `
        id, gym_id, member_id, subscription_id, amount_cents, payment_method,
        receipt_number, invoice_number, paid_at, notes,
        member:profiles!payments_member_id_fkey(
          id, full_name, email, phone, fiscal_code,
          address, city, province, postal_code
        ),
        subscription:subscriptions!payments_subscription_id_fkey(
          id, start_date, end_date,
          plan:subscription_plans!subscriptions_plan_id_fkey(
            id, name, duration_days
          )
        )
      `,
    )
    .eq('id', options.paymentId)
    .single<{
      id: string
      gym_id: string
      member_id: string
      subscription_id: string | null
      amount_cents: number
      payment_method: string
      receipt_number: string | null
      invoice_number: string | null
      paid_at: string | null
      notes: string | null
      member: {
        id: string
        full_name: string
        email: string
        phone: string | null
        fiscal_code: string | null
        address: string | null
        city: string | null
        province: string | null
        postal_code: string | null
      } | null
      subscription: {
        id: string
        start_date: string
        end_date: string
        plan: {
          id: string
          name: string
          duration_days: number
        } | null
      } | null
    }>()

  if (paymentErr || !payment) {
    throw new Error(
      `Payment ${options.paymentId} not found: ${paymentErr?.message ?? ''}`,
    )
  }
  if (!payment.member) {
    throw new Error(`Payment ${options.paymentId} missing member`)
  }
  if (!payment.subscription || !payment.subscription.plan) {
    throw new Error(
      `Payment ${options.paymentId} missing subscription/plan join`,
    )
  }

  const documentNumber =
    options.kind === 'invoice'
      ? payment.invoice_number
      : payment.receipt_number
  if (!documentNumber) {
    throw new Error(
      `Cannot generate ${options.kind}: payment ${options.paymentId} has no ${
        options.kind === 'invoice' ? 'invoice_number' : 'receipt_number'
      }`,
    )
  }

  // 2) Load gym master data for the header.
  const { data: gym, error: gymErr } = await admin
    .from('gyms')
    .select(
      'name, address, city, province, postal_code, email, phone, vat_number, fiscal_code',
    )
    .eq('id', payment.gym_id)
    .single()
  if (gymErr || !gym) {
    throw new Error(
      `Gym ${payment.gym_id} not found: ${gymErr?.message ?? ''}`,
    )
  }

  // 3) Render the PDF.
  const buffer = await renderToBuffer(
    ReceiptDocument({
      kind: options.kind,
      gym,
      member: payment.member,
      plan: payment.subscription.plan,
      payment: {
        receipt_number: payment.receipt_number,
        invoice_number: payment.invoice_number,
        amount_cents: payment.amount_cents,
        payment_method: payment.payment_method,
        paid_at: payment.paid_at,
        notes: payment.notes,
      },
      subscriptionPeriod: {
        start: payment.subscription.start_date,
        end: payment.subscription.end_date,
      },
      withVirtualStamp:
        options.kind === 'invoice' &&
        (options.withVirtualStamp ?? payment.amount_cents > 7747),
    }),
  )

  // 4) Upload to Storage.
  const path =
    options.kind === 'invoice'
      ? invoiceStoragePath(payment.gym_id, documentNumber)
      : receiptStoragePath(payment.gym_id, documentNumber)

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

  // 5) Mint a signed URL.
  const { data: signed, error: signErr } = await admin.storage
    .from(RECEIPT_BUCKET_NAME)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (signErr || !signed?.signedUrl) {
    throw new Error(
      `Signed URL failed: ${signErr?.message ?? 'unknown error'}`,
    )
  }

  // 6) Persist path + URL on the payment row.
  const updatePayload =
    options.kind === 'invoice'
      ? { invoice_pdf_path: path, invoice_pdf_url: signed.signedUrl }
      : { receipt_pdf_path: path, receipt_pdf_url: signed.signedUrl }

  const { error: updateErr } = await admin
    .from('payments')
    .update(updatePayload)
    .eq('id', options.paymentId)
  if (updateErr) {
    // Non-fatal: the PDF is uploaded; we just couldn't pin the URL on the row.
    console.error(
      '[pdf/generate-receipt] payment update failed:',
      updateErr.message,
    )
  }

  return { path, signedUrl: signed.signedUrl }
}

/**
 * Mint a fresh signed URL for an existing receipt/invoice path. Used by the
 * "scarica ricevuta" button to avoid serving stale URLs.
 */
export async function createSignedReceiptUrl(
  path: string,
  ttlSeconds: number = SIGNED_URL_TTL_SECONDS,
): Promise<string> {
  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from(RECEIPT_BUCKET_NAME)
    .createSignedUrl(path, ttlSeconds)
  if (error || !data?.signedUrl) {
    throw new Error(`Signed URL failed: ${error?.message ?? 'unknown error'}`)
  }
  return data.signedUrl
}
