'use client'

/**
 * Form for the owner's own profile (full name + email) plus a CTA to send
 * the password-reset email to themselves.
 */
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import {
  sendPasswordResetForOwnerAction,
  updateOwnerProfileAction,
} from '@/app/actions/owner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Profile } from '@/lib/domain-types'

export function OwnerProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const [resetting, startResetTransition] = React.useTransition()
  const [fullName, setFullName] = React.useState(profile.full_name ?? '')
  const [phone, setPhone] = React.useState(profile.phone ?? '')

  function onSave(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const r = await updateOwnerProfileAction({
        full_name: fullName,
        phone: phone || null,
      })
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success(r.message ?? 'Salvato.')
      router.refresh()
    })
  }

  function onSendReset() {
    startResetTransition(async () => {
      const r = await sendPasswordResetForOwnerAction()
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success(
        r.message ??
          'Email inviata. Controlla la posta per impostare la nuova password.',
      )
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dati personali</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSave} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="profile-name">Nome completo</Label>
              <Input
                id="profile-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                minLength={2}
              />
            </div>
            <div>
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                value={profile.email}
                disabled
                className="bg-muted"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Per cambiare email contatta l&apos;assistenza.
              </p>
            </div>
            <div>
              <Label htmlFor="profile-phone">Telefono</Label>
              <Input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Salvataggio…' : 'Salva modifiche'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Ti invieremo un link per impostare una nuova password. Non serve
            la vecchia.
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={resetting}
            onClick={onSendReset}
          >
            {resetting ? 'Invio in corso…' : 'Invia email di reset password'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
