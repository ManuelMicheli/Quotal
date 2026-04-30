/**
 * SEPA renewal succeeded — confirmation that the auto-renewal went through.
 */
import * as React from 'react'

import { EmailLayout, type GymBrand } from './_components/email-layout'
import { H1, P, Strong, InfoBox } from './_components/primitives'
import { formatCurrency, formatDate } from '../lib/format'

export type SepaSucceededProps = {
  member: { full_name: string }
  gym: GymBrand
  amount_cents: number
  end_date: string
  receipt_number?: string | null
  app_url: string
}

export default function SepaSucceededEmail({
  member,
  gym,
  amount_cents,
  end_date,
  receipt_number,
}: SepaSucceededProps) {
  const firstName = member.full_name.split(' ')[0] ?? member.full_name
  return (
    <EmailLayout
      preview={`Pagamento ricevuto — abbonamento valido fino al ${formatDate(end_date, 'long')}`}
      gym={gym}
    >
      <H1>Rinnovo automatico riuscito</H1>
      <P>Ciao {firstName},</P>
      <P>
        Abbiamo ricevuto il pagamento di{' '}
        <Strong>{formatCurrency(amount_cents)}</Strong> per il tuo
        abbonamento presso <Strong>{gym.name}</Strong>. Grazie per la
        continuità.
      </P>

      <InfoBox>
        <Strong>Nuova scadenza:</Strong> {formatDate(end_date, 'long')}
        {receipt_number && (
          <>
            <br />
            <Strong>Ricevuta:</Strong> {receipt_number}
          </>
        )}
      </InfoBox>

      <P>
        Riceverai a breve la ricevuta in PDF allegata in una email separata.
      </P>
    </EmailLayout>
  )
}
