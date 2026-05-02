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
import type {
  Stripe,
  StripeElementsOptions,
  StripeElementChangeEvent,
} from '@stripe/stripe-js'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2Icon,
  CreditCardIcon,
  LandmarkIcon,
  Loader2Icon,
  ShieldCheckIcon,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import {
  initiateCardPaymentAction,
  initiateSepaSetupAction,
} from '@/app/actions/payments'
import { Stepper } from '@/components/shared/stepper'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { fadeUp, spring } from '@/lib/motion'
import { formatCurrency } from '@/lib/format'
import { getStripe } from '@/lib/stripe/client'
import { sepaMandateText } from '@/lib/stripe/sepa-mandate-text'
import { cn } from '@/lib/utils'

type Props = {
  token: string
  amountCents: number
  memberFullName: string
  memberEmail: string
  gymName: string
}

const PAY_STEPS = [
  { id: 'details', title: 'Dettagli' },
  { id: 'payment', title: 'Pagamento' },
  { id: 'confirm', title: 'Conferma' },
]

const SHARED_FONT_FAMILY =
  'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

function buildElementOptions(isDark: boolean) {
  // Hex fallbacks because Stripe Elements iframes can't resolve our CSS vars.
  const fg = isDark ? '#FAFAF9' : '#0A0A0A'
  const placeholder = isDark ? '#78716C' : '#A8A29E'
  const invalid = isDark ? '#EF4444' : '#DC2626'
  return {
    style: {
      base: {
        fontSize: '16px',
        color: fg,
        fontFamily: `var(--font-sans), ${SHARED_FONT_FAMILY}`,
        fontSmoothing: 'antialiased',
        '::placeholder': { color: placeholder },
        ':-webkit-autofill': { color: fg },
      },
      invalid: { color: invalid, iconColor: invalid },
    },
  }
}

export function PaymentForm(props: Props) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const [stripePromise] = React.useState<Promise<Stripe | null>>(() => {
    try {
      return getStripe()
    } catch (err) {
      return Promise.resolve(null).then(() => {
        throw err
      })
    }
  })

  const elementsOptions: StripeElementsOptions = React.useMemo(() => {
    // Hex tokens mirroring app/globals.css (Stripe iframes can't read vars).
    const colorBackground = isDark ? '#161513' : '#FFFFFF'
    const colorText = isDark ? '#FAFAF9' : '#0A0A0A'
    const colorPrimary = isDark ? '#14B8A6' : '#0F766E'
    const colorDanger = isDark ? '#EF4444' : '#DC2626'
    const colorTextPlaceholder = isDark ? '#78716C' : '#A8A29E'
    return {
      locale: 'it',
      fonts: [
        {
          cssSrc:
            'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
        },
      ],
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary,
          colorBackground,
          colorText,
          colorTextPlaceholder,
          colorDanger,
          borderRadius: '8px',
          fontFamily: SHARED_FONT_FAMILY,
          fontSizeBase: '16px',
          spacingUnit: '4px',
        },
      },
    }
  }, [isDark])

  return (
    <Elements
      stripe={stripePromise}
      options={elementsOptions}
      key={isDark ? 'dark' : 'light'}
    >
      <PaymentFormInner {...props} isDark={isDark} />
    </Elements>
  )
}

type StepIndex = 0 | 1 | 2

