# Prompt 04 — Dashboard Titolare

## Contesto

Auth e ruoli pronti (prompt 03). Ora costruisci la dashboard del titolare: il cuore operativo del prodotto. Da qui il titolare gestisce tutto: membri, abbonamenti, pagamenti (registrazione manuale per ora, Stripe arriva nel prompt 05), ingressi.

**Principio guida:** il titolare apre l'app la mattina e in 3 secondi capisce com'è andato il business. Se serve più di 3 click per qualsiasi operazione frequente, abbiamo sbagliato qualcosa.

## Task

### 1. Layout dashboard

`app/(owner)/dashboard/layout.tsx` — server component che:
1. Chiama `requireOwnerOrStaff()`
2. Recupera `gym` corrente
3. Renderizza shell: sidebar sinistra (desktop) / bottom nav (mobile) + content area

#### Sidebar (`components/owner/sidebar.tsx`)

Voci di nav, in ordine:
- **Home** (`/dashboard`) — icona LayoutDashboard
- **Membri** (`/dashboard/membri`) — icona Users
- **Abbonamenti** (`/dashboard/abbonamenti`) — icona CreditCard
- **Pagamenti** (`/dashboard/pagamenti`) — icona Receipt
- **Ingressi** (`/dashboard/ingressi`) — icona DoorOpen
- **Impostazioni** (`/dashboard/impostazioni`) — icona Settings (in fondo, separato)

Logo Quotal in alto, dropdown profilo in basso (avatar + nome titolare → menu con "Profilo", "Logout").

Mobile: sidebar collassa in bottom-nav con le 5 voci principali (no impostazioni nel mobile-nav, accessibili da menu profilo).

#### Top bar (desktop only)

Barra superiore minimale con:
- Breadcrumb a sinistra (es. "Dashboard / Membri / Mario Rossi")
- Search globale al centro (cmd+K stile, per ora placeholder, implementazione in v2)
- Bell-icon notifiche a destra (placeholder per ora, popolata nel prompt 09)

### 2. Home dashboard (`/dashboard`)

`app/(owner)/dashboard/page.tsx`. Layout a griglia. **Tutti i numeri sono server-rendered, niente client fetch.**

#### Hero KPI section

Tre card grandi affiancate (mobile: stacked):

**Card 1 — Incasso del mese**
- Numero grande in font Instrument Serif, formato `formatCurrency()`
- Sottotitolo: "vs mese scorso: +12% / -5% / =" (verde/rosso/grigio)
- Mini sparkline ultimi 30 giorni (Recharts area chart, no assi)

**Card 2 — Membri attivi**
- Numero grande
- Sottotitolo: "Su 142 totali" (totali = active + expired + suspended)
- Breakdown piccolo sotto: "129 attivi · 8 in scadenza · 5 sospesi"

**Card 3 — Ingressi oggi**
- Numero grande
- Sottotitolo: "Picco alle 19:00" (orario con più ingressi del giorno)
- Mini bar chart per ora (Recharts)

Animazione di entrata Framer Motion: fade + slide up sequenziale, stagger 80ms.

#### Action cards

Sotto i KPI, due card grandi side-by-side (mobile: stacked):

**Card "Scadenze prossime 7 giorni"**
- Lista compatta dei membri con abbonamento in scadenza
- Per ogni: avatar + nome + giorni rimanenti (badge colorato: 7-4gg verde, 3-1gg arancione, 0gg rosso) + piccolo bottone "Rinnova"
- Footer: "Vedi tutte" → link a `/dashboard/abbonamenti?filter=expiring`

**Card "Ultimi pagamenti"**
- Lista ultimi 5 pagamenti
- Per ogni: nome membro + importo + metodo (badge: 💳 carta, 🏦 SEPA, 💶 contanti) + data relativa
- Footer: "Vedi tutti" → `/dashboard/pagamenti`

#### Quick actions

Riga di bottoni in fondo:
- "+ Nuovo membro" → apre dialog/page nuovo membro
- "+ Registra pagamento contanti" → dialog rapido per registrare cash payment (popolato veramente nel prompt 06, qui solo bottone)
- "Esporta dati mese" → genera CSV pagamenti del mese (implementazione: server action che ritorna CSV)

### 3. Sezione Membri

#### `/dashboard/membri` (lista)

Server component con:

- Header: titolo "Membri" + bottone "+ Nuovo membro" (top right)
- Filtri (chips): "Tutti" (default), "Attivi", "In scadenza", "Scaduti", "Sospesi", "Senza abbonamento"
- Search box: ricerca per nome/email/telefono (server-side, debounced via URL params)
- Tabella responsive con colonne:
  - Avatar + Nome (cliccabile)
  - Email
  - Telefono
  - Stato abbonamento (badge colorato)
  - Piano corrente
  - Scadenza (data + giorni rimanenti)
  - Azioni (kebab menu: Visualizza, Rinnova, Sospendi, Modifica, ...)

Mobile: tabella diventa lista di card con info essenziali.

