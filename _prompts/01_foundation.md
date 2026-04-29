# Prompt 01 — Foundation Setup

## Contesto del progetto

Stai costruendo **Quotal**, una piattaforma SaaS italiana per gestione abbonamenti di palestre indipendenti. Il MVP è single-tenant (una sola palestra) ma con architettura multi-tenant ready (schema con `gym_id` ovunque).

**Stack obbligatorio:**
- Next.js 15 (App Router, Server Components first)
- TypeScript strict mode
- Tailwind CSS v4
- shadcn/ui (componenti base)
- Framer Motion (animazioni)
- Supabase (DB + Auth + Storage)
- `@supabase/ssr` per integrazione Next.js

## Obiettivo di questo prompt

Inizializzare il progetto da zero con tutta la foundation: dipendenze, struttura cartelle, config TypeScript, Tailwind, brand tokens, layout root, util di base, env validation. **Nessuna logica di business ancora**, solo le fondamenta su cui costruiremo il resto.

## Task

### 1. Inizializzazione progetto

```bash
npx create-next-app@latest quotal --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

Dopo l'inizializzazione, installa queste dipendenze esatte:

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install framer-motion
npm install date-fns
npm install zod react-hook-form @hookform/resolvers
npm install lucide-react
npm install class-variance-authority clsx tailwind-merge
npm install @t3-oss/env-nextjs
npm install -D @types/node
```

Setup shadcn/ui con stile "new-york", base color "stone":

```bash
npx shadcn@latest init
```

Installa subito questi componenti shadcn che serviranno ovunque:

```bash
npx shadcn@latest add button card input label form select dialog dropdown-menu badge avatar separator tabs toast skeleton
```

### 2. Struttura cartelle

Crea questa struttura esatta:

```
quotal/
├── app/
│   ├── (auth)/                    # route group: login, signup
│   │   ├── login/
│   │   └── signup/
│   ├── (owner)/                   # dashboard titolare, protetta
│   │   └── dashboard/
│   ├── (member)/                  # PWA membro, protetta
│   │   └── app/
│   ├── api/
│   │   └── webhooks/              # Stripe, etc.
│   ├── layout.tsx
│   ├── page.tsx                   # landing semplice
│   └── globals.css
├── components/
│   ├── ui/                        # shadcn components (auto-generated)
│   ├── owner/                     # componenti specifici dashboard titolare
│   ├── member/                    # componenti specifici PWA membro
│   └── shared/                    # componenti condivisi
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # browser client
│   │   ├── server.ts              # server client
│   │   ├── middleware.ts          # session refresh
│   │   └── types.ts               # tipi auto-generati (placeholder)
│   ├── utils.ts                   # cn() utility (da shadcn)
│   ├── env.ts                     # env validation con t3-env
│   ├── format.ts                  # formattatori IT (date, valute, CF)
│   └── constants.ts               # brand tokens, costanti app
├── design-tokens.ts               # brand colors/fonts esportati
├── middleware.ts                  # session middleware
└── .env.local.example
```

### 3. Brand tokens e Tailwind config

Crea `design-tokens.ts` alla root con:

```ts
export const brand = {
  primary: '#0A0A0A',
  primaryForeground: '#FAFAFA',
  accent: '#0F766E',
  accentForeground: '#FFFFFF',
  background: '#FAFAF9',
  foreground: '#0A0A0A',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  muted: '#F5F5F4',
  mutedForeground: '#57534E',
  border: '#E7E5E4',
} as const

export const fonts = {
  sans: 'Inter Variable, system-ui, sans-serif',
  display: '"Instrument Serif", Georgia, serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
} as const

export const radii = {
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
} as const
```

Aggiorna `app/globals.css` per integrare Inter Variable, Instrument Serif e JetBrains Mono via `next/font` nel root layout, e per usare i token brand come CSS custom properties Tailwind v4.

Configura il root layout con:
- font Inter come default body
- font Instrument Serif disponibile come variabile CSS `--font-display`
- font JetBrains Mono come `--font-mono`
- locale italiano (`<html lang="it">`)
- metadata di base (title template "Quotal — %s", description "Gestione abbonamenti per palestre indipendenti")
- viewport con `themeColor` brand
- favicon placeholder

### 4. Environment validation

Crea `lib/env.ts` con t3-env. Variabili attese:

**Server-side:**
- `NEXT_PUBLIC_SUPABASE_URL` (URL valido)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (string min 1)
- `SUPABASE_SERVICE_ROLE_KEY` (string min 1)
- `STRIPE_SECRET_KEY` (string opzionale per ora, required dal prompt 05)
- `STRIPE_WEBHOOK_SECRET` (string opzionale per ora)
- `RESEND_API_KEY` (string opzionale per ora)
- `RESEND_FROM_EMAIL` (email opzionale per ora)
- `APP_URL` (URL, default `http://localhost:3000`)

