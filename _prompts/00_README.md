# Quotal — Indice Prompt Claude Code

Piattaforma SaaS per gestione abbonamenti palestra. MVP single-tenant ready-for-multi.

## Come usare questi prompt

**Ordine di esecuzione obbligatorio.** Ogni prompt assume che i precedenti siano stati eseguiti con successo. Esegui ogni prompt in un branch git dedicato, fai commit pulito alla fine, poi merga in `main` prima di passare al successivo.

```bash
git checkout -b feat/01-foundation
# esegui prompt 01 con Claude Code
git add . && git commit -m "feat: project foundation"
git checkout main && git merge feat/01-foundation

git checkout -b feat/02-database
# esegui prompt 02
# ...e così via
```

## Struttura

| # | File | Cosa fa | Tempo stimato Claude Code |
|---|------|---------|---------------------------|
| 01 | `01_foundation.md` | Setup Next.js 15, Tailwind, shadcn, Supabase client, struttura cartelle, env, brand tokens | 30-45 min |
| 02 | `02_database_schema.md` | Schema Supabase completo, RLS policies, seed data, migration files | 45-60 min |
| 03 | `03_auth_and_roles.md` | Supabase Auth, middleware, ruoli (owner/staff/member), redirect logic, profile creation hook | 30-45 min |
| 04 | `04_owner_dashboard.md` | Dashboard titolare: layout, nav, home con KPI, sezione Membri, Abbonamenti, Pagamenti, Ingressi | 60-90 min |
| 05 | `05_payments_stripe.md` | Stripe setup, SEPA mandate flow, payment intents, webhooks, retry logic | 60-90 min |
| 06 | `06_payments_cash.md` | Flusso pagamento contanti, ricevuta PDF, numerazione progressiva, cassa giornaliera | 30-45 min |
| 07 | `07_member_pwa.md` | App membri PWA: signup, profilo, abbonamento, QR code, manifest, service worker | 60-90 min |
| 08 | `08_access_control.md` | Modulo controllo accessi astratto (AccessControlAdapter), implementazione mock + REST generica | 30-45 min |
| 09 | `09_notifications_emails.md` | Resend setup, React Email templates, cron Supabase per scadenze, idempotency | 30-45 min |
| 10 | `10_legal_security_polish.md` | GDPR, cookie banner, privacy/terms, rate limiting, security headers, polish UX, animazioni | 45-60 min |

**Totale stimato:** 7-10 ore di lavoro Claude Code attivo, distribuibile su 2-3 settimane reali tenendo conto di test, debug, decisioni in corsa.

## Prerequisiti prima di iniziare

- [ ] Account Supabase creato, progetto vuoto pronto
- [ ] Account Stripe creato (test mode), API keys recuperate
- [ ] Account Resend creato, dominio verificato (anche `quotal.it` su Vercel basta per iniziare)
- [ ] Repo Git inizializzato
- [ ] Node.js 20+ installato
- [ ] Vercel CLI installato (per testing locale env vars)

## Decisioni di progetto già prese

- **Nome:** Quotal
- **Stack:** Next.js 15 App Router + TypeScript + Tailwind + shadcn/ui + Framer Motion + Supabase + Stripe + Resend
- **Multi-tenancy:** schema multi-tenant ready, MVP con singola riga in `gyms`
- **Codice fiscale membro:** opzionale, richiesto solo se vuole fattura
- **Auto-renew SEPA:** OFF di default, opt-in esplicito
- **Controllo accessi:** modulo astratto, MVP con adapter REST generico (hardware specifico in prompt aggiuntivo quando avrai il modello)
- **Periodo di grazia post-scadenza:** 3 giorni (configurabile in `gym.settings`)
- **Sospensioni:** solo titolare può sospendere, max 60 giorni l'anno cumulativi (configurabile)
- **Branding ricevute/email:** logo della palestra in evidenza, "Powered by Quotal" in footer

## Convenzioni di codice

Tutti i prompt assumono e impongono:

- TypeScript strict mode
- Componenti server-first, client component solo quando necessario
- Tailwind utility-first, niente CSS custom se non strettamente necessario
- shadcn/ui per componenti base, custom solo per UI specifica del prodotto
- Supabase client: `@supabase/ssr` per server, `@supabase/supabase-js` per client
- Naming: snake_case nel DB, camelCase in TS, PascalCase per componenti
- Validazione: Zod per ogni input utente e ogni response API
- Form: React Hook Form + Zod resolver
- Date: `date-fns` con locale italiano
- Numeri/valute: `Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })`

## Brand tokens Quotal

```ts
// design-tokens.ts
export const brand = {
  // Primario: nero profondo, premium, neutro
  primary: '#0A0A0A',
  primaryForeground: '#FAFAFA',
  // Accent: verde quotale, evoca crescita ricorrente
  accent: '#0F766E', // teal-700
  accentForeground: '#FFFFFF',
  // Background: bianco caldo, leggibile
  background: '#FAFAF9', // stone-50
  foreground: '#0A0A0A',
  // Stati
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  // Neutrali
  muted: '#F5F5F4',
  mutedForeground: '#57534E',
  border: '#E7E5E4',
} as const

export const fonts = {
  sans: 'Inter Variable',
  display: 'Instrument Serif', // per numeri grandi e headline KPI
  mono: 'JetBrains Mono', // per badge ID, codici, importi tecnici
} as const
```

## Note importanti per Claude Code

- **Non inventare schema DB diversi da quello in `02_database_schema.md`.** Se serve una tabella nuova, aggiungerla con migration file separato e documentarla nel commit.
- **Non implementare l'integrazione hardware tornello in questo MVP.** Il prompt 08 implementa un adapter astratto + mock. L'integrazione hardware reale è un prompt separato post-MVP.
- **Ogni prompt produce codice testabile.** Alla fine di ogni prompt ci deve essere una sezione "Come testare" eseguibile manualmente.
- **Niente over-engineering.** Single-tenant MVP, no microservizi, no GraphQL, no Redis se non strettamente necessario.

## Ordine consigliato di test umano

Dopo prompt 03: signup membro funziona, login funziona, redirect basato su ruolo funziona.
Dopo prompt 04: titolare vede dashboard vuota ma navigabile, può creare un membro a mano.
Dopo prompt 06: titolare crea membro + registra pagamento contanti + ricevuta PDF generata. **Primo flusso end-to-end utilizzabile.**
Dopo prompt 07: membro fa login da PWA, vede stato abbonamento, vede QR.
Dopo prompt 09: scadenze e notifiche funzionano in test mode.
Dopo prompt 10: pronto per primo deploy in produzione su un sottodominio test.
