/**
 * Dev-only Stripe playground.
 *
 * Lists test card and IBAN values + a quick-link to the local webhook
 * smoke test. Returns a 404 outside development so this never ships.
 */
import { notFound } from 'next/navigation'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

const TEST_CARDS: Array<{ number: string; behavior: string }> = [
  { number: '4242 4242 4242 4242', behavior: 'Successo (no 3DS)' },
  { number: '4000 0025 0000 3155', behavior: 'Richiede 3DS' },
  { number: '4000 0000 0000 9995', behavior: 'Declined' },
  { number: '4000 0027 6000 3184', behavior: 'Richiede authentication' },
]

const TEST_IBANS: Array<{ iban: string; behavior: string }> = [
  { iban: 'DE89370400440532013000', behavior: 'Successo (Germania)' },
  { iban: 'AT611904300234573201', behavior: 'Failure setup intent' },
  { iban: 'FR1420041010050500013M02606', behavior: 'Setup ok, addebito fallisce' },
]

export const dynamic = 'force-static'

export default function StripeTestPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <header>
        <p className="text-sm text-muted-foreground">Dev tools</p>
        <h1 className="font-display text-3xl">Stripe test reference</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Carte di test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {TEST_CARDS.map((c) => (
            <div
              key={c.number}
              className="flex items-center justify-between gap-4"
            >
              <span className="font-mono">{c.number}</span>
              <span className="text-muted-foreground">{c.behavior}</span>
            </div>
          ))}
          <Separator className="my-2" />
          <p className="text-xs text-muted-foreground">
            Per tutte: scadenza qualsiasi data futura, CVC qualsiasi 3 cifre,
            CAP qualsiasi.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>IBAN di test (SEPA Direct Debit)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {TEST_IBANS.map((c) => (
            <div
              key={c.iban}
              className="flex items-center justify-between gap-4"
            >
              <span className="font-mono">{c.iban}</span>
              <span className="text-muted-foreground">{c.behavior}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhook smoke test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">
            {`STRIPE_WEBHOOK_SECRET=whsec_test_local \\
  node scripts/verify-stripe.mjs`}
          </pre>
          <p className="text-xs text-muted-foreground">
            Verifica firma + idempotenza senza chiamate live a Stripe.
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