function PaymentFormInner({
  token,
  amountCents,
  memberFullName,
  memberEmail,
  gymName,
  isDark,
}: Props & { isDark: boolean }) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()

  const [method, setMethod] = React.useState<'card' | 'sepa'>('card')
  const [autoRenew, setAutoRenew] = React.useState(false)
  const [sepaConsent, setSepaConsent] = React.useState(false)
  const [processing, setProcessing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [cardComplete, setCardComplete] = React.useState(false)
  const [ibanComplete, setIbanComplete] = React.useState(false)

  const elementOptions = React.useMemo(
    () => buildElementOptions(isDark),
    [isDark],
  )

  const fieldComplete = method === 'card' ? cardComplete : ibanComplete
  const currentStep: StepIndex = processing
    ? 2
    : fieldComplete && (method === 'card' || sepaConsent)
      ? 1
      : 0

  const submitDisabled =
    !stripe ||
    !elements ||
    processing ||
    (method === 'sepa' && !sepaConsent)

  function handleCardChange(e: StripeElementChangeEvent) {
    setCardComplete(e.complete)
    if (e.error) setError(e.error.message)
    else if (error) setError(null)
  }

  function handleIbanChange(e: StripeElementChangeEvent) {
    setIbanComplete(e.complete)
    if (e.error) setError(e.error.message)
    else if (error) setError(null)
  }

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
    <motion.form
      onSubmit={handleSubmit}
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className="flex flex-col gap-6"
    >
      <Stepper steps={PAY_STEPS} current={currentStep} />

      <Tabs
        value={method}
        onValueChange={(v) => {
          setMethod(v as 'card' | 'sepa')
          setError(null)
        }}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="card">
            <CreditCardIcon className="size-4" />
            Carta
          </TabsTrigger>
          <TabsTrigger value="sepa">
            <LandmarkIcon className="size-4" />
            Addebito SEPA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="card" className="mt-5">
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium tracking-tight text-muted-foreground">
              Dati carta
            </Label>
            <StripeFieldShell complete={cardComplete}>
              <CardElement
                options={{ ...elementOptions, hidePostalCode: true }}
                onChange={handleCardChange}
              />
            </StripeFieldShell>
            <p className="text-xs text-muted-foreground">
              Numero carta, scadenza e CVC.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="sepa" className="mt-5 space-y-5">
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium tracking-tight text-muted-foreground">
              IBAN
            </Label>
            <StripeFieldShell complete={ibanComplete}>
              <IbanElement
                options={{
                  ...elementOptions,
                  supportedCountries: ['SEPA'],
                  placeholderCountry: 'IT',
                }}
                onChange={handleIbanChange}
              />
            </StripeFieldShell>
          </div>

          <label
            htmlFor="sepa-consent"
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-secondary/40 p-4 text-sm leading-snug text-foreground/90 transition-colors hover:bg-secondary/60"
          >
            <Checkbox
              id="sepa-consent"
              checked={sepaConsent}
              onCheckedChange={(v) => setSepaConsent(v === true)}
              required
              className="mt-0.5"
            />
            <span className="text-pretty">{sepaMandateText(gymName)}</span>
          </label>

          <label
            htmlFor="auto-renew"
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-dashed border-border p-4 text-sm leading-snug transition-colors hover:bg-secondary/30"
          >
            <Checkbox
              id="auto-renew"
              checked={autoRenew}
              onCheckedChange={(v) => setAutoRenew(v === true)}
              className="mt-0.5"
            />
            <span className="text-pretty">
              Attiva il <strong>rinnovo automatico</strong> alla scadenza
              dell&apos;abbonamento (puoi annullarlo in qualsiasi momento).
            </span>
          </label>
        </TabsContent>
      </Tabs>

      <AnimatePresence>
        {error ? (
          <motion.div
            key="payment-error"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0, transition: spring.snappy }}
            exit={{ opacity: 0, y: -6 }}
          >
            <Alert variant="destructive">
              <AlertTitle>Errore</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Button
        type="submit"
        disabled={submitDisabled}
        size="xl"
        variant="accent"
        className="w-full"
      >
        {processing ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            Elaborazione...
          </>
        ) : (
          <>
            <ShieldCheckIcon className="size-4" />
            Paga {formatCurrency(amountCents)}
          </>
        )}
      </Button>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <CheckCircle2Icon className="size-3.5 text-success" />
        Pagamento gestito da Stripe · Dati bancari non memorizzati
      </p>
    </motion.form>
  )
}

function StripeFieldShell({
  complete,
  children,
}: {
  complete: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-md border bg-card px-3.5 py-3.5 transition-all duration-200',
        'hover:border-border-strong',
        'focus-within:border-ring focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--ring)_18%,transparent)]',
        complete ? 'border-accent/50' : 'border-input',
      )}
    >
      {children}
    </div>
  )
}
