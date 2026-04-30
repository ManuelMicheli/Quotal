/**
 * Welcome email — sent right after signup or first paid subscription.
 *
 * Italian copy. Uses the gym's brand colour for the CTA. Plan summary +
 * end date are optional (not every signup has a subscription yet).
 */
import * as React from 'react'

import { EmailLayout, type GymBrand } from './_components/email-layout'
import { CTAButton, H1, P, Strong, InfoBox } from './_components/primitives'
import { formatDate } from '../lib/format'

export type WelcomeProps = {
  member: { full_name: string; email: string }
  gym: GymBrand
  plan?: { name: string; price_cents: number } | null
  end_date?: string | null
  app_url: string
}

export default function WelcomeEmail({
  member,
  gym,
  plan,
  end_date,
  app_url,
}: WelcomeProps) {
  const firstName = member.full_name.split(' ')[0] ?? member.full_name
  return (
    <EmailLayout
      preview={`Benvenuto in ${gym.name}! Il tuo accesso è pronto.`}
      gym={gym}
    >
      <H1>Benvenuto, {firstName}!</H1>
      <P>
        Il tuo profilo è attivo presso <Strong>{gym.name}</Strong>. Da oggi
        puoi gestire l&apos;abbonamento, vedere i pagamenti e accedere alla
        sala con il QR code direttamente dall&apos;app.
      </P>

      {plan && (
        <InfoBox>
          <Strong>Piano scelto:</Strong> {plan.name}
          {end_date && (
            <>
              <br />
              <Strong>Valido fino al:</Strong> {formatDate(end_date, 'long')}
            </>
          )}
        </InfoBox>
      )}

      <P>
        Apri l&apos;app e salvala sulla schermata Home: in questo modo avrai
        sempre il tuo QR di accesso a portata di mano.
      </P>

      <CTAButton href={`${app_url}/app`} color={gym.brand_color}>
        Apri la mia app
      </CTAButton>

      <P>A presto in palestra!</P>
    </EmailLayout>
  )
}
