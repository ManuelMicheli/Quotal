/**
 * Stripe integration status page (owner-only).
 *
 * Surfaces the connected Stripe account's KYC + payout state so the owner
 * can see at a glance whether they can receive money. Read-only here:
 * actual account changes (IBAN, KYC, payout schedule) happen on Stripe's
 * own dashboard via the deep links below.
 */
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  ArrowUpRightIcon,
  BanknoteIcon,
  CheckCircle2Icon,
  CreditCardIcon,
  ExternalLinkIcon,
  LinkIcon,
  XCircleIcon,
} from 'lucide-react'
import Link from 'next/link'

import { ConnectStripeButton } from '@/components/owner/connect-stripe-button'
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderHeading,
} from '@/components/shared/page-header'
import { Stepper } from '@/components/shared/stepper'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireOwnerOrStaff } from '@/lib/auth'
import { env } from '@/lib/env'
import { formatCurrency, formatDate } from '@/lib/format'
import { getStripeAccountSnapshot } from '@/lib/stripe/account-status'

export const dynamic = 'force-dynamic'

export default async function StripeSettingsPage() {
  await requireOwnerOrStaff()
  const snap = await getStripeAccountSnapshot()

  const onboardingStep = !snap.connected
    ? 0
    : !snap.account?.details_submitted
      ? 1
      : !snap.account?.charges_enabled || !snap.account?.payouts_enabled
        ? 2
        : 3

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
          <PageHeaderHeading>Stripe</PageHeaderHeading>
          <PageHeaderDescription>
            Stato dell&apos;account Stripe collegato. Tutti i dati anagrafici, IBAN
            per i payout e verifica identità si gestiscono direttamente sulla
            dashboard Stripe.
          </PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>

      {snap.configured ? (
        <Card>
          <CardContent className="py-2">
            <Stepper
              orientation="horizontal"
              current={onboardingStep}
              steps={[
                { id: 'connect', title: 'Collega Stripe', description: 'Account Express' },
                { id: 'kyc', title: 'Identità', description: 'KYC + IBAN' },
                {
                  id: 'enable',
                  title: 'Pagamenti attivi',
                  description: 'Charges + payouts',
                },
                { id: 'live', title: 'Operativo', description: 'Pronto a incassare' },
              ]}
            />
          </CardContent>
        </Card>
      ) : null}

      {!snap.configured ? (
        <Alert variant="destructive">
          <AlertTriangleIcon className="size-4" />
          <AlertTitle>Stripe non configurato</AlertTitle>
          <AlertDescription>
            <p>
              Manca o non è valida la chiave segreta della piattaforma. Errore:{' '}
              <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs">
                {snap.error ?? 'STRIPE_SECRET_KEY assente'}
              </code>
            </p>
            <p className="mt-2">
              Contatta il supporto: la chiave la imposta l’operatore della
              piattaforma, non la singola palestra.
            </p>
          </AlertDescription>
        </Alert>
      ) : !snap.connected ? (
        <>
          <ConnectCard />
          <PlatformFeeCard />
        </>
      ) : (
        <>
          <StatusCard snap={snap} />
          <BalanceCard snap={snap} />
          <PayoutsCard snap={snap} />
          <PlatformFeeCard />
          <ActionsCard snap={snap} />
        </>
      )}
    </div>
  )
}

function ConnectCard() {
  return (
    <Card tone="accent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="size-4 text-accent" />
          Collega il tuo Stripe
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Per ricevere i pagamenti dei tuoi iscritti devi collegare un account
          Stripe alla tua palestra. Stripe gestisce la verifica dell’identità,
          l’IBAN e i payout — Quotal non vede mai i tuoi soldi.
        </p>
        <ul className="space-y-1.5 text-muted-foreground">
          <li className="flex items-start gap-2">
            <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-success" />
            <span>Apri un account Express in pochi minuti.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-success" />
            <span>
              I pagamenti finiscono direttamente sul tuo conto Stripe e poi sul
              tuo IBAN.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-success" />
            <span>Puoi sospendere o riprendere l’onboarding in qualunque momento.</span>
          </li>
        </ul>
        <ConnectStripeButton label="Connetti la palestra a Stripe" />
      </CardContent>
    </Card>
  )
}

