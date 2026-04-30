/**
 * Open a Stripe Billing Portal session for the signed-in member.
 *
 * GET /app/pagamenti/portal → 302 to portal.url
 *
 * On any failure (no Stripe customer, portal not configured, network)
 * redirects back to /app/pagamenti?portal=<reason> so the UI can surface
 * the error instead of throwing a 500.
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
    return NextResponse.redirect(
      `${env.APP_URL}/app/pagamenti?portal=missing`,
    )
  }
  try {
    const stripe = getStripe()
    const portal = await stripe.billingPortal.sessions.create({
      customer: member.stripe_customer_id,
      return_url: `${env.APP_URL}/app/pagamenti`,
    })
    return NextResponse.redirect(portal.url)
  } catch (err) {
    console.error('[member/portal] stripe billingPortal failed:', err)
    return NextResponse.redirect(
      `${env.APP_URL}/app/pagamenti?portal=error`,
    )
  }
}
