/**
 * Expiry reminder — 7 days before subscription end date.
 */
import * as React from 'react'

import { EmailLayout, type GymBrand } from './_components/email-layout'
import { CTAButton, H1, P, Strong, InfoBox } from './_components/primitives'
import { formatDate } from '../lib/format'

export type ExpiryReminderProps = {
  member: { full_name: string }
  gym: GymBrand
  end_date: string
  plan?: { name: string } | null
  app_url: string
}

export default function Expiry7dEmail({
  member,
  gym,
  end_date,
  plan,
  app_url,
}: ExpiryReminderProps) {
  const firstName = member.full_name.split(' ')[0] ?? member.full_name
  return (
    <EmailLayout
      preview={`Il tuo abbonamento scade tra 7 giorni — ${formatDate(end_date, 'long')}`}
      gym={gym}
    >
      <H1>Il tuo abbonamento scade tra 7 giorni</H1>
      <P>Ciao {firstName},</P>
      <P>
        Ti scriviamo per ricordarti che il tuo abbonamento{' '}
        {plan && (
          <>
            <Strong>{plan.name}</Strong>{' '}
          </>
        )}
        presso <Strong>{gym.name}</Strong> scade il{' '}
        <Strong>{formatDate(end_date, 'long')}</Strong>.
      </P>

      <InfoBox>
        Rinnovare in anticipo ti permette di non perdere giorni di
        allenamento e mantenere la continuità del tuo percorso.
      </InfoBox>

      <CTAButton
        href={`${app_url}/app/abbonamento/rinnova`}
        color={gym.brand_color}
      >
        Rinnova ora
      </CTAButton>

      <P>
        Se hai dubbi sul rinnovo o vuoi cambiare piano, rispondi a questa
        email o passa in segreteria.
      </P>
    </EmailLayout>
  )
}