function PlatformFeeCard() {
  const bps = env.QUOTAL_APPLICATION_FEE_BPS
  const pct = (bps / 100).toLocaleString('it-IT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })

  if (bps <= 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Commissioni Quotal</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nessuna commissione di piattaforma applicata.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commissioni Quotal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="flex items-baseline gap-2">
          <span className="number font-display text-3xl font-normal tracking-tight">
            {pct}%
          </span>
          <span className="text-muted-foreground">
            trattenuta su ogni pagamento dei tuoi iscritti come commissione di
            piattaforma.
          </span>
        </p>
        <p className="text-muted-foreground">
          Il costo viene scalato automaticamente da Stripe e non incide sulle
          commissioni Stripe (carta/SEPA), che vedi nella dashboard Stripe.
        </p>
      </CardContent>
    </Card>
  )
}

function StatusCard({
  snap,
}: {
  snap: Awaited<ReturnType<typeof getStripeAccountSnapshot>>
}) {
  const a = snap.account!
  const allClear = a.charges_enabled && a.payouts_enabled
  const blocked =
    a.requirements_disabled_reason || a.requirements_past_due.length > 0
  const pendingReqs = a.requirements_currently_due.length > 0

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <CreditCardIcon className="size-4 text-accent" />
          Stato account
        </CardTitle>
        {allClear ? (
          <Badge variant="success">Operativo</Badge>
        ) : blocked ? (
          <Badge variant="destructive">Bloccato</Badge>
        ) : pendingReqs ? (
          <Badge variant="warning">KYC in corso</Badge>
        ) : (
          <Badge variant="secondary">Non attivato</Badge>
        )}
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <KV
          label="Account ID"
          value={
            <code className="font-mono text-xs">{a.id}</code>
          }
        />
        <KV label="Email" value={a.email ?? '—'} />
        <KV label="Ragione sociale" value={a.business_name ?? '—'} />
        <KV
          label="Paese / valuta"
          value={`${a.country ?? '—'} · ${a.default_currency?.toUpperCase() ?? '—'}`}
        />
        <KV
          label="Pagamenti abilitati"
          value={
            a.charges_enabled ? (
              <span className="inline-flex items-center gap-1 text-success">
                <CheckCircle2Icon className="size-4" /> Sì
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-warning">
                <XCircleIcon className="size-4" /> No
              </span>
            )
          }
        />
        <KV
          label="Payout abilitati"
          value={
            a.payouts_enabled ? (
              <span className="inline-flex items-center gap-1 text-success">
                <CheckCircle2Icon className="size-4" /> Sì
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-warning">
                <XCircleIcon className="size-4" /> No
              </span>
            )
          }
        />

        {pendingReqs ? (
          <Alert variant="warning" className="sm:col-span-2">
            <AlertTriangleIcon className="size-4" />
            <AlertTitle>Da completare su Stripe</AlertTitle>
            <AlertDescription>
              <ul className="ml-4 mt-2 list-disc space-y-1">
                {a.requirements_currently_due.slice(0, 8).map((r) => (
                  <li key={r}>
                    <code className="font-mono text-xs">{r}</code>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        {a.requirements_disabled_reason ? (
          <Alert variant="destructive" className="sm:col-span-2">
            <AlertTriangleIcon className="size-4" />
            <AlertTitle>Account limitato</AlertTitle>
            <AlertDescription>
              Motivo Stripe:{' '}
              <code className="font-mono text-xs">
                {a.requirements_disabled_reason}
              </code>
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  )
}

function BalanceCard({
  snap,
}: {
  snap: Awaited<ReturnType<typeof getStripeAccountSnapshot>>
}) {
  const b = snap.balance!
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BanknoteIcon className="size-4 text-accent" />
          Saldo
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2">
        <KV
          label="Disponibile per payout"
          value={
            <span className="number font-display text-3xl font-normal tracking-tight">
              {formatCurrency(Math.round(b.available_eur * 100))}
            </span>
          }
        />
        <KV
          label="In transito (pending)"
          value={
            <span className="number font-display text-3xl font-normal tracking-tight text-muted-foreground">
              {formatCurrency(Math.round(b.pending_eur * 100))}
            </span>
          }
        />
      </CardContent>
    </Card>
  )
}

function PayoutsCard({
  snap,
}: {
  snap: Awaited<ReturnType<typeof getStripeAccountSnapshot>>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUpRightIcon className="size-4 text-accent" />
          Ultimi payout
        </CardTitle>
      </CardHeader>
      <CardContent>
        {snap.payouts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nessun payout ancora. I primi arriveranno dopo che Stripe avrà
            verificato il tuo account e accumulato il saldo iniziale.
          </p>
        ) : (
          <ul className="-mx-2 flex flex-col">
            {snap.payouts.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-md px-2 py-2.5 text-sm transition-colors hover:bg-secondary/60"
              >
                <div>
                  <p className="number font-semibold">
                    {formatCurrency(Math.round(p.amount_eur * 100))}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {formatDate(p.arrival_date, 'short')} · {p.id}
                  </p>
                </div>
                <Badge
                  variant={
                    p.status === 'paid'
                      ? 'success'
                      : p.status === 'failed'
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {p.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function ActionsCard({
  snap,
}: {
  snap: Awaited<ReturnType<typeof getStripeAccountSnapshot>>
}) {
  const a = snap.account!
  const needsKyc = !a.details_submitted || a.requirements_currently_due.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Azioni</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {needsKyc ? (
          <div className="rounded-lg border border-warning/30 bg-warning-soft p-4">
            <p className="text-sm font-semibold text-warning">
              Completa onboarding (KYC)
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              Documenti, IBAN, P.IVA: tutto su Stripe.
            </p>
            <ConnectStripeButton label="Riprendi su Stripe" />
          </div>
        ) : null}
        <ExternalLinkButton
          href="https://dashboard.stripe.com/settings/payouts"
          label="Schedule payout + IBAN"
          description="Cambia banca, frequenza, soglia minima."
        />
        <ExternalLinkButton
          href="https://dashboard.stripe.com/payments"
          label="Tutti i pagamenti"
          description="Apre Stripe → Payments per audit completo."
        />
        <ExternalLinkButton
          href="https://dashboard.stripe.com/webhooks"
          label="Webhook endpoints"
          description="Verifica e ruota i signing secret."
        />
      </CardContent>
    </Card>
  )
}

function ExternalLinkButton({
  href,
  label,
  description,
}: {
  href: string
  label: string
  description: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="tap-shrink group/ext flex flex-col gap-1 rounded-lg border border-border bg-card p-4 text-left transition-all duration-200 hover:-translate-y-px hover:border-border-strong hover:shadow-[var(--shadow-2)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
    >
      <span className="flex items-center justify-between gap-2 text-sm font-semibold tracking-tight">
        {label}
        <ExternalLinkIcon className="size-3.5 text-muted-foreground transition-colors group-hover/ext:text-foreground" />
      </span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </a>
  )
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="eyebrow">{label}</p>
      <div className="text-sm">{value}</div>
    </div>
  )
}
