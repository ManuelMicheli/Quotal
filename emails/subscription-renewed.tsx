/**
 * Subscription renewed (manual or post-payment).
 */
import * as React from 'react'

import { EmailLayout, type GymBrand } from './_components/email-layout'
import { CTAButton, H1, P, Strong, InfoBox } from './_components/primitives'
import { formatDate } from '../lib/format'

export type SubscriptionRenewedProps = {
  member: { full_name: string }
  gym: GymBrand
  end_date: string
  plan?: { name: string } | null
  app_url: string
}

export default function SubscriptionRenewedEmail({
  member,
  gym,
  end_date,
  plan,
  app_url,
}: SubscriptionRenewedProps) {
  const firstName = member.full_name.split(' ')[0] ?? member.full_name
  return (
    <EmailLayout
      preview={`Abbonamento rinnovato fino al ${formatDate(end_date, 'long')}`}
      gym={gym}
    >
      <H1>Abbonamento rinnovato</H1>
      <P>Ciao {firstName},</P>
      <P>
        Il tuo abbonamento{' '}
        {plan && (
          <>
            <Strong>{plan.name}</Strong>{' '}
          </>
        )}
        presso <Strong>{gym.name}</Strong> è stato rinnovato.
      </P>

      <InfoBox>
        <Strong>Nuova scadenza:</Strong> {formatDate(end_date, 'long')}
      </InfoBox>

      <CTAButton href={`${app_url}/app`} color={gym.brand_color}>
        Vai alla mia app
      </CTAButton>
    </EmailLayout>
  )
}
