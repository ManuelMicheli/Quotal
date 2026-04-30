'use client'

/**
 * Owner-side notification preferences. Superset of the member toggles
 * plus the owner-only flags (digest, alerts, monthly report).
 */
import * as React from 'react'
import { toast } from 'sonner'

import { updateOwnerNotificationPreferencesAction } from '@/app/actions/member'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import type { NotificationPreferences } from '@/lib/domain-types'
import type { OwnerNotificationPreferencesInput } from '@/lib/validations/member'

const DEFAULTS: OwnerNotificationPreferencesInput = {
  email_enabled: true,
  push_enabled: true,
  email_expiry_reminders: true,
  email_payment_receipts: true,
  email_payment_failures: true,
  email_lifecycle_changes: true,
  push_expiry_reminders: true,
  push_payment_events: true,
  email_daily_digest: true,
  email_payment_failed_alert: true,
  email_new_member_alert: false,
  email_monthly_report: true,
}

function pickInitial(
  pref: NotificationPreferences | null,
): OwnerNotificationPreferencesInput {
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
    email_daily_digest: pref.email_daily_digest,
    email_payment_failed_alert: pref.email_payment_failed_alert,
    email_new_member_alert: pref.email_new_member_alert,
    email_monthly_report: pref.email_monthly_report,
  }
}

const OWNER_EMAIL_EVENTS: { key: keyof OwnerNotificationPreferencesInput; label: string; description: string }[] = [
  {
    key: 'email_daily_digest',
    label: 'Riepilogo giornaliero',
    description: 'Email ogni mattina con scadenze, pagamenti falliti e cassa.',
  },
  {
    key: 'email_payment_failed_alert',
    label: 'Avviso pagamento fallito',
    description: 'Quando un addebito non va a buon fine.',
  },
  {
    key: 'email_new_member_alert',
    label: 'Nuovo membro',
    description: 'Quando una persona si registra autonomamente. Disattivato per default.',
  },
  {
    key: 'email_monthly_report',
    label: 'Report mensile',
    description: 'Sintesi KPI a inizio mese (con PDF allegato).',
  },
]

export function OwnerNotificationPreferencesForm({
  initial,
}: {
  initial: NotificationPreferences | null
}) {
  const [state, setState] = React.useState<OwnerNotificationPreferencesInput>(
    pickInitial(initial),
  )
  const [pending, startTransition] = React.useTransition()

  const toggle = (key: keyof OwnerNotificationPreferencesInput) => {
    setState((s) => ({ ...s, [key]: !s[key] }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const r = await updateOwnerNotificationPreferencesAction(state)
      if (r.ok) toast.success(r.message ?? 'Preferenze salvate.')
      else toast.error(r.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="space-y-3">
        <header>
          <h3 className="text-sm font-medium">Canali</h3>
          <p className="text-xs text-muted-foreground">
            Disattivare un canale silenzia tutte le notifiche su quel canale.
          </p>
        </header>
        <ToggleRow
          checked={state.email_enabled}
          onChange={() => toggle('email_enabled')}
          label="Email"
          description="Email transazionali alla tua casella."
        />
      </section>

      <Separator />

      <section className="space-y-3">
        <header>
          <h3 className="text-sm font-medium">Notifiche per il titolare</h3>
        </header>
        {OWNER_EMAIL_EVENTS.map((e) => (
          <ToggleRow
            key={e.key}
            checked={Boolean(state[e.key])}
            onChange={() => toggle(e.key)}
            label={e.label}
            description={e.description}
            disabled={!state.email_enabled}
          />
        ))}
      </section>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
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
      className={`flex items-start justify-between gap-4 rounded-md border border-border px-3 py-2.5 ${disabled ? 'opacity-50' : ''}`}
    >
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
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
