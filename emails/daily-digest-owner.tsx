/**
 * Daily digest for the gym owner — sent each morning by the cron.
 * Highlights the day's must-do items.
 */
import * as React from 'react'

import { EmailLayout, type GymBrand } from './_components/email-layout'
import { CTAButton, H1, P, Strong, InfoBox } from './_components/primitives'
import { formatDate } from '../lib/format'

export type DailyDigestOwnerProps = {
  member: { full_name: string }
  gym: GymBrand
  for_date: string
  expiring_today: number
  expiring_7d: number
  failed_payments: number
  pending_cash_close: boolean
  app_url: string
}

export default function DailyDigestOwnerEmail({
  member,
  gym,
  for_date,
  expiring_today,
  expiring_7d,
  failed_payments,
  pending_cash_close,
  app_url,
}: DailyDigestOwnerProps) {
  const firstName = member.full_name.split(' ')[0] ?? member.full_name
  const totalActions =
    expiring_today + failed_payments + (pending_cash_close ? 1 : 0)
  return (
    <EmailLayout
      preview={`Riepilogo del ${formatDate(for_date, 'long')} — ${gym.name}`}
      gym={gym}
    >
      <H1>Riepilogo del {formatDate(for_date, 'long')}</H1>
      <P>Ciao {firstName},</P>
      <P>
        Ecco le cose da tenere d&apos;occhio oggi su{' '}
        <Strong>{gym.name}</Strong>.
        {totalActions === 0 && ' Nessuna azione urgente — buona giornata!'}
      </P>

      <InfoBox>
        <Strong>Scadenze oggi:</Strong> {expiring_today}
        <br />
        <Strong>In scadenza nei prossimi 7 giorni:</Strong> {expiring_7d}
        <br />
        <Strong>Pagamenti falliti:</Strong> {failed_payments}
        <br />
        <Strong>Cassa da chiudere:</Strong>{' '}
        {pending_cash_close ? 'sì' : 'no'}
      </InfoBox>

      <CTAButton href={`${app_url}/dashboard`} color={gym.brand_color}>
        Apri la dashboard
      </CTAButton>

      <P>
        Puoi disattivare questo riepilogo in Impostazioni &raquo; Notifiche.
      </P>
    </EmailLayout>
  )
}
