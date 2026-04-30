/**
 * Hero card on /app: subscription status at a glance.
 *
 * Server component (pure presentation). Renders one of seven states.
 * Active state shows a featured dark hero with ambient accent glow and
 * a large days-remaining counter. Other states use lighter cards tuned
 * to the semantic colour of the alert.
 */
import {
  AlertTriangleIcon,
  ArrowUpRightIcon,
  BanIcon,
  CheckCircle2Icon,
  ClockIcon,
  PauseIcon,
  XCircleIcon,
} from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/format'
import type { MemberHomeData } from '@/lib/queries/member'
import { cn } from '@/lib/utils'

type Tone = 'featured' | 'warning' | 'destructive' | 'muted'

type Variant = {
  tone: Tone
  Icon: typeof CheckCircle2Icon
  eyebrow: string
}

function getVariant(status: MemberHomeData['status']): Variant {
  switch (status) {
    case 'active':
      return { tone: 'featured', Icon: CheckCircle2Icon, eyebrow: 'Abbonamento attivo' }
    case 'expiring_soon':
      return { tone: 'warning', Icon: ClockIcon, eyebrow: 'In scadenza' }
    case 'grace_period':
      return { tone: 'destructive', Icon: AlertTriangleIcon, eyebrow: 'Periodo di tolleranza' }
    case 'expired':
      return { tone: 'destructive', Icon: XCircleIcon, eyebrow: 'Accesso bloccato' }
    case 'suspended':
      return { tone: 'muted', Icon: PauseIcon, eyebrow: 'Sospeso' }
    case 'cancelled':
      return { tone: 'muted', Icon: BanIcon, eyebrow: 'Annullato' }
    default:
      return { tone: 'muted', Icon: AlertTriangleIcon, eyebrow: 'Nessun abbonamento' }
  }
}

const TONE_CLASSES: Record<Tone, { card: string; eyebrow: string; chip: string; cta: string; progress: string }> = {
  featured: {
    card: 'bg-foreground text-background',
    eyebrow: 'text-background/70',
    chip: 'bg-background/10 text-background ring-1 ring-inset ring-background/15',
    cta: 'bg-background text-foreground hover:bg-background/90',
    progress: 'bg-[color:var(--accent)]',
  },
  warning: {
    card: 'bg-card text-foreground ring-1 ring-inset ring-warning/30',
    eyebrow: 'text-warning',
    chip: 'bg-warning/10 text-warning ring-1 ring-inset ring-warning/20',
    cta: 'bg-warning text-warning-foreground hover:bg-warning/90',
    progress: 'bg-warning',
  },
  destructive: {
    card: 'bg-card text-foreground ring-1 ring-inset ring-destructive/30',
    eyebrow: 'text-destructive',
    chip: 'bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20',
    cta: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    progress: 'bg-destructive',
  },
  muted: {
    card: 'bg-card text-foreground ring-1 ring-inset ring-border',
    eyebrow: 'text-muted-foreground',
    chip: 'bg-muted text-muted-foreground',
    cta: '',
    progress: 'bg-muted-foreground',
  },
}

