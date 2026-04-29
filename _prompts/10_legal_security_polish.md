# Prompt 10 — Legal, Security, Polish & Deploy

## Contesto

Tutta la logica di prodotto è completata (prompt 01-09). Quotal è funzionalmente pronto. Questo è l'ultimo prompt: **rendere il prodotto deploy-ready in produzione** rispettando legge italiana ed europea, mettendo in sicurezza l'app, e dando alla UI quella rifinitura che fa la differenza tra "funziona" e "premium".

**Stack di compliance italiano:**
- GDPR (Reg. UE 2016/679)
- Codice Privacy italiano (D.Lgs. 196/2003 e succ. mod.)
- Linee guida cookie del Garante (10 giugno 2021)
- Codice del Consumo per disclosure commerciali
- Iubenda raccomandato per cookie banner + privacy policy auto-generata (gestione semplice e legale)

## Task

### 1. Legal config centralizzato

Crea `lib/legal/config.ts`:

```ts
/**
 * Configurazione legale centralizzata.
 * Ogni installazione di Quotal (multi-tenant futuro) avrà i propri valori.
 * Per il MVP single-tenant, popolare con dati reali della società/titolare.
 */
export const LEGAL_CONFIG = {
  company: {
    name: 'Quotal di Manuel Micheli',  // o ragione sociale
    legal_form: 'Ditta individuale',    // o S.r.l., etc.
    vat_number: 'IT00000000000',        // P.IVA Quotal stessa
    fiscal_code: '',                    // se ditta individuale
    rea_number: '',                     // numero REA se richiesto
    chamber_of_commerce: 'Milano',      // CCIAA
    headquarters: {
      address: 'Via XXX, 1',
      city: 'Ossona',
      province: 'MI',
      postal_code: '20010',
      country: 'IT',
    },
    email: 'info@quotal.it',
    pec: 'quotal@pec.it',                // PEC se attivata
    phone: '',
  },
  
  data_controller: {
    name: 'Manuel Micheli',
    email: 'privacy@quotal.it',
    role: 'Titolare del trattamento',
  },
  
  dpo: null,  // Data Protection Officer, se nominato
  
  iubenda: {
    privacy_policy_id: 'XXXXXXXX',      // generato su Iubenda
    cookie_policy_id: 'XXXXXXXX',
    terms_id: 'XXXXXXXX',
  },
  
  app: {
    url: 'https://quotal.it',
    support_email: 'support@quotal.it',
  },
} as const
```

Documenta in `docs/legal-setup.md` come popolare ogni campo.

### 2. Cookie banner conforme Garante

**Decisione tecnica:** usa Iubenda per il banner (€29/anno per la versione full). È testato legalmente, multi-lingua, conforme GDPR + Garante. Non vale la pena scrivere uno custom per un MVP che deve essere legale.

**Setup:**
1. Crea account Iubenda
2. Genera Privacy Policy + Cookie Policy + Termini per Quotal (template già pronti per app SaaS Italia)
3. Recupera l'ID e popola `LEGAL_CONFIG.iubenda`
4. Aggiungi script Iubenda nel root layout

