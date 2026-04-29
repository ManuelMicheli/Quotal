'use client'

/**
 * Manual SEPA auto-renewal trigger button.
 *
 * Cron lands in Phase 09; for now the owner clicks this for any subscription
 * with `auto_renew=true && payment_method='sepa'` near expiry.
 */
import { RefreshCwIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import { triggerSepaRenewalAction } from '@/app/actions/payments'
import { Button } from '@/components/ui/button'

export function TriggerRenewalButton({
  subscriptionId,
}: {
  subscriptionId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  function trigger() {
    startTransition(async () => {
      const r = await triggerSepaRenewalAction({
        subscription_id: subscriptionId,
      })
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success(r.message ?? 'Addebito SEPA in corso')
      router.refresh()
    })
  }

  return (
    <Button onClick={trigger} disabled={isPending} variant="outline" size="sm">
      <RefreshCwIcon className="mr-2 size-4" />
      {isPending ? 'Avvio…' : 'Rinnova ora (SEPA)'}
    </Button>
  )
}
