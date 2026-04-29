# Prompt 07 — App Membri PWA

## Contesto

Auth + dashboard titolare + pagamenti pronti (prompt 04-06). Ora costruisci l'esperienza membro: una **PWA mobile-first installabile**, ottimizzata per essere usata principalmente dallo smartphone.

**Principi guida:**
- Mobile-first: ogni schermata deve essere bella e funzionante a 375px di larghezza
- Offline-friendly: il QR code deve funzionare anche senza connessione (cached)
- Onboarding minimo: il membro arriva, vede subito il suo abbonamento, può fare poche cose mirate
- Niente fronzoli: l'app del membro non è un social network, è un tessera digitale + storico

## Task

### 1. PWA setup

Installa:

```bash
npm install next-pwa@latest workbox-webpack-plugin
```

(Nota: in Next.js 15 App Router l'integrazione PWA è ancora un po' acerba. In alternativa, usa Serwist o un setup custom con service worker manuale. Per il MVP, `next-pwa` con la versione compatibile con Next 15 va bene.)

Crea `public/manifest.json`:

```json
{
  "name": "Quotal — La tua palestra in tasca",
  "short_name": "Quotal",
  "description": "Gestisci il tuo abbonamento in palestra",
  "start_url": "/app",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#FAFAF9",
  "theme_color": "#0F766E",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Genera le icone (192, 512, maskable) — placeholder ok per MVP, raffinazione in prompt 10.

Aggiungi al root layout:
```tsx
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#0F766E" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

### 2. Service worker e caching

Configura il service worker per cachare:
- Static assets (JS, CSS, fonts)
- Icone, immagini in `/public`
- L'ultimo QR code del membro (Storage) — strategy: cache-first con fallback network
- API `/api/member/qr` con stale-while-revalidate

Il QR è critico: se il membro arriva in palestra senza segnale, deve poterlo mostrare comunque. Fallback ulteriore: rigenerare il QR localmente dal `badge_uid` (encoding deterministico).

### 3. Layout PWA

`app/(member)/app/layout.tsx`:

- Server component, chiama `requireMember()`
- Recupera profile + active subscription + gym
- Top bar minimale: logo gym + dropdown profilo (avatar)
- Bottom nav fissa (4 voci):
  - 🏠 **Home** (`/app`)
  - 💳 **Abbonamento** (`/app/abbonamento`)
  - 🧾 **Pagamenti** (`/app/pagamenti`)
  - 👤 **Profilo** (`/app/profilo`)