```tsx
// app/layout.tsx
import Script from 'next/script'

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <head>
        {/* Iubenda Cookie Solution */}
        <Script id="iubenda-cs-config" strategy="beforeInteractive">
          {`var _iub = _iub || []; _iub.csConfiguration = {
            "askConsentAtCookiePolicyUpdate": true,
            "countryDetection": true,
            "enableLgpd": true,
            "lgpdAppliesGlobally": false,
            "lang": "it",
            "perPurposeConsent": true,
            "siteId": ${LEGAL_CONFIG.iubenda.site_id},
            "cookiePolicyId": ${LEGAL_CONFIG.iubenda.cookie_policy_id},
            "banner": {
              "acceptButtonDisplay": true,
              "customizeButtonDisplay": true,
              "rejectButtonDisplay": true,
              "position": "bottom",
              "style": "white",
            }
          };`}
        </Script>
        <Script src="//cs.iubenda.com/autoblocking/<site_id>.js" strategy="beforeInteractive" />
        <Script src="//cdn.iubenda.com/cs/iubenda_cs.js" strategy="lazyOnload" async />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

Iubenda gestisce automaticamente: blocco cookie di terze parti finché non accettati, distinzione tra tecnici (sempre attivi) e analytics/marketing, riapertura banner per nuova policy.

### 3. Pagine legali

`app/(legal)/privacy/page.tsx`, `app/(legal)/cookie-policy/page.tsx`, `app/(legal)/termini/page.tsx`:

Embedda direttamente Iubenda con `<a href="https://www.iubenda.com/privacy-policy/${id}" class="iubenda-white iubenda-noiframe iubenda-embed iubenda-noiframe">Privacy Policy</a>` — Iubenda renderizza inline.

In alternativa, fetcha il contenuto via API Iubenda e renderizza statico (per SEO).

### 4. Footer legale obbligatorio

Aggiorna footer di tutte le pagine pubbliche con:

```
Quotal di Manuel Micheli · P.IVA IT00000000000 · REA MI-1234567
Via XXX, 1 · 20010 Ossona (MI) · info@quotal.it · PEC: quotal@pec.it

[Privacy] [Cookie Policy] [Termini] [Cookie Preferences (link js Iubenda)]

