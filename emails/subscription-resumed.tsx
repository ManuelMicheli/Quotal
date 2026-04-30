/**
 * Subscription resumed after a suspension.
 */
import * as React from 'react'

import { EmailLayout, type GymBrand } from './_components/email-layout'
import { CTAButton, H1, P, Strong, InfoBox } from './_components/primitives'
import { formatDate } from '../lib/format'

export type SubscriptionResumedProps = {
  member: { full_name: string }
  gym: GymBrand
  end_date: string
  days_added?: number | null
  app_url: string
}

export default function SubscriptionResumedEmail({
  member,
  gym,
  end_date,
  days_added,
  app_url,
}: SubscriptionResumedProps) {
  const firstName = member.full_name.split(' ')[0] ?? member.full_name
  return (
    <EmailLayout
      preview={`Bentornato — abbonamento riattivato`}
      gym={gym}
    >
      <H1>Bentornato {firstName}!</H1>
      <P>
        Il tuo abbonamento presso <Strong>{gym.name}</Strong> è stato
        riattivato. Puoi tornare ad allenarti da subito.
      </P>

      <InfoBox>
        <Strong>Nuova scadenza:</Strong> {formatDate(end_date, 'long')}
        {days_added && days_added > 0 && (
          <>
            <br />
            <Strong>Giorni aggiunti per la sospensione:</Strong>{' '}
            {days_added}
          </>
        )}
      </InfoBox>

      <CTAButton href={`${app_url}/app`} color={gym.brand_color}>
        Apri la mia app
      </CTAButton>
    </EmailLayout>
  )
}