export function SubscriptionStatusCard({ data }: { data: MemberHomeData }) {
  const variant = getVariant(data.status)
  const tones = TONE_CLASSES[variant.tone]
  const Icon = variant.Icon
  const featured = variant.tone === 'featured'

  const daysNumber =
    data.status === 'active'
      ? data.daysRemaining
      : data.status === 'expiring_soon'
        ? data.daysRemaining
        : data.status === 'grace_period'
          ? data.graceDaysLeft
          : null

  return (
    <section
      className={cn(
        'ring-elevated relative h-full overflow-hidden rounded-[28px] p-6 md:p-8 lg:p-10',
        tones.card,
      )}
      aria-labelledby="status-eyebrow"
    >
      {featured ? (
        <>
          <div
            aria-hidden="true"
            className="pulse-glow absolute -right-16 -top-16 h-64 w-64 rounded-full"
            style={{ background: 'radial-gradient(closest-side, color-mix(in oklab, var(--accent) 65%, transparent), transparent)' }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, color-mix(in oklab, white 25%, transparent), transparent)' }}
          />
        </>
      ) : null}

      <div className="relative">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium uppercase tracking-[0.08em]',
              tones.chip,
            )}
          >
            <Icon size={12} aria-hidden="true" />
            <span id="status-eyebrow">{variant.eyebrow}</span>
          </span>
        </div>

        <div className="mt-5 space-y-1.5 md:mt-7">
          {data.subscription ? (
            <>
              <p className={cn('text-xs uppercase tracking-[0.12em]', tones.eyebrow)}>
                {data.gym?.name ?? 'Il tuo piano'}
              </p>
              <h2 className="font-display text-3xl tracking-tight text-balance md:text-5xl lg:text-[3.25rem]">
                {data.subscription.plan.name}
              </h2>
            </>
          ) : (
            <h2 className="font-display text-3xl tracking-tight text-balance md:text-5xl">
              Non sei iscritto
            </h2>
          )}
        </div>

        {daysNumber !== null && data.subscription ? (
          <div className="mt-6 flex items-end justify-between gap-4 md:mt-10">
            <div>
              <p className="tabular text-5xl font-semibold leading-none tracking-tight md:text-7xl lg:text-8xl">
                {daysNumber}
              </p>
              <p className={cn('mt-1 text-xs md:mt-2 md:text-sm', tones.eyebrow)}>
                {daysNumber === 1 ? 'giorno' : 'giorni'}{' '}
                {data.status === 'grace_period' ? 'di tolleranza' : 'rimanenti'}
              </p>
            </div>
            <div className="text-right">
              <p className={cn('text-[11px] uppercase tracking-[0.12em] md:text-xs', tones.eyebrow)}>
                Scade
              </p>
              <p className="text-sm font-medium tabular md:text-lg">
                {formatDate(data.subscription.end_date, 'short')}
              </p>
            </div>
          </div>
        ) : null}

        {data.status === 'active' && data.periodUsedPct !== null ? (
          <div className="mt-5">
            <div className="h-1 overflow-hidden rounded-full bg-background/15">
              <div
                className={cn('h-full rounded-full transition-all', tones.progress)}
                style={{ width: `${data.periodUsedPct}%` }}
                aria-hidden="true"
              />
            </div>
            <p className={cn('mt-2 text-[11px]', tones.eyebrow)}>
              {data.periodUsedPct}% del periodo trascorso
            </p>
          </div>
        ) : null}

        <SecondaryCopy data={data} tone={variant.tone} />

        <PrimaryAction data={data} tone={variant.tone} ctaClass={tones.cta} />
      </div>
    </section>
  )
}

function SecondaryCopy({ data, tone }: { data: MemberHomeData; tone: Tone }) {
  const dim = tone === 'featured' ? 'text-background/75' : 'text-muted-foreground'
  switch (data.status) {
    case 'active':
      return (
        <p className={cn('mt-4 text-sm', dim)}>
          {formatCurrency(data.subscription!.plan.price_cents)} ·{' '}
          {data.subscription!.auto_renew ? 'Rinnovo automatico' : 'Rinnovo manuale'}
        </p>
      )
    case 'expiring_soon':
      return (
        <p className={cn('mt-4 text-sm', dim)}>
          Rinnova ora per non perdere l&apos;accesso.
        </p>
      )
    case 'grace_period':
      return (
        <p className={cn('mt-4 text-sm', dim)}>
          Hai ancora qualche giorno per rinnovare prima del blocco accessi.
        </p>
      )
    case 'expired':
      return (
        <p className={cn('mt-4 text-sm', dim)}>
          Il periodo di tolleranza è terminato. Rinnova per riattivare.
        </p>
      )
    case 'suspended':
      return (
        <p className={cn('mt-4 text-sm', dim)}>
          L&apos;abbonamento è sospeso. Contatta la palestra per riprendere.
        </p>
      )
    case 'cancelled':
      return (
        <p className={cn('mt-4 text-sm', dim)}>
          Per ripartire, scegli un nuovo piano insieme a {data.gym?.name ?? 'la palestra'}.
        </p>
      )
    default:
      return (
        <p className={cn('mt-4 text-sm', dim)}>
          Contatta {data.gym?.name ?? 'la palestra'} per attivare un abbonamento.
        </p>
      )
  }
}

function PrimaryAction({
  data,
  tone,
  ctaClass,
}: {
  data: MemberHomeData
  tone: Tone
  ctaClass: string
}) {
  const renew = (
    <Button asChild size="lg" className={cn('mt-6 w-full rounded-full', ctaClass)}>
      <Link href="/app/abbonamento/rinnova">
        Rinnova abbonamento
        <ArrowUpRightIcon size={16} />
      </Link>
    </Button>
  )

  const callGym = data.gym?.phone ? (
    <Button
      asChild
      variant={tone === 'featured' ? 'secondary' : 'outline'}
      size="lg"
      className="mt-6 w-full rounded-full"
    >
      <a href={`tel:${data.gym.phone}`}>Contatta la palestra</a>
    </Button>
  ) : null

  switch (data.status) {
    case 'expiring_soon':
    case 'grace_period':
    case 'expired':
    case 'cancelled':
      return renew
    case 'no_subscription':
    case 'suspended':
      return callGym
    default:
      return null
  }
}
