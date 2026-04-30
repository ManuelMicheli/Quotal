/**
 * Payment receipt email — short note + PDF attachment (passed by the
 * dispatcher via Resend's `attachments` field).
 */
import * as React from 'react'

import { EmailLayout, type GymBrand } from './_components/email-layout'
import { H1, P, Strong, InfoBox } from './_components/primitives'
import { formatCurrency, formatDate } from '../lib/format'

export type ReceiptProps = {
  member: { full_name: string }
  gym: GymBrand
  receipt_number: string
  amount_cents: number
  paid_at: string
  payment_method: string
  app_url: string
}

const METHOD_LABEL: Record<string, string> = {
  card: 'Carta',
  sepa: 'SEPA Direct Debit',
  cash: 'Contanti',
  bank_transfer: 'Bonifico',
}

export default function ReceiptEmail({
  member,
  gym,
  receipt_number,
  amount_cents,
  paid_at,
  payment_method,
}: ReceiptProps) {
  const firstName = member.full_name.split(' ')[0] ?? member.full_name
  return (
    <EmailLayout
      preview={`Ricevuta ${receipt_number} — ${formatCurrency(amount_cents)}`}
      gym={gym}
    >
      <H1>Ricevuta {receipt_number}</H1>
      <P>Ciao {firstName},</P>
      <P>
        In allegato trovi la ricevuta del pagamento effettuato presso{' '}
        <Strong>{gym.name}</Strong>.
      </P>

      <InfoBox>
        <Strong>Numero ricevuta:</Strong> {receipt_number}
        <br />
        <Strong>Importo:</Strong> {formatCurrency(amount_cents)}
        <br />
        <Strong>Data:</Strong> {formatDate(paid_at, 'long')}
        <br />
        <Strong>Metodo:</Strong>{' '}
        {METHOD_LABEL[payment_method] ?? payment_method}
      </InfoBox>

      <P>
        Conserva questa email per i tuoi record. Se hai bisogno di una
        fattura intestata, scrivi a{' '}
        <a href={`mailto:${gym.email}`}>{gym.email}</a>.
      </P>
    </EmailLayout>
  )
}
