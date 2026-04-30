/**
 * Subscription suspended (e.g. medical leave).
 */
import * as React from 'react'

import { EmailLayout, type GymBrand } from './_components/email-layout'
import { H1, P, Strong, InfoBox } from './_components/primitives'

export type SubscriptionSuspendedProps = {
  member: { full_name: string }
  gym: GymBrand
  reason?: string | null
  app_url: string
}

export default function SubscriptionSuspendedEmail({
  member,
  gym,
  reason,
}: SubscriptionSuspendedProps) {
  const firstName = member.full_name.split(' ')[0] ?? member.full_name
  return (
    <EmailLayout
      preview={`Il tuo abbonamento è stato sospeso`}
      gym={gym}
    >
      <H1>Abbonamento sospeso</H1>
      <P>Ciao {firstName},</P>
      <P>
        Il tuo abbonamento presso <Strong>{gym.name}</Strong> è stato
        sospeso. Durante la sospensione i giorni non utilizzati vengono
        accumulati e aggiunti alla tua scadenza al rientro.
      </P>

      {reason && (
        <InfoBox>
          <Strong>Motivo:</Strong> {reason}
        </InfoBox>
      )}

      <P>
        Per riattivare l&apos;abbonamento prima del previsto, contattaci o
        passa in segreteria.
      </P>
    </EmailLayout>
  )
}
