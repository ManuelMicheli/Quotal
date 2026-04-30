# Legal & GDPR setup

Quotal ships with three rendered legal pages and a self-service GDPR flow.
Every static value lives in **`lib/legal/config.ts`** (`LEGAL_CONFIG`) — fill
those fields with the real values **before** going live.

## 1. Update `lib/legal/config.ts`

| Field | Where it appears | Notes |
| --- | --- | --- |
| `company.name` | Footer + privacy + termini | Ragione sociale completa. |
| `company.legal_form` | Privacy | "Ditta individuale", "S.r.l.", ... |
| `company.vat_number` | Footer + privacy + termini | Format: `ITxxxxxxxxxxx`. Verificable on [VIES](https://ec.europa.eu/taxation_customs/vies/). |
| `company.fiscal_code` | Privacy | Per ditta individuale = c.f. del titolare. |
| `company.rea_number` | Footer | Numero REA (CCIAA). Lasciare `null` se non iscritti. |
| `company.headquarters` | Footer + privacy | Sede legale. |
| `company.email` | Footer | Email business pubblica. |
| `company.pec` | Footer | PEC raccomandata per business. |
| `data_controller` | Privacy | Persona fisica responsabile dei dati. |
| `dpo` | Privacy | Solo se nominato (Art. 37 GDPR raramente obbligatorio per palestre). |
| `app.url` | OG meta + sitemap + robots | URL pubblico in produzione. |
| `iubenda` | Footer | Lasciare `null` per la versione self-hosted; popolare se si vuole adottare Iubenda. |

## 2. Pages rendered

| Path | Source | Indicizzata |
| --- | --- | --- |
| `/privacy` | `app/(legal)/privacy/page.tsx` | sì |
| `/termini` | `app/(legal)/termini/page.tsx` | sì |
| `/cookie-policy` | `app/(legal)/cookie-policy/page.tsx` | sì |

I template sono redatti come bozza GDPR-compliant per una piattaforma SaaS B2B
italiana che gestisce dati di tesseramento + pagamenti. **Far revisionare
sempre da un avvocato prima del go-live.**

## 3. Cookie banner

Quotal MVP usa solo cookie tecnici essenziali:

- `sb-*-auth-token` — sessione Supabase (HttpOnly, durata 1 anno rolling)
- `__stripe_mid`, `__stripe_sid` — anti-frode pagamenti carta (terza parte
  Stripe, settato solo durante la sessione di pagamento)
- `quotal-cookie-notice` — non è un cookie ma una preferenza in `localStorage`
  (ricorda la chiusura dell'avviso informativo)

**Linee guida Garante (10 giugno 2021, par. 4.1):** per cookie tecnici non è
richiesto consenso preventivo. Il banner Quotal è **informativo**, con un
solo pulsante `Ho capito` e link alla Cookie Policy estesa. Non si gestisce
opt-out perché non c'è nulla di profilativo da bloccare.

Se in futuro si introducono analytics (es. PostHog, Plausible) o pixel di
marketing, sostituire `components/shared/cookie-banner.tsx` con una soluzione
di consent management (Iubenda Cookie Solution, Cookiebot, OneTrust) e
aggiornare la Cookie Policy.

## 4. Esercizio dei diritti GDPR

Il membro ha due azioni self-service nel proprio profilo (`/app/profilo`):

### Esportazione (Art. 20 — portabilità)

`exportMyDataAction` in `app/actions/legal.ts`:

1. Carica via RLS tutti i dati del membro (profile, subscriptions, payments,
   access_logs, sepa_mandates, push_subscriptions, notification_preferences).
2. Costruisce uno ZIP con `dati-personali.json`, `ingressi.csv` e un README.
3. Carica il file nel bucket privato `exports` (Supabase Storage), path
   `{member_id}/{request_id}.zip`.
4. Genera un signed URL valido **24 ore** e lo restituisce al client.
5. Inserisce un audit row in `data_export_requests` (per il Garante).

Rate-limited a 2 esportazioni/ora per membro.

### Cancellazione (Art. 17 — diritto all'oblio)

`requestAccountDeletionAction`:

- Inserisce un row pending in `account_deletion_requests`.
- Il titolare la vede in `/dashboard/impostazioni/gdpr-richieste`.
- Da lì può "Anonimizzare" (esegue `processAccountDeletionAction`):
  - scrubba il profile: `full_name='Utente eliminato'`, email/telefono/CF/
    indirizzo/note/avatar/badge_uid → `null`, `deleted_at = now()`.
  - cancella `push_subscriptions` e `notification_preferences`.
  - **NON tocca `payments`, `subscriptions`, `notifications_sent`,
    `access_logs`** — vincoli fiscali italiani: 10 anni di conservazione
    (art. 2220 c.c.).
- Oppure "Rifiutare" con motivazione.

L'art. 12 GDPR prevede risposta entro 1 mese (estendibile fino a 3 in casi
complessi). Comunicare comunque l'esito al membro via email.

## 5. Ulteriori obblighi a carico del titolare

- **Registro dei trattamenti** (Art. 30 GDPR): non c'è un endpoint software,
  va tenuto offline (Word/Excel). Template: [garanteprivacy.it](https://www.garanteprivacy.it/regolamentoue/registro-delle-attivita-di-trattamento).
- **Data Breach** (Art. 33): in caso di violazione notificare al Garante
  entro 72h (form online).
- **Misure di sicurezza** (Art. 32): documentate qui:
  - HTTPS forzato + HSTS preload (Next config).
  - Cifratura a riposo AES-256 (Supabase di default).
  - RLS attiva su ogni tabella.
  - Rate limiting su login/signup/reset (`lib/security/rate-limit.ts`).
  - Honeypot + email confirm sul signup pubblico.
  - Headers CSP, X-Frame-Options DENY, etc. (`next.config.ts`).