Paginazione: 50 per pagina, server-side via query params (`?page=2`).

Empty state: illustrazione + "Nessun membro ancora. Inizia aggiungendo il primo." + bottone CTA.

#### `/dashboard/membri/nuovo` (form)

Form completo per creare un nuovo membro:

- Nome completo *
- Email *
- Telefono
- Data di nascita
- Indirizzo, città, CAP, provincia
- Codice fiscale (opzionale, con validazione `isValidCodiceFiscale` se compilato)
- Foto profilo (upload Supabase Storage, opzionale)
- Note interne (textarea, mai mostrate al membro)
- Badge UID (per tornello, opzionale, popolato nel prompt 08)

**Sezione "Iscrizione iniziale":**
- Checkbox "Crea abbonamento subito"
- Se attivo: select piano + select metodo pagamento (Carta/SEPA/Contanti/Bonifico) + data inizio
- Se "Contanti" o "Bonifico": pulsante "Crea membro e registra pagamento" (genera ricevuta nel prompt 06)
- Se "Carta" o "SEPA": pulsante "Crea membro e invia link pagamento" (apre flusso Stripe nel prompt 05)

Server Action `createMemberAction`:
1. Valida con Zod
2. Genera password temporanea, crea utente con `supabase.auth.admin.createUser({ email_confirm: true, password })`
3. Trigger DB crea profile (gym_id derivato dal titolare loggato)
4. Aggiorna profile con tutti i campi extra (codice_fiscale, indirizzo, etc.)
5. Se "Crea abbonamento": crea riga in `subscriptions` con `start_date = today`, `end_date = today + plan.duration_days`, status `active`
6. Se metodo cash: registra payment immediato (logica nel prompt 06)
7. Invia email al membro con credenziali e link "imposta la tua password" (Supabase password reset link)
8. Redirect a `/dashboard/membri/{id}`

#### `/dashboard/membri/[id]` (dettaglio)

Layout a tabs:

**Tab "Panoramica"**
- Card profilo: avatar, nome, email, telefono, badge UID
- Card abbonamento attivo: piano, data inizio/fine, stato, giorni rimanenti, auto-renew on/off
- Quick actions: "Rinnova", "Sospendi", "Modifica dati", "Disattiva membro"

**Tab "Storico abbonamenti"**
- Tabella di tutti i `subscriptions` del membro (anche scaduti/cancellati)
- Per ognuno: piano, periodo, stato, totale pagato

**Tab "Pagamenti"**
- Tabella di tutti i `payments` del membro
- Per ognuno: data, importo, metodo, stato, link ricevuta PDF

**Tab "Ingressi"**
- Lista ultimi 30 ingressi
- Grafico calendario ultimi 90 giorni (heatmap stile GitHub contributions)

**Tab "Note"**
- Textarea editabile con note interne titolare
- Toggle "Membro problematico" + motivo

#### Azioni: Rinnova, Sospendi, Modifica

**Rinnova abbonamento (dialog):**
- Select piano (default = piano attuale)
- Data inizio (default = data fine attuale, o oggi se già scaduto)
- Metodo pagamento
- Conferma → crea nuova subscription, registra payment se cash, redirect

**Sospendi (dialog):**
- Textarea "Motivo sospensione" (opzionale ma raccomandato)
- Conferma → cambia status a `suspended`, crea riga `subscription_suspensions` con `suspended_at = now()`, NON tocca `end_date` ancora (verrà aggiornata al resume con `days_added_to_end_date`)

**Riattiva (se sospeso):**
- Conferma → calcola `days_suspended = now - suspended_at`
- Aggiorna `subscription_suspensions.resumed_at = now`, `days_added_to_end_date = days_suspended`
- Aggiorna `subscriptions.end_date = end_date + days_suspended`, `status = 'active'`, `suspension_days_used += days_suspended`
- Verifica `suspension_days_used <= maxSuspensionDaysPerYear` (avviso se eccede)

### 4. Sezione Abbonamenti

#### `/dashboard/abbonamenti`

Vista calendario/lista degli abbonamenti attivi.

- Toggle vista: **Lista** | **Calendario**
- Lista: tabella simile a membri, ma centrata su subscription (con piano, periodo, stato)
- Calendario: timeline mensile con barre orizzontali per ogni subscription (stile Gantt). Click su barra → dettaglio.

Filtri: per piano, stato, periodo. Export CSV.

### 5. Sezione Pagamenti

#### `/dashboard/pagamenti`

Registro contabile completo.

- Header: KPI riga ("Incassato questo mese", "Contanti", "Digitale", "In attesa")
- Filtri: data range (default mese corrente), metodo, stato
- Tabella:
  - Data
  - Membro (nome cliccabile)
  - Importo
  - Metodo (badge colorato)
  - Stato (badge)
  - Numero ricevuta
  - Numero fattura (se esiste)
  - Azioni: Scarica ricevuta, Scarica fattura (se esiste), Annulla (refund — implementato in prompt 05/06)
