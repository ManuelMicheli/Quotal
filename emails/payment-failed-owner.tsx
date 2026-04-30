/**
 * Owner alert — a member's payment failed (typically SEPA).
 */
import * as React from 'react'

import { EmailLayout, type GymBrand } from './_components/email-layout'
import { CTAButton, H1, P, Strong, InfoBox } from './_components/primitives'
import { formatCurrency } from '../lib/format'

export type PaymentFailedOwnerProps = {
  member: { full_name: string }
  gym: GymBrand
  failed_member_name: string
  amount_cents: number
  failure_reason?: string | null
  payment_id: string
  app_url: string
}

export default function PaymentFailedOwnerEmail({
  member,
  gym,
  failed_member_name,
  amount_cents,
  failure_reason,
  payment_id,
  app_url,
}: PaymentFailedOwnerProps) {
  const firstName = member.full_name.split(' ')[0] ?? member.full_name
  return (
    <EmailLayout
      preview={`Pagamento fallito — ${failed_member_name}`}
      gym={gym}
    >
      <H1>Pagamento fallito</H1>
      <P>Ciao {firstName},</P>
      <P>
        Un addebito presso <Strong>{gym.name}</Strong> non è andato a buon
        fine.
      </P>

      <InfoBox>
        <Strong>Membro:</Strong> {failed_member_name}
        <br />
        <Strong>Importo:</Strong> {formatCurrency(amount_cents)}
        {failure_reason && (
          <>
            <br />
            <Strong>Motivo:</Strong> {failure_reason}
          </>
        )}
      </InfoBox>

      <P>
        Il sistema effettuerà fino a 3 tentativi automatici nei prossimi
        giorni. Nel frattempo puoi contattare il membro o registrare un
        pagamento alternativo.
      </P>

      <CTAButton
        href={`${app_url}/dashboard/pagamenti?id=${payment_id}`}
        color={gym.brand_color}
      >
        Apri il pagamento
      </CTAButton>
    </EmailLayout>
  )
}
