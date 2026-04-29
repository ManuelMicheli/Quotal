/**
 * Open a Stripe Billing Portal session for the signed-in member.
 *
 * GET /app/pagamenti/portal → 302 to portal.url
 *
 * Members can use the portal to revoke their SEPA mandate or view past
 * invoices. Owners hitting this redirect get sent to /login by middleware
 * (this file lives under `(member)`, which is gated to role=member).
 */
import { NextResponse } from 'next/server'

import { requireMember } from '@/lib/auth'
import { env } from '@/lib/env'
import { getStripe } from '@/lib/stripe/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const member = await requireMember()
  if (!member.stripe_customer_id) {
    return NextResponse.redirect(`${env.APP_URL}/app?portal=missing`)
  }
  const stripe = getStripe()
  const portal = await stripe.billingPortal.sessions.create({
    customer: member.stripe_customer_id,
    return_url: `${env.APP_URL}/app`,
  })
  return NextResponse.redirect(portal.url)
}
