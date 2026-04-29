/**
 * Zod schemas for the Phase 05 + 06 payment flow.
 *
 * Server-action inputs only — the public `/pay/[token]` page validates the
 * token via the loader, and the client form posts already-validated state
 * back to a typed action.
 */
import { z } from 'zod'

import { isValidCodiceFiscale } from '@/lib/format'

export const createPaymentSessionSchema = z.object({
  member_id: z.string().uuid('ID membro non valido'),
  plan_id: z.string().uuid('Seleziona un piano'),
})
export type CreatePaymentSessionInput = z.infer<
  typeof createPaymentSessionSchema
>

export const initiateCardPaymentSchema = z.object({
  token: z.string().min(10, 'Token non valido'),
})
export type InitiateCardPaymentInput = z.infer<
  typeof initiateCardPaymentSchema
>

export const initiateSepaSetupSchema = z.object({
  token: z.string().min(10, 'Token non valido'),
  auto_renew: z.boolean(),
})
export type InitiateSepaSetupInput = z.infer<typeof initiateSepaSetupSchema>

export const confirmPaymentSchema = z.object({
  token: z.string().min(10, 'Token non valido'),
  payment_intent_id: z.string().optional(),
  setup_intent_id: z.string().optional(),
})
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>

export const refundPaymentSchema = z.object({
  payment_id: z.string().uuid('ID pagamento non valido'),
})
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>

export const triggerSepaRenewalSchema = z.object({
  subscription_id: z.string().uuid('ID abbonamento non valido'),
})
export type TriggerSepaRenewalInput = z.infer<typeof triggerSepaRenewalSchema>

// ---------------------------------------------------------------------------
// Phase 06 — cash / bank-transfer payment registration
// ---------------------------------------------------------------------------

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/

export const registerCashPaymentSchema = z
  .object({
    member_id: z.string().uuid('ID membro non valido'),
    plan_id: z.string().uuid('Seleziona un piano'),
    start_date: z
      .string()
      .regex(isoDateRegex, 'Data non valida')
      .optional(),
    amount_cents: z
      .number({ message: 'Inserisci l’importo' })
      .int('L’importo deve essere in centesimi (intero)')
      .min(0, 'L’importo non può essere negativo'),
    payment_method: z.enum(['cash', 'bank_transfer'], {
      message: 'Seleziona un metodo di pagamento',
    }),
    notes: z
      .string()
      .trim()
      .max(500, 'Massimo 500 caratteri')
      .optional()
      .transform((v) => (v && v.length > 0 ? v : undefined)),
    emit_invoice: z.boolean().optional().default(false),
    invoice_fiscal_code: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v && v.length > 0 ? v.toUpperCase() : undefined)),
  })
  .superRefine((data, ctx) => {
    if (data.emit_invoice) {
      if (!data.invoice_fiscal_code) {
        ctx.addIssue({
          code: 'custom',
          path: ['invoice_fiscal_code'],
          message: 'Codice fiscale obbligatorio per emettere fattura',
        })
      } else if (!isValidCodiceFiscale(data.invoice_fiscal_code)) {
        ctx.addIssue({
          code: 'custom',
          path: ['invoice_fiscal_code'],
          message: 'Codice fiscale non valido',
        })
      }
    }
  })
export type RegisterCashPaymentInput = z.infer<
  typeof registerCashPaymentSchema
>

export const refundCashPaymentSchema = z.object({
  payment_id: z.string().uuid('ID pagamento non valido'),
  reason: z
    .string()
    .trim()
    .max(500, 'Massimo 500 caratteri')
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
})
export type RefundCashPaymentInput = z.infer<typeof refundCashPaymentSchema>

export const closeCashAction = z.object({
  close_date: z
    .string()
    .regex(isoDateRegex, 'Data non valida')
    .optional(),
  notes: z
    .string()
    .trim()
    .max(500, 'Massimo 500 caratteri')
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
})
export type CloseCashInput = z.infer<typeof closeCashAction>
