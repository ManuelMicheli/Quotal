# Prompt 05 — Pagamenti Stripe (Carte + SEPA Direct Debit)

## Contesto

Dashboard titolare funzionante (prompt 04). Ora implementa il flusso pagamenti digitali completo: setup Stripe, primo pagamento online (carta o SEPA), gestione mandati SEPA, webhooks, retry logic.

**Decisioni già prese:**
- Auto-renew SEPA OFF di default (opt-in esplicito al signup)
- Stripe one-shot account per ora (multi-tenant Stripe Connect arriva post-MVP)
- Niente saving carta per "tap to pay future" — il flusso è: titolare invia link → membro paga → fine. Per i rinnovi automatici si usa solo SEPA mandate.

## Pre-requisiti

- Account Stripe in test mode
- Stripe CLI installata per testing webhook locale (`stripe listen`)

## Task

### 1. Installazione e setup

```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
```

Crea `lib/stripe/client.ts`:

```ts
import { loadStripe } from '@stripe/stripe-js'
let stripePromise: ReturnType<typeof loadStripe> | null = null

export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  }
  return stripePromise
}
```

Crea `lib/stripe/server.ts`:

```ts
import Stripe from 'stripe'
import { env } from '@/lib/env'

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
  appInfo: { name: 'Quotal', version: '0.1.0' },
})
```

Aggiorna `lib/env.ts` per richiedere ora:
- `STRIPE_SECRET_KEY` (required)
- `STRIPE_WEBHOOK_SECRET` (required)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (required, client-side)

### 2. Sync piani Stripe

Crea uno script `scripts/sync-stripe-prices.ts` che:
1. Legge tutti i `subscription_plans` dal DB
2. Per ognuno: se non ha `stripe_price_id`, crea un Stripe Product + Price one-time
3. Salva `stripe_price_id` nel DB

```ts
// Esempio per il piano Mensile
const product = await stripe.products.create({
  name: `Abbonamento ${plan.name}`,
  description: plan.description ?? undefined,
  metadata: { plan_id: plan.id, gym_id: plan.gym_id },
})

const price = await stripe.prices.create({
  product: product.id,
  unit_amount: plan.price_cents,
  currency: 'eur',
  metadata: { plan_id: plan.id },
})

// Update DB
await supabase.from('subscription_plans')
  .update({ stripe_price_id: price.id })
  .eq('id', plan.id)
```

Esegui con `npx tsx scripts/sync-stripe-prices.ts` quando si modificano i piani. Documenta in `docs/stripe-setup.md`.

**Importante:** se il prezzo cambia, NON modificare il Price esistente (immutable in Stripe). Crea un nuovo Price e aggiorna `stripe_price_id`.

### 3. Flusso pagamento — Architettura

Tre punti di entrata:

**A. Titolare crea membro + invia link pagamento**
- Server Action genera un `payment_session` token unico, lo salva in DB
- Email al membro con link `/pay/{token}` 
- Membro arriva sulla pagina, paga, riceve conferma

**B. Membro rinnova dall'app**
- Membro logged-in apre `/app/abbonamento/rinnova`, sceglie piano e metodo
- Stesso flusso pagamento ma in-app

**C. Rinnovo automatico SEPA (opt-in)**
- Cron job (prompt 09) addebita automaticamente via mandato salvato
- Logica server-side, no UI

### 4. Tabella `payment_sessions`

Migration aggiuntiva:

```sql
create table public.payment_sessions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  token text not null unique,
  status text not null check (status in ('pending', 'completed', 'expired', 'cancelled')),
  payment_method text check (payment_method in ('card', 'sepa')),
  stripe_payment_intent_id text,
  stripe_setup_intent_id text,         -- per SEPA mandate setup
  amount_cents integer not null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  completed_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index payment_sessions_token_idx on public.payment_sessions(token);
create index payment_sessions_member_idx on public.payment_sessions(member_id, status);
```

RLS: solo owner/staff possono creare. Membro può vedere solo la propria via token (no auth richiesta sulla pagina pubblica `/pay/{token}`).

### 5. Pagina pagamento pubblica `/pay/[token]`