**Client-side:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`

Crea `.env.local.example` con placeholder commentati per ogni variabile, raggruppate per servizio (Supabase, Stripe, Resend, App).

### 5. Supabase clients

Crea i 3 file standard `@supabase/ssr`:

**`lib/supabase/client.ts`** — `createBrowserClient` per Client Components.

**`lib/supabase/server.ts`** — `createServerClient` con cookie store da `next/headers`. Una funzione `createClient()` async che ritorna l'istanza corretta.

**`lib/supabase/middleware.ts`** — funzione `updateSession(request)` che refresha la sessione e ritorna `NextResponse`. Da chiamare in `middleware.ts` root.

**`middleware.ts`** alla root del progetto, configurato per matcher che esclude `_next/static`, `_next/image`, `favicon.ico`, e tutti gli asset statici.

**`lib/supabase/types.ts`** — placeholder con `export type Database = any` (verrà sostituito dai tipi generati nel prompt 02).

### 6. Format utilities italiane

Crea `lib/format.ts` con queste funzioni (TypeScript strict, ognuna con JSDoc):

```ts
formatCurrency(cents: number): string
// Usa Intl.NumberFormat 'it-IT' con currency EUR
// Esempio: 4000 -> "€ 40,00"

formatDate(date: Date | string, format?: 'short' | 'long' | 'full'): string
// 'short': 15/03/2026
// 'long': 15 marzo 2026
// 'full': sabato 15 marzo 2026

formatRelativeDate(date: Date | string): string
// "tra 3 giorni", "5 giorni fa", "oggi", "domani", "ieri"
// Usa date-fns con locale 'it'

formatPhone(phone: string): string
// Normalizza numeri italiani: "+39 333 1234567"

isValidCodiceFiscale(cf: string): boolean
// Validazione algoritmica codice fiscale italiano (16 caratteri,
// pattern + checksum carattere finale).
// Implementazione completa, non solo regex.

isValidIBAN(iban: string): boolean
// Validazione IBAN italiano (IT + 2 check + 1 CIN + 5 ABI + 5 CAB + 12 conto)
// Verifica con algoritmo MOD-97
```

### 7. Constants

Crea `lib/constants.ts` con:

```ts
export const APP_NAME = 'Quotal'
export const APP_DESCRIPTION = 'Gestione abbonamenti per palestre indipendenti'
export const APP_TAGLINE = 'La quota associativa, semplificata'

export const ROLES = {
  OWNER: 'owner',
  STAFF: 'staff',
  MEMBER: 'member',
} as const
export type Role = typeof ROLES[keyof typeof ROLES]

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled',
} as const
export type SubscriptionStatus = typeof SUBSCRIPTION_STATUS[keyof typeof SUBSCRIPTION_STATUS]

export const PAYMENT_METHODS = {
  CARD: 'card',
  SEPA: 'sepa',
  CASH: 'cash',
  BANK_TRANSFER: 'bank_transfer',
} as const
export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS]

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const
export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS]

// Default config palestra (in attesa di configurazione runtime)
export const DEFAULT_GYM_SETTINGS = {
  gracePeriodDays: 3,           // giorni di tolleranza post-scadenza prima del blocco accesso
  maxSuspensionDaysPerYear: 60, // limite cumulativo sospensioni annuali
  expiryNotificationDays: [7, 3, 0], // giorni prima della scadenza per email
  postExpiryNotificationDays: [3], // giorni dopo la scadenza per email follow-up
} as const
```

### 8. Landing page minimale

`app/page.tsx`: pagina pubblica semplicissima:
- Hero centrato con logo testuale "Quotal" in font Instrument Serif XL
- Tagline "La quota associativa, semplificata."
- Due bottoni: "Accedi come titolare" → `/login?role=owner`, "Accedi come membro" → `/login?role=member`
- Footer minimale con `© 2026 Quotal`
- Animazione di entrata Framer Motion: fade + slide up sequenziale (logo, tagline, bottoni)

Non serve essere bella, serve essere funzionante. Verrà rifinita nel prompt 10.

### 9. Healthcheck route

Crea `app/api/health/route.ts` che ritorna `{ status: 'ok', timestamp: new Date().toISOString() }`. Utile per monitoring e per verificare il deploy.

## Cosa NON fare in questo prompt

- Non creare tabelle DB (lo fa il prompt 02)
- Non creare pagine login/signup funzionanti (lo fa il prompt 03)
- Non installare Stripe SDK (lo fa il prompt 05)
- Non installare Resend (lo fa il prompt 09)
- Non aggiungere PWA manifest (lo fa il prompt 07)

## Come testare

Alla fine di questo prompt:

1. `npm run dev` deve avviare senza errori
2. `http://localhost:3000` mostra la landing page con animazione di entrata
3. `http://localhost:3000/api/health` risponde JSON `{ status: 'ok', ... }`
4. `npm run build` completa senza errori TypeScript
5. `lib/format.ts` testato a mano in console: `formatCurrency(4000)` → `"€ 40,00"`, `isValidCodiceFiscale('RSSMRA85M01H501Z')` → `true`

## Output atteso

Una codebase Next.js 15 pulita, type-safe, con env validation, Supabase client pronti, formatters italiani robusti, e una landing minimale. Pronta per ricevere lo schema DB nel prompt successivo.