© 2026 Quotal. Tutti i diritti riservati.
```

Componente `components/shared/legal-footer.tsx` riusato in landing, login, pagine pubbliche.

### 5. GDPR: diritti dell'interessato

#### Esportazione dati (Art. 20 GDPR — portabilità)

Server Action `exportMyDataAction()` (chiamata da `/app/profilo`):

1. Recupera tutti i dati del membro: profile, subscriptions, payments, access_logs, sepa_mandates, notifications_sent
2. Crea ZIP:
   - `dati-personali.json` (struttura completa)
   - `ricevute/*.pdf` (tutti i PDF)
   - `ingressi.csv` (log accessi)
3. Email al membro con link download (signed URL Storage, valido 24h)
4. Logga richiesta in `data_export_requests` table

```sql
create table public.data_export_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  requested_at timestamptz not null default now(),
  fulfilled_at timestamptz,
  download_url text,
  expires_at timestamptz
);
```

#### Cancellazione account (Art. 17 GDPR — diritto all'oblio)

Server Action `requestAccountDeletionAction(reason)`:
- NON cancella subito (conservazione obbligatoria 10 anni per ricevute fiscali)
- Crea richiesta in `account_deletion_requests`
- Email al titolare per processare manualmente
- UI: "La tua richiesta è stata ricevuta. Verrà processata entro 30 giorni come previsto dal GDPR."

```sql
create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'processed', 'rejected')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  notes text
);
```

Il titolare vede le richieste in `/dashboard/impostazioni/gdpr-richieste` e può:
- Marcare come processata (anonimizza profile: full_name='Utente cancellato', email=null, telefono=null, etc., ma mantiene records pagamenti per fini fiscali)
- Marcare come rifiutata con motivazione

#### Privacy by design checks

- ✅ RLS attive su ogni tabella (già fatto in prompt 02)
- ✅ Dati cifrati in transito (HTTPS, fornito da Vercel)
- ✅ Dati cifrati a riposo (Supabase usa AES-256 di default)
- ✅ Backup automatici (Supabase fa daily backup, configurabile retention)
- ✅ Logs di accesso (access_logs tracciano ogni ingresso)
- ✅ Minimizzazione: codice fiscale opzionale, raccolto solo se necessario per fattura
- ✅ Consent esplicito: checkbox al signup per "Termini e Privacy"
- ⚠️ Aggiungi: log accessi al DB (chi ha letto cosa) — per Audit GDPR, opzionale ma raccomandato per produzione

### 6. Security headers

`next.config.mjs`:

```js
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
  // CSP è complessa; vedi sotto
]

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://cdn.iubenda.com https://cs.iubenda.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' blob: data: https://*.supabase.co https://cdn.iubenda.com;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://*.supabase.co https://api.stripe.com https://api.resend.com wss://*.supabase.co;
  frame-src https://js.stripe.com https://hooks.stripe.com https://www.iubenda.com;
  worker-src 'self' blob:;
  manifest-src 'self';
  base-uri 'self';
  form-action 'self';
`.replace(/\s{2,}/g, ' ').trim()

export default {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          ...securityHeaders,
          { key: 'Content-Security-Policy', value: cspHeader },
        ],
      },
    ]
  },
}
```

**Test CSP:** dopo deploy iniziale, monitora console errors. CSP è il setting più rognoso — meglio iniziare con `Content-Security-Policy-Report-Only` per qualche giorno e poi switchare.

### 7. Rate limiting

Usa **Upstash Ratelimit** (servizio Redis-as-a-service serverless, free tier abbondante):

```bash
npm install @upstash/ratelimit @upstash/redis
```

```ts
// lib/security/ratelimit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export const ratelimits = {
  // Login: 5 tentativi al minuto per IP
  auth: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 m') }),
  // Signup: 3 al minuto per IP
  signup: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '1 m') }),
  // API generic: 100 al minuto per user
  api: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100, '1 m') }),
  // Webhook Stripe (più alto, è server-to-server): 1000 al minuto
  webhook: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(1000, '1 m') }),
  // /api/access/verify (tornello): 60/min per device
  access: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, '1 m') }),
  // Password reset: 3 al giorno per email
  passwordReset: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '1 d') }),
}

export async function checkRateLimit(limiter: Ratelimit, identifier: string) {
  const { success, reset, remaining } = await limiter.limit(identifier)
  return { success, reset, remaining }
}
```

Applica in:
- Server Actions auth (`loginAction`, `signupAction`, `resetPasswordAction`)
- API routes (`/api/access/verify`, `/api/webhooks/*`)
- Server Actions costose (export dati, esporta commercialista)

In caso di rate limit hit: ritorna 429 con header `Retry-After`.

### 8. Honeypot fields nei form pubblici

Nel form signup (e in qualsiasi form pubblico anonimo), aggiungi un campo nascosto via CSS:

```tsx
<input
  type="text"
  name="website"
  tabIndex={-1}
  autoComplete="off"
  style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, width: 0 }}
/>
```

Server Action: se `website` è popolato → bot, ignora silenziosamente (ritorna success fake per non rivelare il check).

### 9. Sentry per error tracking

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

Configura Sentry per:
- Capture errors server e client
- Source maps upload in build
- Filtra dati sensibili (email, password, token) prima di inviare
- Sample rate: 100% errori, 10% transazioni performance

`sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` come da wizard.

Aggiungi `lib/observability/sentry.ts` con helper `captureException(error, context)`.

### 10. Robots, sitemap, SEO landing

`app/robots.ts`:
```ts
export default function robots() {
  return {
    rules: [
      { userAgent: '*', allow: ['/', '/login', '/signup'], disallow: ['/api/', '/dashboard/', '/app/', '/access/', '/pay/'] },
    ],
    sitemap: `${LEGAL_CONFIG.app.url}/sitemap.xml`,
  }
}
```

`app/sitemap.ts`:
```ts
export default function sitemap() {
  return [
    { url: 'https://quotal.it/', lastModified: new Date(), priority: 1.0 },
    { url: 'https://quotal.it/login', priority: 0.8 },
    { url: 'https://quotal.it/signup', priority: 0.8 },
    { url: 'https://quotal.it/privacy', priority: 0.3 },
    // ...
  ]
}
```

Metadata SEO landing:
- Title: "Quotal — Gestione abbonamenti per palestre indipendenti"
- Description: "La piattaforma SaaS che semplifica la gestione delle quote associative della tua palestra. Membri, abbonamenti, pagamenti e accessi in un'unica app."
- OG image: genera con `@vercel/og` dinamica

### 11. Polish UX finale

#### Loading states

Audit di tutta l'app: ogni Server Component che fa fetching ha un `loading.tsx` con skeleton appropriato (non un generico spinner). Skeleton matchano il layout finale.

#### Error boundaries

`app/error.tsx`, `app/global-error.tsx`, `app/(owner)/dashboard/error.tsx`, `app/(member)/app/error.tsx`:
- Layout pulito con icona alert
- Messaggio user-friendly (non lo stack trace)
- Bottone "Riprova" + "Torna alla home"
- Sentry capture automatico

#### Not-found

`app/not-found.tsx` con illustrazione + "Pagina non trovata" + link home.

#### Toast notifications

Usa shadcn `<Sonner />` ovunque per feedback azioni:
- Success verde: "Membro creato", "Abbonamento rinnovato"
- Error rosso: "Errore: ..."
- Info teal: "Email inviata"

#### Animazioni Awwwards-tier

Refinement con Framer Motion:

**Page transitions:**
- Dashboard: slide horizontal sottile tra sezioni
- PWA member: stack-style transitions tra tabs
- Reduce motion: rispetta `prefers-reduced-motion`

**Micro-interactions:**
- Bottoni: scale 0.97 on press
- Card hover: lift sottile (translateY -2px) + shadow espansa
- Toggle switch: spring physics
- Form errors: shake leggero su validazione fallita

**Number animations:**
- KPI dashboard: count-up da 0 (con `useCountUp` hook custom)
- Importi: easing custom

**Stagger reveals:**
- Liste con stagger 50ms tra elementi
- Cards dashboard con stagger 80ms

#### Dark mode (opzionale, se tempo)

Se vuoi includerlo nel MVP: usa `next-themes`, definisci dark variants per ogni token, applica con classi Tailwind `dark:`. Toggle nel profilo.

Se rimandiamo: niente dark mode nel MVP, design solo light mode polished.

#### Tipografia: revisione finale

- Verifica gerarchia: H1 unico per pagina, H2/H3 coerenti
- Line-height ottimale: 1.6 per body, 1.2 per heading
- Max-width per leggibilità: max 65ch per testo lungo
- Numeri tabulari (`tabular-nums`) ovunque ci siano colonne di importi

#### Empty states bellissimi

Ogni lista vuota ha:
- Illustrazione SVG custom (no icon generica)
- Heading + sottotitolo
- CTA primario chiaro
- Eventualmente: link a documentazione/help

### 12. Performance optimization

#### Image optimization

- Tutti gli `<img>` → `<Image>` da `next/image`
- AVIF + WebP automatici via Next.js
- Lazy loading default (eager solo per hero)
- Placeholder blur per immagini sopra il fold

#### Font optimization

- `next/font/google` per Inter
- `next/font/local` per Instrument Serif (se non su Google Fonts)
- `display: 'swap'` per evitare FOIT
- Preload solo i pesi usati above-the-fold

#### Bundle size

- Audit con `@next/bundle-analyzer`
- Dynamic import per librerie pesanti (Stripe Elements, Recharts)
- Tree-shake Lucide: import singoli `import { X } from 'lucide-react'`

#### Lighthouse target

- Performance ≥ 90 su mobile e desktop
- Accessibility ≥ 95
- Best Practices = 100
- SEO ≥ 95
- PWA: installable ✓

### 13. Accessibility audit

- Tutti i form hanno `<label>` associati (non solo placeholder)
- Tutti i bottoni e link hanno testo descrittivo (no "click here")
- Color contrast WCAG AA: testa con [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Focus visibili custom (no default browser ring)
- Skip-to-content link in cima a layout pubblici
- ARIA labels per icone-only buttons
- Test con screen reader (VoiceOver iOS, NVDA Windows)
- `prefers-reduced-motion` rispettato per tutte le animazioni

### 14. Internationalization (foundation, no implementazione completa)

L'MVP è italiano-only. Prepara struttura per i18n in futuro:

- Tutti i testi in costanti / file separati (mai inline)
- Crea `lib/i18n/it.ts` con tutte le stringhe
- In v2: aggiungi inglese con `next-intl` o `next-i18next`

Per ora, raccogli stringhe in `lib/i18n/messages.ts`:

```ts
export const messages = {
  common: {
    save: 'Salva',
    cancel: 'Annulla',
    delete: 'Elimina',
    confirm: 'Conferma',
    // ...
  },
  member: { /* ... */ },
  owner: { /* ... */ },
  // ...
}
```

Sostituisci hardcoded strings con `messages.common.save` etc. Refactor opzionale, ma utile per il futuro.

### 15. Deploy setup

#### Vercel

1. Connetti repo GitHub a Vercel
2. Configura env vars in Vercel dashboard (production):
   - Tutte le variabili di `.env.local` tranne `STRIPE_SECRET_KEY` test → produci `STRIPE_SECRET_KEY` live
   - `NEXT_PUBLIC_APP_URL=https://quotal.it`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (live key)
