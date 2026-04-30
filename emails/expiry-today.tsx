/**
 * Expiry reminder — same day as subscription end date.
 * Maximally urgent.
 */
import * as React from 'react'

import { EmailLayout } from './_components/email-layout'
import { CTAButton, H1, P, Strong } from './_components/primitives'
import { formatDate } from '../lib/format'

import type { ExpiryReminderProps } from './expiry-7d'

export default function ExpiryTodayEmail({
  member,
  gym,
  end_date,
  app_url,
}: ExpiryReminderProps) {
  const firstName = member.full_name.split(' ')[0] ?? member.full_name
  return (
    <EmailLayout
      preview={`Ultimo giorno utile — l'abbonamento scade oggi`}
      gym={gym}
    >
      <H1>Oggi è l&apos;ultimo giorno</H1>
      <P>Ciao {firstName},</P>
      <P>
        Il tuo abbonamento presso <Strong>{gym.name}</Strong> scade
        <Strong> oggi</Strong> ({formatDate(end_date, 'long')}). Da domani
        l&apos;accesso non sarà più garantito.
      </P>

      <CTAButton
        href={`${app_url}/app/abbonamento/rinnova`}
        color={gym.brand_color}
      >
        Rinnova adesso
      </CTAButton>

      <P>
        Se rinnovi oggi non perdi nemmeno un giorno: la nuova scadenza
        partirà dal giorno successivo a quello attuale.
      </P>
    </EmailLayout>
  )
}
