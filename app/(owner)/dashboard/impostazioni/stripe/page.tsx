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
  ArrowUpRightIcon,
  BanknoteIcon,
  CheckCircle2Icon,
  CreditCardIcon,
  ExternalLinkIcon,
  LinkIcon,
} from 'lucide-react'
import Link from 'next/link'

import { ConnectStripeButton } from '@/components/owner/connect-stripe-button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireOwnerOrStaff } from '@/lib/auth'
import { formatCurrency, formatDate } from '@/lib/format'
import { getStripeAccountSnapshot } from '@/lib/stripe/account-status'

export const dynamic = 'force-dynamic'

export default async function StripeSettingsPage() {
  await requireOwnerOrStaff()
  const snap = await getStripeAccountSnapshot()

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div>
        <Link
          href="/dashboard/impostazioni"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Tutte le impostazioni
        </Link>
      </div>

      <header>
        <h1 className="font-display text-3xl tracking-tight md:text-4xl lg:text-5xl">
          Stripe
        </h1>
        <p className="text-sm text-muted-foreground">
          Stato dell'account Stripe collegato. Tutti i dati anagrafici, IBAN
          per i payout e verifica identità si gestiscono direttamente sulla
          dashboard Stripe.
        </p>
      </header>

      {!snap.configured ? (
        <Alert variant="destructive">
          <AlertTriangleIcon className="size-4" />
          <AlertTitle>Stripe non configurato</AlertTitle>
          <AlertDescription>
            <p>
              Manca o non è valida la chiave segreta della piattaforma. Errore:{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
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
        <ConnectCard />
      ) : (
        <>
          <StatusCard snap={snap} />
          <BalanceCard snap={snap} />
          <PayoutsCard snap={snap} />
          <ActionsCard snap={snap} />
        </>
      )}
    </div>
  )
}

function ConnectCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="size-5" />
          Collega il tuo Stripe
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Per ricevere i pagamenti dei tuoi iscritti devi collegare un account
          Stripe alla tua palestra. Stripe gestisce la verifica dell’identità,
          l’IBAN e i payout — Quotal non vede mai i tuoi soldi.
        </p>
        <ul className="ml-4 list-disc space-y-1 text-muted-foreground">
          <li>Apri un account Express in pochi minuti.</li>
          <li>
            I pagamenti finiscono direttamente sul tuo conto Stripe e poi sul
            tuo IBAN.
          </li>
          <li>
            Puoi sospendere o riprendere l’onboarding in qualunque momento.
          </li>
        </ul>
        <ConnectStripeButton label="Connetti la palestra a Stripe" />
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
    a.requirements_disabled_reason ||
    a.requirements_past_due.length > 0
  const pendingReqs = a.requirements_currently_due.length > 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <CreditCardIcon className="size-5" />
          Stato account
        </CardTitle>
        {allClear ? (
          <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15">
            Operativo
          </Badge>
        ) : blocked ? (
          <Badge variant="destructive">Bloccato</Badge>
        ) : pendingReqs ? (
          <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/15">
            KYC in corso
          </Badge>
        ) : (
          <Badge variant="secondary">Non attivato</Badge>
        )}
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <KV label="Account ID" value={<code className="text-xs">{a.id}</code>} />
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
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <CheckCircle2Icon className="size-4" /> Sì
              </span>
            ) : (
              <span className="text-amber-600">No</span>
            )
          }
        />
        <KV
          label="Payout abilitati"
          value={
            a.payouts_enabled ? (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <CheckCircle2Icon className="size-4" /> Sì
              </span>
            ) : (
              <span className="text-amber-600">No</span>
            )
          }
        />

        {pendingReqs ? (
          <div className="sm:col-span-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
            <p className="font-medium text-amber-700 dark:text-amber-400">
              Da completare su Stripe
            </p>
            <ul className="mt-2 list-disc pl-5 text-muted-foreground">
              {a.requirements_currently_due.slice(0, 8).map((r) => (
                <li key={r}>
                  <code className="text-xs">{r}</code>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {a.requirements_disabled_reason ? (
          <div className="sm:col-span-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <p className="font-medium text-destructive">Account limitato</p>
            <p className="text-muted-foreground">
              Motivo Stripe:{' '}
              <code className="text-xs">{a.requirements_disabled_reason}</code>
            </p>
          </div>
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
          <BanknoteIcon className="size-5" />
          Saldo
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <KV
          label="Disponibile per payout"
          value={
            <span className="font-display text-2xl">
              {formatCurrency(Math.round(b.available_eur * 100))}
            </span>
          }
        />
        <KV
          label="In transito (pending)"
          value={
            <span className="font-display text-2xl text-muted-foreground">
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
          <ArrowUpRightIcon className="size-5" />
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
          <ul className="divide-y">
            {snap.payouts.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{formatCurrency(Math.round(p.amount_eur * 100))}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(p.arrival_date, 'short')} ·{' '}
                    <code className="text-xs">{p.id}</code>
                  </p>
                </div>
                <Badge
                  variant={
                    p.status === 'paid'
                      ? 'default'
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
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium">Completa onboarding (KYC)</p>
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
  primary = false,
}: {
  href: string
  label: string
  description: string
  primary?: boolean
}) {
  return (
    <Button
      asChild
      variant={primary ? 'default' : 'outline'}
      className="h-auto flex-col items-start gap-1 py-3 text-left whitespace-normal"
    >
      <a href={href} target="_blank" rel="noreferrer">
        <span className="flex w-full items-center justify-between gap-2 font-medium">
          {label}
          <ExternalLinkIcon className="size-4 opacity-60" />
        </span>
        <span className="text-xs font-normal opacity-80">{description}</span>
      </a>
    </Button>
  )
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  )
}
