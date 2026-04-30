/**
 * Post-expiry reminder — 3 days after subscription end date.
 * Grace period is over by now (default 3 days). Friendly but final.
 */
import * as React from 'react'

import { EmailLayout } from './_components/email-layout'
import { CTAButton, H1, P, Strong, InfoBox } from './_components/primitives'
import { formatDate } from '../lib/format'

import type { ExpiryReminderProps } from './expiry-7d'

export default function PostExpiry3dEmail({
  member,
  gym,
  end_date,
  app_url,
}: ExpiryReminderProps) {
  const firstName = member.full_name.split(' ')[0] ?? member.full_name
  return (
    <EmailLayout
      preview={`Il tuo abbonamento è scaduto da 3 giorni — riattiva subito`}
      gym={gym}
    >
      <H1>Ti aspettiamo in palestra</H1>
      <P>Ciao {firstName},</P>
      <P>
        Il tuo abbonamento presso <Strong>{gym.name}</Strong> è scaduto il{' '}
        <Strong>{formatDate(end_date, 'long')}</Strong> e il periodo di
        cortesia è terminato.
      </P>

      <InfoBox>
        Riattivare l&apos;abbonamento è semplice — basta un nuovo pagamento
        e potrai tornare ad allenarti subito.
      </InfoBox>

      <CTAButton
        href={`${app_url}/app/abbonamento/rinnova`}
        color={gym.brand_color}
      >
        Riattiva il mio abbonamento
      </CTAButton>

      <P>
        Se hai cambiato idea o ti serve aiuto, rispondi a questa email: ci
        farà piacere risentirti.
      </P>
    </EmailLayout>
  )
}
