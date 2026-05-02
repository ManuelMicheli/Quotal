'use client'

import { TrashIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

import { deleteWorkoutPlanAction } from '@/app/actions/owner'
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

export function DeleteWorkoutPlanButton({
  planId,
  redirectTo,
}: {
  planId: string
  redirectTo?: string
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()

  function confirm() {
    startTransition(async () => {
      const r = await deleteWorkoutPlanAction(planId)
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success(r.message ?? 'Scheda eliminata.')
      setOpen(false)
      if (redirectTo) {
        router.push(redirectTo)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive">
          <TrashIcon className="size-4" />
          Elimina
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminare la scheda?</DialogTitle>
          <DialogDescription>
            La scheda verrà rimossa e non sarà più visibile al membro.
            L&apos;operazione è irreversibile.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Annulla
          </Button>
          <Button
            variant="destructive"
            onClick={confirm}
            disabled={isPending}
          >
            {isPending ? 'Eliminazione…' : 'Elimina scheda'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
