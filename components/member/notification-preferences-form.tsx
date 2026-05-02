'use client'

/**
 * Member-side notification preference toggles.
 *
 * Channels (master switches) on top, per-event toggles below grouped by
 * channel. Saves on submit (no auto-save) so the member can review the
 * full state before persisting.
 */
import * as React from 'react'
import { toast } from 'sonner'

import { updateMemberNotificationPreferencesAction } from '@/app/actions/member'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import type { NotificationPreferences } from '@/lib/domain-types'
import type { MemberNotificationPreferencesInput } from '@/lib/validations/member'

type Props = {
  initial: NotificationPreferences | null
}

const DEFAULTS: MemberNotificationPreferencesInput = {
  email_enabled: true,
  push_enabled: true,
  email_expiry_reminders: true,
  email_payment_receipts: true,
  email_payment_failures: true,
  email_lifecycle_changes: true,
  push_expiry_reminders: true,
  push_payment_events: true,
}

function pickInitial(
  pref: NotificationPreferences | null,
): MemberNotificationPreferencesInput {
  if (!pref) return DEFAULTS
  return {
    email_enabled: pref.email_enabled,
    push_enabled: pref.push_enabled,
    email_expiry_reminders: pref.email_expiry_reminders,
    email_payment_receipts: pref.email_payment_receipts,
    email_payment_failures: pref.email_payment_failures,
    email_lifecycle_changes: pref.email_lifecycle_changes,
    push_expiry_reminders: pref.push_expiry_reminders,
    push_payment_events: pref.push_payment_events,
  }
}

const EMAIL_EVENTS: { key: keyof MemberNotificationPreferencesInput; label: string; description: string }[] = [
  {
    key: 'email_expiry_reminders',
    label: 'Promemoria scadenze',
    description: 'Email a 7, 3, 0 giorni e dopo la scadenza.',
  },
  {
    key: 'email_payment_receipts',
    label: 'Ricevute',
    description: 'Conferma di ogni pagamento (anche per i tuoi record).',
  },
  {
    key: 'email_payment_failures',
    label: 'Pagamenti non riusciti',
    description: 'Quando un addebito SEPA fallisce.',
  },
  {
    key: 'email_lifecycle_changes',
    label: 'Cambi di stato',
    description: 'Sospensioni, riattivazioni, rinnovi e benvenuto.',
  },
]

const PUSH_EVENTS: { key: keyof MemberNotificationPreferencesInput; label: string; description: string }[] = [
  {
    key: 'push_expiry_reminders',
    label: 'Promemoria scadenze',
    description: 'Notifica push prima della scadenza.',
  },
  {
    key: 'push_payment_events',
    label: 'Eventi di pagamento',
    description: 'Conferme e avvisi di pagamento.',
  },
]

export function NotificationPreferencesForm({ initial }: Props) {
  const [state, setState] = React.useState<MemberNotificationPreferencesInput>(
    pickInitial(initial),
  )
  const [pending, startTransition] = React.useTransition()

  const handleToggle = (key: keyof MemberNotificationPreferencesInput) => {
    setState((s) => ({ ...s, [key]: !s[key] }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await updateMemberNotificationPreferencesAction(state)
      if (result.ok) {
        toast.success(result.message ?? 'Preferenze salvate.')
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="space-y-2.5">
        <header>
          <h3 className="eyebrow">Canali</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Disattivare un canale silenzia tutte le notifiche su quel canale.
          </p>
        </header>
        <ToggleRow
          checked={state.email_enabled}
          onChange={() => handleToggle('email_enabled')}
          label="Email"
          description="Notifiche transazionali alla tua casella."
        />
        <ToggleRow
          checked={state.push_enabled}
          onChange={() => handleToggle('push_enabled')}
          label="Notifiche push"
          description="Avvisi sul browser/PWA (richiede l'attivazione dei permessi)."
        />
      </section>

      <Separator />

      <section className="space-y-2.5">
        <header>
          <h3 className="eyebrow">Email — eventi</h3>
        </header>
        {EMAIL_EVENTS.map((e) => (
          <ToggleRow
            key={e.key}
            checked={Boolean(state[e.key])}
            onChange={() => handleToggle(e.key)}
            label={e.label}
            description={e.description}
            disabled={!state.email_enabled}
          />
        ))}
      </section>

      <Separator />

      <section className="space-y-2.5">
        <header>
          <h3 className="eyebrow">Push — eventi</h3>
        </header>
        {PUSH_EVENTS.map((e) => (
          <ToggleRow
            key={e.key}
            checked={Boolean(state[e.key])}
            onChange={() => handleToggle(e.key)}
            label={e.label}
            description={e.description}
            disabled={!state.push_enabled}
          />
        ))}
      </section>

      <div className="flex justify-end">
        <Button
          type="submit"
          variant="accent"
          size="lg"
          disabled={pending}
          className="rounded-full"
        >
          {pending ? 'Salvataggio…' : 'Salva preferenze'}
        </Button>
      </div>
    </form>
  )
}

function ToggleRow({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean
  onChange: () => void
  label: string
  description: string
  disabled?: boolean
}) {
  return (
    <div
      className={`ring-soft flex items-start justify-between gap-4 rounded-2xl bg-card px-4 py-3 ${disabled ? 'opacity-50' : ''}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-label={label}
      />
    </div>
  )
}
