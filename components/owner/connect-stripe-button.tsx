'use client'

import { ArrowUpRightIcon } from 'lucide-react'
import { useState, useTransition } from 'react'

import { connectStripeAction } from '@/app/actions/stripe-connect'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

/**
 * Owner-side trigger that creates the gym's Stripe Express account (if
 * missing) and redirects to the Stripe-hosted onboarding URL. Used both
 * for the first-time connect and for resuming an interrupted KYC flow.
 */
export function ConnectStripeButton({
  variant = 'default',
  label,
}: {
  variant?: 'default' | 'outline'
  label?: string
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await connectStripeAction()
      // Successful path redirects from the server, so we only see a return
      // value when something failed on our side.
      if (result && !result.ok) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant={variant}
        onClick={handleClick}
        disabled={pending}
      >
        {pending ? 'Reindirizzamento…' : (label ?? 'Connetti Stripe')}
        {!pending ? <ArrowUpRightIcon className="size-4" /> : null}
      </Button>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