- Footer: totali (somma importi visibili)

**Bottone "Esporta per commercialista"**: genera ZIP con tutti i PDF + Excel riepilogativo. Implementazione completa nel prompt 06 (per ora bottone disabilitato con tooltip "Disponibile dopo il primo pagamento").

### 6. Sezione Ingressi

#### `/dashboard/ingressi`

Log di tutti gli accessi (popolato veramente dal prompt 08).

- Filtri: data range, membro, esito (granted/denied)
- Tabella: data/ora, membro, badge UID, esito, motivo denial
- Grafici:
  - Bar chart ingressi per ora del giorno (oggi)
  - Heatmap settimana (giorno × ora)
  - Top 10 membri più frequenti del mese

Per ora popolato con dati seed/mock se DB vuoto, in modo che il titolare veda la struttura.

### 7. Sezione Impostazioni

#### `/dashboard/impostazioni/palestra`

Form per editare dati gym: nome, P.IVA, indirizzo, telefono, logo (upload), brand color (color picker).

#### `/dashboard/impostazioni/piani`

Lista piani abbonamento (da `subscription_plans`). Editabili: nome, descrizione, durata, prezzo, attivo/non attivo. Riordinabili (drag & drop con `@dnd-kit`).

Bottone "+ Nuovo piano" per aggiungere piani custom.

#### `/dashboard/impostazioni/regole`

Form per `gym.settings`:
- Periodo di grazia post-scadenza (giorni, default 3)
- Limite sospensioni annuali (giorni, default 60)
- Giorni di notifica scadenza (multi-select: 7, 3, 0)

#### `/dashboard/impostazioni/profilo`

Dati personali del titolare loggato + cambio password.

### 8. Server Actions e queries

Crea `app/actions/owner.ts` con tutte le server actions:

- `createMemberAction(input)`
- `updateMemberAction(id, input)`
- `deleteMemberAction(id)` (soft: imposta is_active=false, oppure hard delete con conferma)
- `renewSubscriptionAction(memberId, planId, paymentMethod, startDate)`
- `suspendSubscriptionAction(subscriptionId, reason)`
- `resumeSubscriptionAction(subscriptionId)`
- `updateGymSettingsAction(settings)`
- `updatePlanAction(id, input)`
- `createPlanAction(input)`
- `togglePlanActiveAction(id)`
- `reorderPlansAction(orderedIds[])`

Crea `lib/queries/owner.ts` con queries server-only:

- `getDashboardKPIs(gymId)` → ritorna { monthRevenue, lastMonthRevenue, activeMembers, totalMembers, todayEntries, peakHour, etc. }
- `getMembersList(gymId, filters)` → lista paginata membri
- `getMemberDetail(memberId)` → profile + active_subscription + last_payments
- `getExpiringSoon(gymId, days = 7)` → membri con scadenza nei prossimi N giorni
- `getRecentPayments(gymId, limit = 5)`
- `getPaymentsList(gymId, filters)` → lista paginata
- `getAccessLogsList(gymId, filters)`
- `getSubscriptionsList(gymId, filters)`

### 9. Componenti riutilizzabili

In `components/owner/`:

- `member-card.tsx` — card riassuntiva membro (uso in liste mobile)
- `subscription-status-badge.tsx` — badge colorato per stati
- `payment-method-badge.tsx` — badge con icona per metodo
- `kpi-card.tsx` — card grande con numero, titolo, delta, sparkline
- `empty-state.tsx` — illustrazione + testo + CTA per stati vuoti
- `data-table.tsx` — tabella generica con sort/filter (basata su shadcn DataTable + tanstack/table)

### 10. Empty state e onboarding-coach

Quando il titolare entra per la prima volta in dashboard senza nessun membro, mostra **onboarding coach** (banner sticky in alto, dismissable):

```
✨ Benvenuto in Quotal!
Per iniziare, aggiungi il tuo primo membro.
Hai bisogno di aiuto? Guarda il video tutorial (2 min).
[+ Aggiungi primo membro]  [Guarda tutorial]
```

Stato salvato in `profiles.metadata.onboarding_dismissed` o in localStorage.

## Cosa NON fare

- Non implementare Stripe (prompt 05)
- Non generare PDF ricevute (prompt 06)
- Non implementare email automatiche scadenza (prompt 09)
- Non implementare integrazione tornello reale (prompt 08, e per ora gli ingressi sono mock/seed)

## Come testare

1. Login come titolare → arriva su dashboard, vede KPI a zero
2. Crea primo membro → appare in lista membri
3. Crea abbonamento per il membro (cash) → vede scadenza nella card "Scadenze prossime"
4. Sospendi abbonamento → membro appare nella lista "Sospesi"
5. Riattiva → end_date aggiornata correttamente
6. Modifica un piano (prezzo da 40€ a 45€) → riflesso in dropdown nuovo abbonamento
7. Tutte le pagine responsive da 375px in su senza overflow orizzontale
