/**
 * Hero card on /app: subscription status at a glance.
 *
 * Server component (pure presentation) — receives the precomputed
 * `MemberHomeData` from `getMemberHomeData()` and renders one of six
 * states: active, expiring soon, grace period, expired, suspended,
 * cancelled, no_subscription. Each gets its own gradient + CTA.
 *
 * The CTA "Rinnova" links to /app/abbonamento/rinnova which already
 * exists from Phase 05.
 */
import {
  AlertTriangleIcon,
  BanIcon,
  CheckCircle2Icon,
  ClockIcon,
  PauseIcon,
  XCircleIcon,
} from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import type { MemberHomeData } from '@/lib/queries/member'
import { cn } from '@/lib/utils'

type Variant = {
  bg: string
  ring: string
  iconBg: string
  iconFg: string
  Icon: typeof CheckCircle2Icon
  eyebrow: string
}

function getVariant(status: MemberHomeData['status']): Variant {
  switch (status) {
    case 'active':
      return {
        bg: 'bg-gradient-to-br from-success/15 via-success/5 to-transparent',
        ring: 'ring-success/20',
        iconBg: 'bg-success/15',
        iconFg: 'text-success',
        Icon: CheckCircle2Icon,
        eyebrow: 'Abbonamento attivo',
      }
    case 'expiring_soon':
      return {
        bg: 'bg-gradient-to-br from-warning/20 via-warning/5 to-transparent',
        ring: 'ring-warning/30',
        iconBg: 'bg-warning/15',
        iconFg: 'text-warning',
        Icon: ClockIcon,
        eyebrow: 'In scadenza',
      }
    case 'grace_period':
      return {
        bg: 'bg-gradient-to-br from-destructive/15 via-destructive/5 to-transparent',
        ring: 'ring-destructive/25',
        iconBg: 'bg-destructive/15',
        iconFg: 'text-destructive',
        Icon: AlertTriangleIcon,
        eyebrow: 'Abbonamento scaduto',
      }
    case 'expired':
      return {
        bg: 'bg-gradient-to-br from-destructive/20 via-destructive/5 to-transparent',
        ring: 'ring-destructive/40',
        iconBg: 'bg-destructive/15',
        iconFg: 'text-destructive',
        Icon: XCircleIcon,
        eyebrow: 'Accesso bloccato',
      }
    case 'suspended':
      return {
        bg: 'bg-gradient-to-br from-muted via-muted/40 to-transparent',
        ring: 'ring-border',
        iconBg: 'bg-muted',
        iconFg: 'text-muted-foreground',
        Icon: PauseIcon,
        eyebrow: 'Abbonamento sospeso',
      }
    case 'cancelled':
      return {
        bg: 'bg-gradient-to-br from-muted via-muted/40 to-transparent',
        ring: 'ring-border',
        iconBg: 'bg-muted',
        iconFg: 'text-muted-foreground',
        Icon: BanIcon,
        eyebrow: 'Abbonamento annullato',
      }
    default:
      return {
        bg: 'bg-gradient-to-br from-muted via-muted/40 to-transparent',
        ring: 'ring-border',
        iconBg: 'bg-muted',
        iconFg: 'text-muted-foreground',
        Icon: AlertTriangleIcon,
        eyebrow: 'Nessun abbonamento',
      }
  }
}

function StatusContent({ data }: { data: MemberHomeData }) {
  switch (data.status) {
    case 'active':
      return (
        <>
          <p className="text-sm font-medium">
            {data.subscription?.plan.name}
          </p>
          <p className="text-sm text-muted-foreground">
            Scade il{' '}
            <span className="text-foreground">
              {formatDate(data.subscription!.end_date, 'long')}
            </span>
          </p>
          {data.daysRemaining !== null ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {data.daysRemaining} {data.daysRemaining === 1 ? 'giorno' : 'giorni'} rimanenti
            </p>
          ) : null}
        </>
      )
    case 'expiring_soon':
      return (
        <>
          <p className="text-sm font-medium">
            {data.subscription?.plan.name}
          </p>
          <p className="text-sm">
            Scade tra{' '}
            <span className="font-semibold">
              {data.daysRemaining}{' '}
              {data.daysRemaining === 1 ? 'giorno' : 'giorni'}
            </span>{' '}
            — rinnova ora per non perdere l&apos;accesso.
          </p>
        </>
      )
    case 'grace_period':
      return (
        <>
          <p className="text-sm font-medium">
            {data.subscription?.plan.name}
          </p>
          <p className="text-sm">
            Hai ancora{' '}
            <span className="font-semibold">
              {data.graceDaysLeft}{' '}
              {data.graceDaysLeft === 1 ? 'giorno' : 'giorni'}
            </span>{' '}
            di accesso. Rinnova subito.
          </p>
        </>
      )
    case 'expired':
      return (
        <p className="text-sm">
          L&apos;abbonamento è scaduto e il periodo di tolleranza è
          terminato. Rinnova per riattivare l&apos;accesso.
        </p>
      )
    case 'suspended':
      return (
        <p className="text-sm">
          Il tuo abbonamento è temporaneamente sospeso. Per riprendere
          l&apos;accesso contatta la palestra.
        </p>
      )
    case 'cancelled':
      return (
        <p className="text-sm">
          L&apos;abbonamento è stato annullato. Per ripartire, scegli un
          nuovo piano.
        </p>
      )
    default:
      return (
        <p className="text-sm">
          Non hai ancora un abbonamento attivo. Contatta{' '}
          {data.gym?.name ?? 'la palestra'} per attivarne uno.
        </p>
      )
  }
}

function Cta({ data }: { data: MemberHomeData }) {
  switch (data.status) {
    case 'expiring_soon':
    case 'grace_period':
    case 'expired':
    case 'cancelled':
      return (
        <Button asChild size="lg" className="mt-4 w-full">
          <Link href="/app/abbonamento/rinnova">Rinnova abbonamento</Link>
        </Button>
      )
    case 'no_subscription':
      return data.gym?.phone ? (
        <Button asChild variant="outline" size="lg" className="mt-4 w-full">
          <a href={`tel:${data.gym.phone}`}>Contatta la palestra</a>
        </Button>
      ) : null
    case 'suspended':
      return data.gym?.phone ? (
        <Button asChild variant="outline" size="lg" className="mt-4 w-full">
          <a href={`tel:${data.gym.phone}`}>Contatta la palestra</a>
        </Button>
      ) : null
    default:
      return null
  }
}

export function SubscriptionStatusCard({ data }: { data: MemberHomeData }) {
  const variant = getVariant(data.status)
  const Icon = variant.Icon
  return (
    <section
      className={cn(
        'rounded-3xl p-5 ring-1 ring-inset',
        variant.bg,
        variant.ring,
      )}
      aria-labelledby="status-eyebrow"
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
            variant.iconBg,
            variant.iconFg,
          )}
          aria-hidden="true"
        >
          <Icon size={22} />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p
            id="status-eyebrow"
            className={cn('text-xs font-medium uppercase tracking-wide', variant.iconFg)}
          >
            {variant.eyebrow}
          </p>
          <StatusContent data={data} />
        </div>
      </div>

      {data.status === 'active' && data.periodUsedPct !== null ? (
        <div className="mt-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-full rounded-full bg-success transition-all"
              style={{ width: `${data.periodUsedPct}%` }}
              aria-hidden="true"
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {data.periodUsedPct}% del periodo trascorso
          </p>
        </div>
      ) : null}

      <Cta data={data} />
    </section>
  )
}
