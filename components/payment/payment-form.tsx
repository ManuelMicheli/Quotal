'use client'

/**
 * Public payment form rendered on `/pay/[token]`.
 *
 * Two methods, single submit button:
 *   - Card → creates a PaymentIntent server-side, confirms via
 *     `stripe.confirmCardPayment` with the IBAN/Card element.
 *   - SEPA → creates a SetupIntent (with `usage: 'off_session'` if the user
 *     opts into auto-renewal), confirms via `stripe.confirmSepaDebitSetup`.
 *     The first PaymentIntent for the SEPA mandate is created server-side
 *     in the `setup_intent.succeeded` webhook handler — that keeps the DB
 *     in a single state machine.
 *
 * The mandate consent text comes from `lib/stripe/sepa-mandate-text.ts`,
 * matching Stripe's approved phrasing.
 */
import {
  Elements,
  CardElement,
  IbanElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js'
import type { Stripe, StripeElementsOptions } from '@stripe/stripe-js'
import { Loader2Icon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import {
  initiateCardPaymentAction,
  initiateSepaSetupAction,
} from '@/app/actions/payments'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { getStripe } from '@/lib/stripe/client'
import { sepaMandateText } from '@/lib/stripe/sepa-mandate-text'
import { formatCurrency } from '@/lib/format'

type Props = {
  token: string
  amountCents: number
  memberFullName: string
  memberEmail: string
  gymName: string
}

const baseElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#0a0a0a',
      fontFamily:
        'var(--font-sans), system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      '::placeholder': { color: '#737373' },
    },
    invalid: { color: '#dc2626' },
  },
}

export function PaymentForm(props: Props) {
  const [stripePromise] = React.useState<Promise<Stripe | null>>(() => {
    try {
      return getStripe()
    } catch (err) {
      return Promise.resolve(null).then(() => {
        throw err
      })
    }
  })

  const elementsOptions: StripeElementsOptions = {
    locale: 'it',
    fonts: [
      {
        cssSrc:
          'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
      },
    ],
  }

  return (
    <Elements stripe={stripePromise} options={elementsOptions}>
      <PaymentFormInner {...props} />
    </Elements>
  )
}

function PaymentFormInner({
  token,
  amountCents,
  memberFullName,
  memberEmail,
  gymName,
}: Props) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()

  const [method, setMethod] = React.useState<'card' | 'sepa'>('card')
  const [autoRenew, setAutoRenew] = React.useState(false)
  const [sepaConsent, setSepaConsent] = React.useState(false)
  const [processing, setProcessing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const submitDisabled =
    !stripe ||
    !elements ||
    processing ||
    (method === 'sepa' && !sepaConsent)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!stripe || !elements) return
    setProcessing(true)
    try {
      if (method === 'card') {
        const r = await initiateCardPaymentAction({ token })
        if (!r.ok) throw new Error(r.error)
        const card = elements.getElement(CardElement)
        if (!card) throw new Error('Elemento carta non disponibile')
        const result = await stripe.confirmCardPayment(r.data!.clientSecret, {
          payment_method: {
            card,
            billing_details: { name: memberFullName, email: memberEmail },
          },
        })
        if (result.error) throw new Error(result.error.message ?? 'Errore pagamento')
        if (result.paymentIntent?.status === 'succeeded') {
          router.push(`/pay/${token}/success`)
          return
        }
        // Some methods (e.g. SEPA via card form fallback) leave the PI in
        // `processing` — treat that as a successful submission.
        router.push(`/pay/${token}/success?status=${result.paymentIntent?.status ?? 'pending'}`)
      } else {
        const r = await initiateSepaSetupAction({ token, auto_renew: autoRenew })
        if (!r.ok) throw new Error(r.error)
        const iban = elements.getElement(IbanElement)
        if (!iban) throw new Error('Elemento IBAN non disponibile')
        const result = await stripe.confirmSepaDebitSetup(r.data!.clientSecret, {
          payment_method: {
            sepa_debit: iban,
            billing_details: { name: memberFullName, email: memberEmail },
          },
        })
        if (result.error) throw new Error(result.error.message ?? 'Errore SEPA')
        if (
          result.setupIntent?.status === 'succeeded' ||
          result.setupIntent?.status === 'processing'
        ) {
          router.push(`/pay/${token}/success?method=sepa`)
          return
        }
        router.push(`/pay/${token}/success?status=${result.setupIntent?.status ?? 'pending'}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore inatteso')
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Tabs
        value={method}
        onValueChange={(v) => setMethod(v as 'card' | 'sepa')}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="card">Carta</TabsTrigger>
          <TabsTrigger value="sepa">Addebito SEPA</TabsTrigger>
        </TabsList>
        <TabsContent value="card" className="mt-4">
          <Label className="mb-2 block text-sm">Dati carta</Label>
          <div className="rounded-md border bg-card p-3">
            <CardElement options={baseElementOptions} />
          </div>
        </TabsContent>
        <TabsContent value="sepa" className="mt-4 space-y-4">
          <div>
            <Label className="mb-2 block text-sm">IBAN</Label>
            <div className="rounded-md border bg-card p-3">
              <IbanElement
                options={{
                  ...baseElementOptions,
                  supportedCountries: ['SEPA'],
                  placeholderCountry: 'IT',
                }}
              />
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-md border bg-muted/40 p-3 text-sm">
            <Checkbox
              id="sepa-consent"
              checked={sepaConsent}
              onCheckedChange={(v) => setSepaConsent(v === true)}
              required
            />
            <label htmlFor="sepa-consent" className="leading-snug">
              {sepaMandateText(gymName)}
            </label>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              id="auto-renew"
              checked={autoRenew}
              onCheckedChange={(v) => setAutoRenew(v === true)}
            />
            <label htmlFor="auto-renew" className="text-sm leading-snug">
              Attiva il <strong>rinnovo automatico</strong> alla scadenza
              dell&apos;abbonamento (puoi annullarlo in qualsiasi momento).
            </label>
          </div>
        </TabsContent>
      </Tabs>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Errore</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={submitDisabled} size="lg">
        {processing ? (
          <>
            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
            Elaborazione...
          </>
        ) : (
          <>Paga {formatCurrency(amountCents)}</>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Pagamento gestito da Stripe. I tuoi dati bancari non vengono mai
        memorizzati su Quotal.
      </p>
    </form>
  )
}
