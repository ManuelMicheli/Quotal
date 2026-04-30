'use client'

/**
 * Access devices editor.
 *
 * Lists every device in the gym, lets the owner create/rotate/disable/
 * delete. The cleartext token is shown ONLY in a single dialog right after
 * creation or rotation — once dismissed it's gone forever (only the SHA-256
 * hash remains in the DB).
 */
import {
  CopyIcon,
  KeyRoundIcon,
  PlusIcon,
  RotateCcwIcon,
  Trash2Icon,
} from 'lucide-react'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import {
  createAccessDeviceAction,
  deleteAccessDeviceAction,
  rotateAccessDeviceTokenAction,
  toggleAccessDeviceActiveAction,
  type CreateDeviceInput,
} from '@/app/actions/access'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AccessDevice } from '@/lib/domain-types'
import { formatDate } from '@/lib/format'

const DEVICE_TYPE_LABEL: Record<string, string> = {
  turnstile: 'Tornello',
  tablet: 'Tablet',
  rfid_reader: 'Lettore RFID',
  other: 'Altro',
}

export function AccessDevicesEditor({ devices }: { devices: AccessDevice[] }) {
  const [isPending, startTransition] = React.useTransition()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [shownToken, setShownToken] = React.useState<{
    deviceName: string
    token: string
  } | null>(null)

  function toggleActive(device: AccessDevice) {
    startTransition(async () => {
      const r = await toggleAccessDeviceActiveAction(device.id)
      if (!r.ok) toast.error(r.error)
    })
  }

  function rotate(device: AccessDevice) {
    if (
      !confirm(
        `Rigenerare il token per "${device.name}"? Il vecchio token smetterà di funzionare immediatamente.`,
      )
    )
      return
    startTransition(async () => {
      const r = await rotateAccessDeviceTokenAction(device.id)
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success(r.message ?? 'Token rigenerato.')
      if (r.data) {
        setShownToken({ deviceName: device.name, token: r.data.token })
      }
    })
  }

  function remove(device: AccessDevice) {
    if (
      !confirm(
        `Eliminare il dispositivo "${device.name}"? Le chiamate API con il suo token verranno rifiutate.`,
      )
    )
      return
    startTransition(async () => {
      const r = await deleteAccessDeviceAction(device.id)
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success(r.message ?? 'Dispositivo eliminato.')
    })
  }

  return (
    <>
      <div className="flex items-center justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon className="size-4" />
          Nuovo dispositivo
        </Button>
      </div>

      {devices.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nessun dispositivo registrato. Crea il primo per autorizzare un
            tornello o un tablet a chiamare l&apos;API di verifica accessi.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Ultima attività</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell className="font-medium">{device.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {DEVICE_TYPE_LABEL[device.device_type] ?? device.device_type}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {device.last_seen_at
                      ? `${formatDate(device.last_seen_at, 'short')} ${new Date(device.last_seen_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
                      : 'Mai'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={device.is_active}
                        onCheckedChange={() => toggleActive(device)}
                        disabled={isPending}
                        aria-label={
                          device.is_active
                            ? 'Disattiva dispositivo'
                            : 'Attiva dispositivo'
                        }
                      />
                      <Badge
                        variant="outline"
                        className={
                          device.is_active
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-muted text-muted-foreground'
                        }
                      >
                        {device.is_active ? 'Attivo' : 'Disattivato'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => rotate(device)}
                        disabled={isPending}
                        aria-label="Rigenera token"
                        title="Rigenera token"
                      >
                        <RotateCcwIcon className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => remove(device)}
                        disabled={isPending}
                        aria-label="Elimina dispositivo"
                        title="Elimina"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateDeviceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(deviceName, token) =>
          setShownToken({ deviceName, token })
        }
      />

      <ShowTokenDialog
        open={shownToken !== null}
        onOpenChange={(o) => !o && setShownToken(null)}
        deviceName={shownToken?.deviceName ?? ''}
        token={shownToken?.token ?? ''}
      />
    </>
  )
}

function CreateDeviceDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreated: (deviceName: string, token: string) => void
}) {
  const form = useForm<CreateDeviceInput>({
    defaultValues: { name: '', device_type: 'tablet' },
  })
  const [isPending, startTransition] = React.useTransition()

  React.useEffect(() => {
    if (open) form.reset({ name: '', device_type: 'tablet' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function onSubmit(values: CreateDeviceInput) {
    startTransition(async () => {
      const r = await createAccessDeviceAction(values)
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      toast.success(r.message ?? 'Dispositivo creato.')
      onOpenChange(false)
      if (r.data) {
        onCreated(r.data.name, r.data.token)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuovo dispositivo</DialogTitle>
          <DialogDescription>
            Verrà generato un token bearer da configurare sul tornello/tablet.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              rules={{ required: 'Nome richiesto', minLength: 2 }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="es. Tornello principale"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="device_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="tablet">Tablet</SelectItem>
                      <SelectItem value="turnstile">Tornello</SelectItem>
                      <SelectItem value="rfid_reader">Lettore RFID</SelectItem>
                      <SelectItem value="other">Altro</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creazione…' : 'Crea dispositivo'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function ShowTokenDialog({
  open,
  onOpenChange,
  deviceName,
  token,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  deviceName: string
  token: string
}) {
  // `copied` is keyed on the open state via the dialog's identity in the
  // parent, so each open cycle starts fresh — no effect needed.
  const [copied, setCopied] = React.useState(false)
  function handleClose(o: boolean) {
    if (!o) setCopied(false)
    onOpenChange(o)
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(token)
      setCopied(true)
      toast.success('Token copiato.')
    } catch {
      toast.error('Copia non riuscita. Selezionalo a mano.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRoundIcon className="size-5 text-warning" />
            Token per &laquo;{deviceName}&raquo;
          </DialogTitle>
          <DialogDescription>
            Copialo subito: per motivi di sicurezza non sarà più mostrato. Se
            lo perdi, puoi rigenerarlo dalla lista (il vecchio smetterà di
            funzionare).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <code className="block break-all rounded-md border border-border bg-muted px-3 py-2 font-mono text-xs">
            {token}
          </code>
          <p className="text-xs text-muted-foreground">
            Configuralo sul dispositivo come header HTTP{' '}
            <code className="font-mono">x-device-token</code> per le chiamate
            a <code className="font-mono">/api/access/verify</code>.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={copy} variant="outline">
            <CopyIcon className="size-4" />
            {copied ? 'Copiato' : 'Copia token'}
          </Button>
          <Button onClick={() => handleClose(false)}>Ho salvato il token</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