3. Configura dominio custom: `quotal.it` (DNS records via Vercel suggerisce)
4. SSL automatico (Let's Encrypt)
5. Configura Edge Config se serve (per feature flags futuri)

#### Supabase production

1. Project già in production (gratis tier va bene per inizio)
2. Configura backup retention: 7 giorni minimo
3. Abilita PITR (Point-in-Time Recovery) — addon a pagamento, opzionale ma raccomandato per dati di pagamento
4. Configura Custom SMTP per email auth (per evitare rate limit Supabase su email production)
5. Esegui migrations: `npx supabase db push --linked`
6. Verifica RLS policies attive su ogni tabella

#### Stripe production

1. Attiva account in modalità live (richiede verifica documenti, ~2-3 giorni)
2. Sync prezzi production: `STRIPE_SECRET_KEY=sk_live_... npx tsx scripts/sync-stripe-prices.ts`
3. Configura webhook production endpoint: `https://quotal.it/api/webhooks/stripe`
4. Aggiungi events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `setup_intent.succeeded`, `setup_intent.setup_failed`, `charge.refunded`, `mandate.updated`
5. Salva `STRIPE_WEBHOOK_SECRET` production in Vercel env

#### Resend production

1. Verifica dominio `quotal.it` (DNS records SPF, DKIM, DMARC)
2. Attiva webhook per delivery tracking
3. Upgrade a piano paid se necessario (free = 100/giorno, 3000/mese)

#### DNS records (riepilogo)

```
A     @         76.76.21.21              (Vercel)
CNAME www       cname.vercel-dns.com
TXT   @         "v=spf1 include:_spf.resend.com ~all"
TXT   _dmarc    "v=DMARC1; p=quarantine; rua=mailto:dmarc@quotal.it"
CNAME resend._domainkey  (valore da Resend)
TXT   _supabase   (se serve verificare custom SMTP)
```

### 16. Pre-launch checklist

Crea `docs/PRE-LAUNCH-CHECKLIST.md`:

```markdown
# Pre-Launch Checklist Quotal

## Legal
- [ ] LEGAL_CONFIG popolato con dati reali
- [ ] Iubenda Privacy + Cookie + Termini generati e linkati
- [ ] Cookie banner testato su prima visita (banner appare)
- [ ] Footer legale completo in tutte le pagine pubbliche
- [ ] PEC attivata (consigliata per business)
- [ ] P.IVA verificata su VIES

## Security
- [ ] Security headers attivi (verifica con securityheaders.com)
- [ ] CSP testata, no errori console
- [ ] HTTPS forzato (HSTS attivo)
- [ ] Rate limiting attivo su auth + API critiche
- [ ] Honeypot in signup
- [ ] Sentry capturing errors
- [ ] RLS verificata su ogni tabella (test con utente non autorizzato)

## Stripe
- [ ] Account live attivato
- [ ] Webhook production configurato e testato
- [ ] Prezzi sincronizzati
- [ ] Test pagamento reale con €1 (rimborsato)

## Email
- [ ] Dominio Resend verificato
- [ ] Test invio a Gmail, Outlook, Yahoo (deliverability)
- [ ] Tutte le email leggibili in dark mode client (Apple Mail, Gmail)
- [ ] Link tracking disabilitato per privacy (opzionale)

## Backup
- [ ] Supabase backup automatici attivi
- [ ] Test restore (in ambiente staging)

## Monitoring
- [ ] Sentry attivo
- [ ] Vercel Analytics attivo
- [ ] Uptime monitoring (es. Better Stack, UptimeRobot)

## Performance
- [ ] Lighthouse mobile ≥ 90 in tutte le pagine
- [ ] Bundle size analizzato

## Content
- [ ] Privacy policy approvata (Iubenda)
- [ ] Termini di servizio approvati
- [ ] Tutte le email in italiano corretto (no typos)
- [ ] Tutti gli error messages user-friendly

## Onboarding
- [ ] /onboarding-titolare disabilitato dopo primo setup
- [ ] Email "imposta password" testata per nuovo membro
- [ ] PWA installabile su iOS + Android

## Contingency
- [ ] Documentazione interna in `docs/` aggiornata
- [ ] Script di rollback DB in caso di disastro
- [ ] Persona di contatto Vercel/Supabase per support paid
```

### 17. Documentazione finale

Crea `README.md` aggiornato con:
- Quick start
- Architettura
- Stack
- Come fare deploy
- Come aggiungere nuovi piani / configurare nuovo gym
- Link a docs/

Crea `docs/`:
- `architecture.md`
- `deploy.md`
- `cron-jobs.md`
- `email-setup.md`
- `legal-setup.md`
- `numerazione-fiscale.md`
- `integrazione-tornello.md`
- `PRE-LAUNCH-CHECKLIST.md`

## Cosa NON fare

- Non implementare versione enterprise (multi-gym, ruoli avanzati, white-label) — post-MVP
- Non implementare app native iOS/Android (la PWA basta per anni)
- Non over-engineering security (per il volume MVP, l'attuale stack è proporzionato)

## Come testare la release candidate

1. **Test funzionale completo** seguendo il flow:
   - Onboarding titolare → setup palestra
   - Crea piano custom
   - Crea membro
   - Registra pagamento contanti → verifica ricevuta PDF
   - Membro fa signup autonomo da `/signup` → riceve welcome email
   - Membro paga online via SEPA → primo addebito ok → mandate salvato
   - Backdate scadenza per simulare rinnovo → ricevi email expiry_7d/3d/0
   - Tornello scansiona QR → granted/denied a seconda dello stato

2. **Test legale:**
   - Banner cookie appare alla prima visita
   - Privacy policy linkata e accessibile
   - Esporta i miei dati funziona
   - Richiesta cancellazione visibile al titolare

3. **Test security:**
   - Tentativo accesso /dashboard senza auth → redirect login
   - SQL injection test su tutti i form input → bloccato
   - XSS test → bloccato CSP
   - 6 login falliti consecutivi → rate limit kick in

4. **Test performance:**
   - Lighthouse Production: ≥ 90 mobile su `/`, `/app`, `/dashboard`
   - Time to Interactive < 3s su 4G
   - First Contentful Paint < 1.5s

5. **Test deploy:**
   - Deploy su Vercel preview → tutto funziona
   - Promote a production → smoke test critico
   - Rollback (Vercel revert) funziona se serve

## 🎉 Fine

A questo punto Quotal è **deploy-ready**. Hai un SaaS B2B completo, sicuro, conforme, performante.

**Prossimi passi commerciali (fuori scope tecnico):**
1. Usa la tua palestra come case study live per 2-4 settimane
2. Raccogli feedback titolare reale, fix bug e UX issues
3. Crea video demo + landing pubblica
4. Sales outreach a 10 palestre indipendenti vicine (Ossona/Magenta/Legnano)
5. Pricing iniziale: €29-49/mese per gym, free trial 30 giorni
6. Quando hai 5+ palestre paganti: itera su feedback e considera multi-tenant Stripe Connect