`app/(public)/pay/[token]/page.tsx` — accessibile **senza login** (l'unico modo per i membri di pagare al primo onboarding).

Server component:
1. Verifica token valido e non scaduto
2. Recupera member, plan, gym
3. Se status = 'completed', mostra schermata conferma
4. Altrimenti, renderizza form di pagamento

**UI:** card centrata, branding gym (logo + colore), riassunto: "Stai sottoscrivendo {plan.name} per {member.full_name}. Importo: {price}".

Tab/toggle metodo:
- **Carta** (default): Stripe Elements con CardElement
- **Addebito SEPA**: Stripe Elements con IbanElement

Sotto, sezione "Dati per fattura (opzionale)":
- Codice fiscale (se vuoi fattura)
- Indirizzo per fattura (se diverso da profilo)
- Toggle "Voglio ricevere fattura"

Sotto, **solo per SEPA**, checkbox:
- "✓ Autorizzo Quotal e {gym.name} ad addebitare il mio conto secondo il mandato SEPA Direct Debit (mandato unico per il primo pagamento, oppure ricorrente se attivo l'opzione qui sotto)"
- "□ Attiva rinnovo automatico (opzionale)" — questo controlla `subscription.auto_renew` post-pagamento

Bottone "Paga {amount}" → submit.

### 6. Server actions pagamento

#### `createPaymentSessionAction(memberId, planId)` — chiamata dal titolare

```ts
'use server'
// 1. Verifica owner
// 2. Recupera plan, member
// 3. Crea token (crypto.randomUUID() + base64url)
// 4. Insert in payment_sessions con status 'pending', expires_at +7 giorni
// 5. Invia email al membro con link `${APP_URL}/pay/${token}`
// 6. Ritorna { token, paymentUrl }
```

#### `initiateCardPaymentAction(token)` — chiamata dalla pagina /pay

```ts
'use server'
// 1. Recupera payment_session
// 2. Crea Stripe PaymentIntent:
//    - amount: plan.price_cents
//    - currency: 'eur'
//    - payment_method_types: ['card']
//    - metadata: { gym_id, member_id, plan_id, payment_session_id }
//    - receipt_email: member.email
// 3. Update payment_session.stripe_payment_intent_id
// 4. Ritorna { clientSecret }
```

#### `initiateSepaSetupAction(token, autoRenew)` — chiamata dalla pagina /pay

SEPA è particolare: serve prima un **SetupIntent** per ottenere il mandato, poi un **PaymentIntent** per il primo addebito che usa il payment method appena creato.

```ts
'use server'
// 1. Recupera payment_session, member
// 2. Trova o crea Stripe Customer per il member:
//    - Se member non ha stripe_customer_id, crea customer e salva
// 3. Crea SetupIntent:
//    - customer: stripe_customer_id
//    - payment_method_types: ['sepa_debit']
//    - usage: autoRenew ? 'off_session' : 'on_session'
//    - mandate_data: {...}
//    - metadata: { gym_id, member_id, plan_id, payment_session_id, auto_renew: autoRenew }
// 4. Update payment_session.stripe_setup_intent_id
// 5. Ritorna { clientSecret }
```

(Aggiungi `stripe_customer_id` a `profiles` con migration.)

#### `confirmPaymentAction(token, paymentIntentId | setupIntentId)` — chiamata dopo successo client-side

Solo verifica e ritorna conferma. La creazione effettiva di subscription/payment avviene nel **webhook** (single source of truth).

### 7. Componenti client pagamento

`components/payment/payment-form.tsx` — Client component:

```tsx
'use client'
// Usa <Elements stripe={getStripe()}>
// State: method ('card' | 'sepa'), autoRenew, processing, error
// Submit:
//   - Se card: stripe.confirmCardPayment(clientSecret, { payment_method: { card: cardElement, billing_details } })
//   - Se SEPA: stripe.confirmSepaDebitSetup(clientSecret, { payment_method: { sepa_debit: ibanElement, billing_details, mandate_data } })
//     poi conferma payment_intent separato per primo addebito
// Su success: redirect a /pay/{token}/success
// Su error: show inline
```

Stile coerente con brand: usa `appearance` di Stripe Elements per matchare colori e font.

### 8. Webhook handler

`app/api/webhooks/stripe/route.ts`:

```ts
import { stripe } from '@/lib/stripe/server'
import { headers } from 'next/headers'
import { env } from '@/lib/env'
import { createServiceRoleClient } from '@/lib/supabase/admin'  // service role

export async function POST(req: Request) {
  const body = await req.text()
  const signature = (await headers()).get('stripe-signature')!
  
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return new Response('Invalid signature', { status: 400 })
  }
  
  // Idempotency: verifica se questo event è già stato processato
  // (tabella stripe_events_processed con event.id)
  
  const supabase = createServiceRoleClient()
  
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSucceeded(event.data.object, supabase)
      break
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object, supabase)
      break
    case 'setup_intent.succeeded':
      await handleSepaMandateSetup(event.data.object, supabase)
      break
    case 'setup_intent.setup_failed':
      await handleSepaMandateFailed(event.data.object, supabase)
      break
    case 'charge.refunded':
      await handleRefund(event.data.object, supabase)
      break
    case 'mandate.updated':
      await handleMandateUpdate(event.data.object, supabase)
      break
  }
  
  return new Response('ok')
}
```

#### Handler: `payment_intent.succeeded`

1. Estrae `metadata.payment_session_id`, `gym_id`, `member_id`, `plan_id`
2. Recupera payment_session, plan, member
3. **In transazione (RPC Postgres function):**
   - Crea/aggiorna `subscriptions`:
     - Se member ha già subscription attiva: estende `end_date += plan.duration_days`
     - Altrimenti: nuova subscription con `start_date = today`, `end_date = today + duration`, `status = 'active'`, `payment_method = 'card' | 'sepa'`, `auto_renew = metadata.auto_renew`
   - Crea `payments`:
     - amount, method, status='succeeded', stripe_payment_intent_id, paid_at = now
     - receipt_number = `generate_receipt_number(gym_id)`
   - Update `payment_sessions.status = 'completed'`, `completed_at = now`
4. Genera ricevuta PDF (Edge Function — implementazione nel prompt 06, qui solo trigger)
5. Invia email "Pagamento ricevuto" al membro (Resend — implementazione nel prompt 09, qui solo trigger)

Crea una funzione SQL Postgres per atomicità:

```sql
create or replace function public.process_successful_payment(
  p_payment_session_id uuid,
  p_amount_cents integer,
  p_payment_method text,
  p_stripe_payment_intent_id text,
  p_auto_renew boolean
) returns uuid
language plpgsql
security definer
as $$
declare
  v_session record;
  v_plan record;
  v_subscription_id uuid;
  v_existing_sub record;
  v_payment_id uuid;
  v_receipt_number text;
begin
  -- ... logica completa qui
end;
$$;
```

#### Handler: `payment_intent.payment_failed`

1. Update `payment_sessions.status` (rimane 'pending', ma logga failure)
2. Crea `payments` con status='failed', failure_reason
3. Email al membro: "L'addebito è fallito, riprova"
4. Se è un rinnovo automatico SEPA: alert al titolare in dashboard

#### Handler: `setup_intent.succeeded` (SEPA)

1. Recupera mandate da Stripe
2. Crea/aggiorna `sepa_mandates`:
   - stripe_mandate_id, payment_method_id, iban_last4, status='active', signed_at=now
3. Subito dopo, crea PaymentIntent per primo addebito:
   - confirm: true
   - payment_method: il PM appena creato
   - off_session: true se autoRenew
4. Risultato del PaymentIntent verrà gestito dal webhook `payment_intent.succeeded`

### 9. Tabella idempotency webhooks

```sql
create table public.stripe_events_processed (
  id text primary key,                 -- stripe event.id
  type text not null,
  processed_at timestamptz not null default now(),
  payload jsonb
);
```

Prima di ogni handler, check `select 1 from stripe_events_processed where id = $1` → se esiste, ritorna 200 senza re-processare. Dopo, insert.

### 10. UI pagina success/failure

`/pay/[token]/success` — schermata di conferma:
- Animazione check Framer Motion
- "Pagamento ricevuto! Il tuo abbonamento è attivo fino al {date}"
- Per SEPA: "L'addebito sarà visibile sul tuo conto entro 5 giorni lavorativi"
- "Hai ricevuto la ricevuta via email"
- CTA: "Accedi alla tua app" (link a `/app`)

`/pay/[token]/failed` — recupera errore, mostra messaggio amichevole, bottone "Riprova".

### 11. Dashboard titolare: vista pagamenti SEPA falliti

In `/dashboard` aggiungi card "Da gestire" con:
- Pagamenti SEPA falliti negli ultimi 7 giorni
- Per ognuno: nome membro + importo + motivo + bottone "Contatta"

In `/dashboard/pagamenti` aggiungi tab "Falliti".

### 12. Refund

Server Action `refundPaymentAction(paymentId)`:
1. Verifica owner
2. `stripe.refunds.create({ payment_intent: ..., reason: 'requested_by_customer' })`
3. Webhook `charge.refunded` farà l'update DB

UI: bottone "Annulla pagamento" nel dettaglio payment, con conferma in dialog.

### 13. Stripe customer portal (opzionale ma utile)

Permetti al membro di gestire i propri PMs (revocare mandato SEPA, vedere pagamenti):

`app/(member)/app/pagamenti/portal/route.ts`:
```ts
// Crea Stripe Billing Portal session per il customer
// Redirect a portalSession.url
```

### 14. Test mode helpers

In dev, aggiungi una pagina `/dev/stripe-test` (visibile solo se `NODE_ENV === 'development'`) con:
- Bottoni per simulare webhook events (richiede Stripe CLI)
- Carte di test pre-compilate (4242..., 4000 0000 0000 9995 per declined, etc.)
- IBAN test: `DE89370400440532013000` (success), `AT611904300234573201` (failure)

## Cosa NON fare

- Non implementare Stripe Connect (multi-tenant) — post-MVP
- Non implementare 3DS custom flow — Stripe lo gestisce automaticamente
- Non salvare metodi di pagamento per uso futuro al di là del mandato SEPA per auto-renew

## Come testare

1. Sync prezzi: `npx tsx scripts/sync-stripe-prices.ts` → vedi Products in Stripe Dashboard
2. Titolare: crea nuovo membro + "Invia link pagamento SEPA"
3. Apri link in incognito (simula membro)
4. Compila IBAN test, conferma mandato, primo addebito
5. Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
6. Webhook arriva, subscription creata, payment registrato, ricevuta_number generato
7. Membro vede su `/app` abbonamento attivo
8. Test failure: usa carta 4000 0000 0000 9995, vedi handling errore
9. Test refund: dal dashboard, annulla pagamento → status diventa 'refunded'
10. Verifica RLS: membro NON vede payments di altri membri