Bottom nav: sempre visibile, fissa, safe-area-inset per iPhone con notch. Tab attiva ha indicatore (linea sottile sopra l'icona, accent color).

Background sfumato sottile: `from-stone-50 to-stone-100`. Niente overflow orizzontale mai.

### 4. Home `/app`

La pagina principale. Layout verticale a card.

#### Card 1: Stato abbonamento (HERO)

Card grande, bordo radius 24px, padding generoso, occupa quasi tutto il fold superiore.

Stati possibili:

**Attivo + giorni > 7:**
- Background: gradiente verde sottile (success/100 → success/50)
- Icona: ✓ in cerchio
- Testo: "Abbonamento attivo"
- Sotto: "{plan.name} · scade il {end_date}"
- Mini progress bar: percentuale usata del periodo
- Sotto: "{days_remaining} giorni rimanenti"

**Attivo + giorni 1-7:**
- Background: gradiente arancione (warning/100 → warning/50)
- Testo: "Abbonamento in scadenza"
- "Scade tra {N} giorni — rinnova ora per non perdere accesso"
- Bottone "Rinnova abbonamento" prominente

**Scaduto (in periodo di grazia):**
- Background: gradiente rosso (danger/100 → danger/50)
- "Abbonamento scaduto"
- "Hai ancora {grace_days_left} giorni di accesso. Rinnova subito."
- Bottone "Rinnova ora"

**Scaduto (oltre grazia) o Sospeso:**
- Background grigio
- "Accesso bloccato" / "Abbonamento sospeso"
- Bottone "Rinnova" / "Contatta titolare"

**Nessun abbonamento (membro creato senza abbonamento):**
- Background neutro
- "Non hai un abbonamento attivo"
- "Contatta {gym.name} per attivare il tuo abbonamento"

#### Card 2: QR Code per ingresso

Card con QR generato dal `badge_uid` del profile.

- Titolo "Il tuo accesso"
- QR centrato grande (300×300px circa)
- Sotto QR: nome membro + "Avvicina alla scansione"
- Stato: badge verde "✓ Attivo" / rosso "✕ Bloccato"

Generazione QR: usa `qrcode` library:
```bash
npm install qrcode
npm install -D @types/qrcode
```

Server-side: genera SVG del QR partendo da `badge_uid` (o se `badge_uid` è null, genera un nuovo UID e salvalo in DB al primo caricamento).

Encoding: il QR contiene un token JWT firmato con il badge_uid + scadenza breve (es. 5 min) per prevenire screenshot riutilizzati. Il tornello (prompt 08) verifica firma e scadenza.

```ts
// /app/api/member/qr/route.ts
const token = jwt.sign(
  { badge_uid: profile.badge_uid, gym_id: profile.gym_id },
  env.QR_TOKEN_SECRET,
  { expiresIn: '5m' }
)
const qrSvg = await QRCode.toString(token, { type: 'svg', margin: 0 })
```

Il QR si **rigenera automaticamente ogni 4 minuti** lato client (setInterval). Quando la pagina è in background, si rigenera al ritorno foreground.

#### Card 3: Prossimo pagamento (se SEPA auto-renew attivo)

Card piccola, info-only:
- "Prossimo addebito SEPA"
- "Il {date} verranno addebitati €X dal conto IBAN ****{last4}"
- Bottone "Modifica" → portal Stripe / `/app/abbonamento/pagamento`

#### Card 4: Avvisi

Stile inbox, mostra eventuali avvisi del titolare (post-MVP comunicazioni broadcast). Per ora nascondi se vuota.

### 5. Pagina Abbonamento `/app/abbonamento`

Tab interna (Tabs shadcn):

**Tab "Corrente"**
- Card riassuntiva piano corrente (piano, periodo, prezzo, metodo pagamento)
- Toggle "Rinnovo automatico SEPA" (visibile solo se ha mandato attivo)
- Bottone "Cambia metodo pagamento" → portal Stripe
- Bottone "Rinnova ora" se in scadenza/scaduto

**Tab "Storico"**
- Lista cronologica di tutte le subscription passate
- Per ogni: piano, periodo, stato, totale pagato, link al pagamento

**Tab "Sospensione"** (visibile solo se sospeso):
- Stato: "Sospeso da {data}, motivo: {reason}"
- "Per riattivare, contatta {gym.name} ({gym.phone})"

#### Sub-page `/app/abbonamento/rinnova`

- Mostra piani disponibili (cards selezionabili)
- Default selezionato: piano corrente
- Form metodo pagamento:
  - Carta (Stripe Elements)
  - SEPA (mandate esistente se presente, altrimenti nuovo IBAN)
- Bottone "Procedi al pagamento" → flusso Stripe come prompt 05
- Su success: redirect a `/app` con conferma

### 6. Pagina Pagamenti `/app/pagamenti`

Lista cronologica di tutti i `payments` del membro.

Per ogni payment, card:
- Data + ora
- Importo
- Metodo (badge con icona)
- Stato (badge: succeeded verde, failed rosso, refunded grigio)
- Bottone "Scarica ricevuta" (link diretto al PDF Storage)
- Se è una fattura: bottone "Scarica fattura"

Filtro per anno (chips in alto).

Empty state: "Non hai ancora effettuato pagamenti."

### 7. Pagina Profilo `/app/profilo`

Form editabile dei propri dati:

- Avatar (upload Supabase Storage)
- Nome (read-only? editable? — decisione: editable, ma se cambia full_name aggiorna anche su payments futuri, non passati)
- Email (read-only — cambio email richiede flusso separato Supabase)
- Telefono
- Data di nascita
- Indirizzo, città, CAP, provincia
- Codice fiscale (con validazione)
- Bottone "Salva modifiche"

**Sezione "Sicurezza":**
- Bottone "Cambia password" → flusso reset password
- Bottone "Logout" (rosso, evidente)

**Sezione "Privacy":**
- Bottone "Esporta i miei dati" (GDPR — implementazione nel prompt 10)
- Bottone "Richiedi cancellazione account" (apre dialog con avviso "Contatta {gym} per processare la richiesta")

**Sezione "Info app":**
- "Quotal v0.1.0"
- Link Termini, Privacy, Cookie (implementati nel prompt 10)
- Link "Powered by Quotal" → quotal.it

### 8. Onboarding al primo accesso PWA

Quando il membro entra per la prima volta nell'app (flag in `profiles.metadata.app_onboarded`):

- Schermata di benvenuto fullscreen, 3 step swipeable:
  1. "Benvenuto in Quotal" + illustrazione + "La palestra in tasca"
  2. "Mostra il tuo QR all'ingresso" + screenshot QR
  3. "Installa l'app sulla home" + istruzioni iOS/Android (rilevamento automatico user agent)
- Bottone "Inizia" all'ultimo step → set flag e redirect a `/app`

Implementa con Framer Motion (swipe gesture su mobile).

### 9. Install prompt PWA

Banner in fondo (sopra bottom nav) che appare se la PWA non è installata:
- "📱 Installa Quotal per un accesso rapido"
- Bottone "Installa" → trigger `beforeinstallprompt` event
- Bottone "Più tardi" → dismiss per 7 giorni (localStorage)

iOS: Safari non supporta `beforeinstallprompt`. Mostra istruzioni manuali: "Tocca [share icon] e poi 'Aggiungi a Home'".

### 10. Push notifications (foundation — implementazione completa in v2)

Predisponi struttura ma non attivare ancora:
- Service worker registra subscription
- Endpoint `/api/member/push-subscribe` salva subscription in tabella `push_subscriptions`
- Migration:

```sql
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh_key text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
```

Niente UI per ora, niente trigger di richiesta permessi. Il send avverrà nel prompt 09 (insieme alle email).

### 11. Stato connessione

Detect online/offline:
- Hook `useOnlineStatus()` con `navigator.onLine` + event listeners
- Banner top sticky se offline: "Sei offline — il QR funziona comunque"
- Disabilita bottoni "Rinnova" e form se offline (sostituisci con "Riconnetti per pagare")

### 12. Animazioni e polish

Framer Motion ovunque:
- Page transitions (slide horizontal tra tabs)
- Card entrance: fade + slide up con stagger
- Number animations (count-up) su giorni rimanenti, importi
- Pull-to-refresh sulla home (triggera revalidate Server Component)

Feedback haptic (web vibration API) su:
- QR rigenerato: vibrazione corta
- Submit form pagamento: vibrazione media
- Errore: vibrazione doppia

### 13. Server queries member

`lib/queries/member.ts`:

```ts
export async function getMemberHomeData(memberId: string) {
  // Single query con JOIN per:
  // - profile
  // - active subscription with plan
  // - active sepa_mandate
  // - latest payment
  // Calcola: days_remaining, status_label, grace_period_remaining
  // Ritorna struttura piatta pronta per UI
}

export async function getMemberPaymentHistory(memberId: string, year?: number) { ... }

export async function getMemberSubscriptionHistory(memberId: string) { ... }
```

### 14. Server actions member

`app/actions/member.ts`:

```ts
export async function updateMemberProfileAction(input: UpdateProfileInput)
export async function uploadAvatarAction(formData: FormData)
export async function toggleAutoRenewAction(subscriptionId: string, enabled: boolean)
export async function exportMyDataAction()  // GDPR — ZIP con tutti i dati
```

### 15. Componenti specifici member

In `components/member/`:

- `subscription-status-card.tsx` — la card hero, gestisce tutti gli stati
- `qr-code-card.tsx` — QR + auto-refresh + offline cache
- `bottom-nav.tsx` — bottom navigation
- `page-header.tsx` — header pagine interne (back button + titolo)
- `payment-history-item.tsx` — card singolo payment

## Cosa NON fare

- Non implementare push notifications send (prompt 09)
- Non implementare ricezione comunicazioni broadcast dal titolare (post-MVP)
- Non implementare richiesta sospensione dal membro (post-MVP, decisione presa)

## Come testare

1. Login come membro su mobile (Chrome) → arriva su `/app`
2. Onboarding 3 step funziona, install prompt appare
3. Card stato abbonamento mostra correttamente: attivo/scadenza/scaduto in base al membro
4. QR code visibile, ben leggibile
5. QR si rigenera dopo 4 min (verificabile inspector)
6. Modalità aereo: QR rimane visibile (cache), banner offline appare
7. Pagina pagamenti: lista corretta, scarica PDF funziona
8. Profilo: modifica telefono, salva, refresh → modifica persistente
9. Lighthouse audit: PWA installable ✓, performance > 90, accessibility > 95
10. Test installazione: "Aggiungi a Home" su iOS Safari + Android Chrome → app si apre standalone
11. Su /dashboard accesso da membro logged → redirect a /app
