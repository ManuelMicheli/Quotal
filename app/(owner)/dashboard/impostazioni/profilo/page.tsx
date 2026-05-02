/**
 * Owner profile settings — minimal MVP.
 *
 * The owner can update their displayed name + email and request a password
 * reset. The password reset uses the same flow as `/login → reimposta` from
 * Phase 03 — Supabase sends an email with a one-time recovery link, so we
 * never have to know the user's old password here.
 */
import { ArrowLeftIcon } from 'lucide-react'
import Link from 'next/link'

import { OwnerProfileForm } from '@/components/owner/owner-profile-form'
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderHeading,
} from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { requireOwnerOrStaff } from '@/lib/auth'

export default async function OwnerProfilePage() {
  const profile = await requireOwnerOrStaff()

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 w-fit text-muted-foreground"
      >
        <Link href="/dashboard/impostazioni">
          <ArrowLeftIcon className="size-3.5" />
          Tutte le impostazioni
        </Link>
      </Button>
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Impostazioni</PageHeaderEyebrow>
          <PageHeaderHeading>Il tuo profilo</PageHeaderHeading>
          <PageHeaderDescription>
            Dati personali del titolare e cambio password.
          </PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>
      <OwnerProfileForm profile={profile} />
    </div>
  )
}
