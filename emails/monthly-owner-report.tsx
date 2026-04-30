/**
 * Monthly KPI digest for the owner. Cron ships this on the 1st of every
 * month (covering the previous month). PDF report attached.
 */
import * as React from 'react'

import { EmailLayout, type GymBrand } from './_components/email-layout'
import { CTAButton, H1, P, Strong, InfoBox } from './_components/primitives'
import { formatCurrency } from '../lib/format'

export type MonthlyOwnerReportProps = {
  member: { full_name: string }
  gym: GymBrand
  month_label: string
  total_revenue_cents: number
  new_members: number
  active_members: number
  expired_members: number
  app_url: string
}

export default function MonthlyOwnerReportEmail({
  member,
  gym,
  month_label,
  total_revenue_cents,
  new_members,
  active_members,
  expired_members,
  app_url,
}: MonthlyOwnerReportProps) {
  const firstName = member.full_name.split(' ')[0] ?? member.full_name
  return (
    <EmailLayout
      preview={`Report ${month_label} — ${gym.name}`}
      gym={gym}
    >
      <H1>Report mensile · {month_label}</H1>
      <P>Ciao {firstName},</P>
      <P>
        Ecco una sintesi dei numeri di <Strong>{gym.name}</Strong> per il
        mese di <Strong>{month_label}</Strong>. Trovi il dettaglio
        completo in PDF allegato.
      </P>

      <InfoBox>
        <Strong>Incassi totali:</Strong>{' '}
        {formatCurrency(total_revenue_cents)}
        <br />
        <Strong>Nuovi membri:</Strong> {new_members}
        <br />
        <Strong>Membri attivi a fine mese:</Strong> {active_members}
        <br />
        <Strong>Abbonamenti scaduti nel mese:</Strong> {expired_members}
      </InfoBox>

      <CTAButton
        href={`${app_url}/dashboard/pagamenti`}
        color={gym.brand_color}
      >
        Apri i pagamenti
      </CTAButton>
    </EmailLayout>
  )
}
