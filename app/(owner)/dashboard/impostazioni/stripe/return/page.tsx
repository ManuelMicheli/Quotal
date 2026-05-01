/**
 * Landing page hit by Stripe after the owner finishes (or pauses) the
 * Express onboarding flow. We refresh the cached account state and bounce
 * straight to the main Stripe settings page so the badge updates without
 * the owner having to refresh by hand.
 */
import { redirect } from 'next/navigation'

import { refreshStripeStatusAction } from '@/app/actions/stripe-connect'
import { requireOwnerOrStaff } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function StripeReturnPage() {
  await requireOwnerOrStaff()
  await refreshStripeStatusAction()
  redirect('/dashboard/impostazioni/stripe')
}
