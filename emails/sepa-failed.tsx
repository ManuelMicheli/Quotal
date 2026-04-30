/**
 * SEPA payment failed notification.
 */
import * as React from 'react'

import { EmailLayout, type GymBrand } from './_components/email-layout'
import { CTAButton, H1, P, Strong, InfoBox } from './_components/primitives'
import { formatCurrency } from '../lib/format'

export type SepaFailedProps = {
  member: { full_name: string }
  gym: GymBrand
  amount_cents: number
  failure_reason?: string | null
  app_url: string
}

export default function SepaFailedEmail({
  member,
  gym,
  amount_cents,
  failure_reason,
  app_url,
}: SepaFailedProps) {
  const firstName = member.full_name.split(' ')[0] ?? member.full_name
  return (
    <EmailLayout
      preview={`Addebito SEPA non riuscito — aggiorna il metodo di pagamento`}
      gym={gym}
    >
      <H1>Addebito SEPA non riuscito</H1>
      <P>Ciao {firstName},</P>
      <P>
        L&apos;addebito di <Strong>{formatCurrency(amount_cents)}</Strong>{' '}
        per il tuo abbonamento presso <Strong>{gym.name}</Strong> non è
        andato a buon fine.
      </P>

      {failure_reason && (
        <InfoBox>
          <Strong>Motivo segnalato dalla banca:</Strong> {failure_reason}
        </InfoBox>
      )}

      <P>
        Verificheremo nuovamente nei prossimi giorni. Per evitare la
        sospensione del servizio, controlla che il conto associato abbia
        fondi sufficienti o aggiorna il metodo di pagamento.
      </P>

      <CTAButton
        href={`${app_url}/app/profilo`}
        color={gym.brand_color}
      >
        Aggiorna metodo di pagamento
      </CTAButton>
    </EmailLayout>
  )
}
