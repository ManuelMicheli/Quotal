/**
 * Expiry reminder — 3 days before subscription end date.
 * More urgent tone than the 7d reminder.
 */
import * as React from 'react'

import { EmailLayout } from './_components/email-layout'
import { CTAButton, H1, P, Strong, InfoBox } from './_components/primitives'
import { formatDate } from '../lib/format'

import type { ExpiryReminderProps } from './expiry-7d'

export default function Expiry3dEmail({
  member,
  gym,
  end_date,
  plan,
  app_url,
}: ExpiryReminderProps) {
  const firstName = member.full_name.split(' ')[0] ?? member.full_name
  return (
    <EmailLayout
      preview={`Solo 3 giorni — il tuo abbonamento scade il ${formatDate(end_date, 'long')}`}
      gym={gym}
    >
      <H1>Solo 3 giorni rimasti</H1>
      <P>Ciao {firstName},</P>
      <P>
        Mancano <Strong>3 giorni</Strong> alla scadenza del tuo abbonamento
        {plan && (
          <>
            {' '}
            <Strong>{plan.name}</Strong>
          </>
        )}{' '}
        presso <Strong>{gym.name}</Strong>: il{' '}
        <Strong>{formatDate(end_date, 'long')}</Strong> sarà il tuo ultimo
        giorno di accesso senza rinnovo.
      </P>

      <InfoBox>
        Rinnova ora per restare attivo. Bastano pochi secondi
        dall&apos;app.
      </InfoBox>

      <CTAButton
        href={`${app_url}/app/abbonamento/rinnova`}
        color={gym.brand_color}
      >
        Rinnova in un tap
      </CTAButton>

      <P>Ci vediamo in palestra.</P>
    </EmailLayout>
  )
}
