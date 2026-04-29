'use client'

/**
 * "Password dimenticata?" dialog. Lives next to the login form — keeps the
 * flow inline so the user doesn't have to navigate away from /login.
 *
 * Falls back to `/reset-password` (a dedicated page in the (auth) group)
 * when JS is disabled — that page renders the same form non-modally.
 */
import { useState, useTransition } from 'react'

import { resetPasswordAction } from '@/app/actions/auth'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ResetPasswordDialog({
  defaultEmail,
  trigger,
}: {
  defaultEmail?: string
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState(defaultEmail ?? '')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    const formData = new FormData()
    formData.set('email', email)

    startTransition(async () => {
      const result = await resetPasswordAction(formData)
      if (result.ok) {
        setSuccess(result.message ?? 'Email inviata.')
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setError(null)
          setSuccess(null)
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reimposta la password</DialogTitle>
          <DialogDescription>
            Inserisci la tua email: ti invieremo un link per reimpostare la
            password.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@esempio.it"
            />
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {success ? (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Invio…' : 'Invia link'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
