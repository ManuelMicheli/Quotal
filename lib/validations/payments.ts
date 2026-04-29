/**
 * Zod schemas for the Phase 05 payment flow.
 *
 * Server-action inputs only — the public `/pay/[token]` page validates the
 * token via the loader, and the client form posts already-validated state
 * back to a typed action.
 */
import { z } from 'zod'

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
