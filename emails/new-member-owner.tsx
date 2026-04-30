/**
 * Owner alert — a new member signed up via the public signup flow
 * (off by default; toggle in /dashboard/impostazioni/notifiche).
 */
import * as React from 'react'

import { EmailLayout, type GymBrand } from './_components/email-layout'
import { CTAButton, H1, P, Strong, InfoBox } from './_components/primitives'

export type NewMemberOwnerProps = {
  member: { full_name: string }
  gym: GymBrand
  new_member: { full_name: string; email: string }
  app_url: string
}

export default function NewMemberOwnerEmail({
  member,
  gym,
  new_member,
  app_url,
}: NewMemberOwnerProps) {
  const firstName = member.full_name.split(' ')[0] ?? member.full_name
  return (
    <EmailLayout preview={`Nuovo membro — ${new_member.full_name}`} gym={gym}>
      <H1>Nuovo membro registrato</H1>
      <P>Ciao {firstName},</P>
      <P>
        Una nuova persona si è registrata presso{' '}
        <Strong>{gym.name}</Strong>.
      </P>

      <InfoBox>
        <Strong>Nome:</Strong> {new_member.full_name}
        <br />
        <Strong>Email:</Strong> {new_member.email}
      </InfoBox>

      <CTAButton href={`${app_url}/dashboard/membri`} color={gym.brand_color}>
        Apri elenco membri
      </CTAButton>
    </EmailLayout>
  )
}
