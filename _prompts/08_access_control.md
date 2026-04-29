# Prompt 08 — Modulo Controllo Accessi (Access Control)

## Contesto

PWA membro pronta (prompt 07). Ora implementa il **modulo controllo accessi**, isolato dietro un'interfaccia astratta (`AccessControlAdapter`) che consente di plug-and-play diversi backend hardware.

**Decisione architetturale chiave:** non integriamo direttamente un tornello specifico ora, ma costruiamo:
1. Un'interfaccia `AccessControlAdapter` ben definita
2. Una **implementazione `MockAdapter`** per dev/testing
3. Una **implementazione `RestAdapter`** generica che funziona con qualunque tornello che esponga un endpoint HTTP
4. Un'**Edge Function endpoint** `/api/access/verify` che il tornello chiama per verificare un badge

Quando avrai il modello esatto del tuo tornello, scriveremo un adapter specifico (es. `WiegandAdapter`, `OsdpAdapter`, `MyHardwareAdapter`) in un prompt aggiuntivo dedicato. Per ora il sistema è completamente funzionante con QR + tablet + REST adapter.

## Architettura

```
┌──────────────────┐     QR scan/badge      ┌────────────────┐
│ Tornello/Tablet  │ ─────────────────────> │ Edge Function  │
│ (hardware)       │ <───── grant/deny ──── │ /access/verify │
└──────────────────┘                        └────────┬───────┘
                                                     │
                                                     │ verifica
                                                     ▼
                                            ┌────────────────┐
                                            │ Supabase DB    │
                                            │ + access_logs  │
                                            └────────────────┘
```

Il tornello fa **una sola chiamata HTTP**: `POST /api/access/verify` con `{ badge_uid: "...", device_id: "..." }`. Riceve `{ granted: true, member_name: "...", message: "Bentornato Mario" }` o `{ granted: false, reason: "expired", message: "Abbonamento scaduto" }`.

**Vantaggio:** il tornello non sa nulla del business logic. Tutta la logica (subscription attiva? in periodo di grazia? sospeso?) è nel server. Cambiare hardware = cambiare solo come il tornello chiama l'endpoint, niente cambia lato server.

## Task

### 1. Edge Function endpoint `/api/access/verify`

Crea `app/api/access/verify/route.ts` (Next.js API route, non Edge Function Supabase per semplicità — usa Vercel Edge runtime):

```ts
export const runtime = 'edge'

import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/admin-edge'
import { verifyDeviceToken } from '@/lib/access/device-auth'
import { evaluateAccess } from '@/lib/access/evaluate'

const inputSchema = z.object({
  badge_uid: z.string().optional(),
  qr_token: z.string().optional(),     // QR firmato JWT (per ingressi via PWA)
  device_id: z.string(),
}).refine(d => d.badge_uid || d.qr_token, { message: 'badge_uid or qr_token required' })

export async function POST(req: Request) {
  // 1. Auth: il tornello deve avere un device token
  const deviceToken = req.headers.get('x-device-token')
  if (!deviceToken) return new Response('Missing device token', { status: 401 })
  
  const device = await verifyDeviceToken(deviceToken)
  if (!device) return new Response('Invalid device token', { status: 401 })
  
  // 2. Parse input
  const body = await req.json()
  const input = inputSchema.parse(body)
  
  // 3. Estrai badge_uid (da QR JWT se presente, altrimenti diretto)
  let badgeUid = input.badge_uid
  if (input.qr_token) {
    try {
      const decoded = jwt.verify(input.qr_token, env.QR_TOKEN_SECRET) as any
      badgeUid = decoded.badge_uid
    } catch {
      return Response.json({ granted: false, reason: 'invalid_qr', message: 'QR non valido o scaduto' })
    }
  }
  
  // 4. Valuta accesso
  const result = await evaluateAccess({
    gym_id: device.gym_id,
    badge_uid: badgeUid!,
    device_id: input.device_id,
  })
  
  // 5. Logga sempre (granted o denied)
  const supabase = createServiceRoleClient()
  await supabase.from('access_logs').insert({
    gym_id: device.gym_id,
    member_id: result.member_id,
    badge_uid: badgeUid,
    granted: result.granted,
    denial_reason: result.granted ? null : result.reason,
    device_id: input.device_id,
    metadata: { source: input.qr_token ? 'qr' : 'badge' },
  })
  
  return Response.json({
    granted: result.granted,
    member_name: result.member_name,
    message: result.message,
    reason: result.reason,
  })
}
```

### 2. Logica `evaluateAccess`

Crea `lib/access/evaluate.ts`:

```ts
type EvaluateInput = {
  gym_id: string
  badge_uid: string
  device_id: string
}

type EvaluateResult = {
  granted: boolean
  member_id: string | null
  member_name: string | null
  reason: 'unknown_badge' | 'no_subscription' | 'expired' | 'expired_grace' | 'suspended' | 'cancelled' | null
  message: string  // messaggio user-friendly per display tornello
}

export async function evaluateAccess(input: EvaluateInput): Promise<EvaluateResult> {
  const supabase = createServiceRoleClient()
  
  // Trova member dal badge_uid
  const { data: member } = await supabase
    .from('profiles')
    .select(`
      id, full_name, gym_id,
      subscriptions:subscriptions!member_id (
        id, status, end_date, original_end_date,
        plan:subscription_plans (name)
      )
    `)
    .eq('badge_uid', input.badge_uid)
    .eq('gym_id', input.gym_id)
    .single()
  
  if (!member) {
    return {
      granted: false, member_id: null, member_name: null,
      reason: 'unknown_badge',
      message: 'Badge non riconosciuto',
    }
  }
  
  // Trova subscription attiva (o quella appena scaduta in grace period)
  const sub = member.subscriptions
    .filter(s => s.status === 'active' || s.status === 'expired')
    .sort((a, b) => b.end_date.localeCompare(a.end_date))[0]
  
  if (!sub) {
    return {
      granted: false, member_id: member.id, member_name: member.full_name,
      reason: 'no_subscription',
      message: `Ciao ${member.full_name.split(' ')[0]}, non hai un abbonamento attivo`,
    }
  }
  
  if (sub.status === 'suspended') {
    return {
      granted: false, member_id: member.id, member_name: member.full_name,
      reason: 'suspended',
      message: 'Abbonamento sospeso. Parla col titolare.',
    }
  }
  
  const today = new Date().toISOString().split('T')[0]
  const endDate = sub.end_date
  
  if (endDate >= today) {
    // Subscription valida
    return {
      granted: true, member_id: member.id, member_name: member.full_name,
      reason: null,
      message: `Bentornato/a, ${member.full_name.split(' ')[0]}!`,
    }
  }
  
  // Scaduta — verifica periodo di grazia
  const { data: gym } = await supabase.from('gyms').select('settings').eq('id', input.gym_id).single()
  const graceDays = gym?.settings?.gracePeriodDays ?? 3
  
  const graceEndDate = new Date(endDate)
  graceEndDate.setDate(graceEndDate.getDate() + graceDays)
  
  if (new Date(today) <= graceEndDate) {
    return {
      granted: true, member_id: member.id, member_name: member.full_name,
      reason: null,
      message: `${member.full_name.split(' ')[0]}, abbonamento scaduto. Rinnova entro ${graceDays}gg`,
    }
  }
  
  return {
    granted: false, member_id: member.id, member_name: member.full_name,
    reason: 'expired',
    message: 'Abbonamento scaduto. Rinnova per accedere.',
  }
}
```

### 3. Device authentication

I tornelli/tablet sono dispositivi fisici autorizzati. Ognuno ha un token unico.

Migration:

```sql
create table public.access_devices (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  name text not null,                 -- es. "Tornello ingresso", "Tablet reception"
  device_type text not null,          -- 'turnstile', 'tablet', 'rfid_reader', etc.
  token_hash text not null,           -- bcrypt hash del token
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create index access_devices_gym_idx on public.access_devices(gym_id);
```

`lib/access/device-auth.ts`:

```ts
import bcrypt from 'bcryptjs'

export async function verifyDeviceToken(token: string) {
  const supabase = createServiceRoleClient()
  
  // Estrai prefix per lookup veloce (token format: "qd_<deviceId>_<secret>")
  const [prefix, deviceId, secret] = token.split('_')
  if (prefix !== 'qd' || !deviceId || !secret) return null
  
  const { data: device } = await supabase
    .from('access_devices')
    .select('*')
    .eq('id', deviceId)
    .eq('is_active', true)
    .single()
  
  if (!device) return null
  
  const isValid = await bcrypt.compare(secret, device.token_hash)
  if (!isValid) return null
  
  // Update last_seen
  await supabase.from('access_devices')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', deviceId)
  
  return device
}

export async function generateDeviceToken(): Promise<{ token: string, hash: string }> {
  const secret = crypto.randomBytes(32).toString('base64url')
  const hash = await bcrypt.hash(secret, 10)
  return { secret, hash }
}
```

### 4. UI Dashboard: gestione dispositivi

`/dashboard/impostazioni/dispositivi` — sezione nelle impostazioni:

- Lista dispositivi con: nome, tipo, ultima attività, stato (attivo/disattivo)
- Bottone "+ Nuovo dispositivo" → dialog:
  - Nome (es. "Tornello principale")
  - Tipo (select: Tornello, Tablet, RFID Reader, Altro)
  - On submit: genera token, mostra una sola volta (modal con copia + warning "Salva subito, non sarà più mostrato"), inserisce in DB con hash
- Per ogni dispositivo: bottone "Rigenera token" (invalida vecchio), "Disattiva", "Elimina"

### 5. Tablet Mode `/access` — implementazione MVP del controllo

Pagina **fullscreen**, ottimizzata per tablet montato all'ingresso, accessibile a `/access?token={device_token}`.

`app/access/page.tsx`:

- Server component che valida `device_token` query param
- Se invalido: schermata "Dispositivo non autorizzato"
- Se valido: renderizza client component `<AccessTerminal device={device} />`

`components/access/access-terminal.tsx` (Client):

**UI fullscreen:**
- Sfondo scuro (modalità ottimale per ambiente palestra)
- Logo gym in alto
- Centro: zona scanner QR (`html5-qrcode` library: `npm install html5-qrcode`)
- Stato: "In attesa di scansione..." pulsante
- Quando legge un QR:
  - Chiama `/api/access/verify` con `qr_token`
  - Mostra **risultato fullscreen per 3 secondi:**
    - Granted: schermata verde, ✓ grande, "Bentornato Mario!", suono di conferma
    - Denied: schermata rossa, ✕ grande, motivo, suono di errore
  - Dopo 3s: torna allo scanner

**Suoni:** usa Web Audio API per emettere bip configurabili. File audio in `/public/sounds/granted.mp3` e `denied.mp3`.

**Manuale:** sotto lo scanner, bottone "Inserimento manuale" → input numerico per badge UID per casi in cui il QR non funziona.

**Modalità kiosk:** previeni navigation away (beforeunload), prevent zoom, fullscreen API.

### 6. Adapter pattern per hardware esterno

Crea `lib/access/adapters/types.ts`:

```ts
export interface AccessControlAdapter {
  /**
   * Inizializza adapter (es. apre connessione Wiegand, registra listener)
   */
  initialize(config: AdapterConfig): Promise<void>
  
  /**
   * Listener per eventi badge ricevuti dall'hardware
   */
  onBadgeRead(callback: (badgeUid: string) => void): void
  
  /**
   * Apre il varco fisico (rilascia tornello)
   */
  grantAccess(durationMs?: number): Promise<void>
  
  /**
   * Mostra messaggio sul display del tornello (se supportato)
   */
  displayMessage(message: string, durationMs?: number): Promise<void>
  
  /**
   * Cleanup
   */
  shutdown(): Promise<void>
}

export type AdapterConfig = {
  endpoint?: string
  apiKey?: string
  serialPort?: string
  // ... etc, varia per implementazione
}
```

`lib/access/adapters/mock-adapter.ts`:

```ts
export class MockAdapter implements AccessControlAdapter {
  private callback: ((badge: string) => void) | null = null
  
  async initialize() { console.log('Mock adapter initialized') }
  
  onBadgeRead(cb: (badge: string) => void) { this.callback = cb }
  
  async grantAccess(ms = 3000) { console.log(`[MOCK] Access granted for ${ms}ms`) }
  
  async displayMessage(msg: string) { console.log(`[MOCK] Display: ${msg}`) }
  
  async shutdown() {}
  
  // Helper per testing: simula un badge swipe
  simulateBadge(uid: string) { this.callback?.(uid) }
}
```

`lib/access/adapters/rest-adapter.ts`:

```ts
/**
 * Generic REST adapter: il tornello espone un'API HTTP a cui ci colleghiamo via webhook
 * o polling. Implementazione di esempio per tornelli con API REST.
 */
export class RestAdapter implements AccessControlAdapter {
  // Implementazione che fa fetch all'endpoint del tornello per:
  // - Subscribe a webhook badge events (se supportato)
  // - POST per aprire il varco
  // - POST per mostrare messaggio sul display
}
```

`lib/access/adapter-factory.ts`:

```ts
export function getAccessAdapter(type: string): AccessControlAdapter {
  switch (type) {
    case 'mock': return new MockAdapter()
    case 'rest': return new RestAdapter()
    default: throw new Error(`Unknown adapter: ${type}`)
  }
}
```

**Importante:** questi adapter vengono usati **solo se il tornello deve essere comandato attivamente dal server**. Per il MVP con QR + tablet, il tablet stesso fa da "tornello": scansiona, chiama API, mostra risultato. Niente serial/Wiegand.

### 7. Hardware integration guide

Crea `docs/integrazione-tornello.md`:

```markdown
# Integrazione Tornello — Guida tecnica

## Modalità supportate (MVP)

### Modalità A: QR + Tablet (raccomandata MVP)
- Tablet montato all'ingresso esegue `/access?token=...`
- Membro mostra QR dalla PWA
- Tablet scansiona, chiama `/api/access/verify`
- Decisione granted/denied → eventuale comando manuale al varco

### Modalità B: Tornello con API REST
- Il tornello/control board ha un endpoint HTTP
- Configura il tornello per chiamare `POST /api/access/verify` quando legge un badge
- Quotal risponde granted/denied entro 200ms
- Tornello apre/chiude varco in base alla risposta

### Modalità C: Tornello con protocollo proprietario (Wiegand/OSDP)
- Richiede un bridge fisico (es. Raspberry Pi) che traduce il protocollo in HTTP
- Il bridge esegue un client Quotal locale
- Implementazione custom — contatta supporto per setup specifico del tuo hardware
```

### 8. Dashboard ingressi: sezione "live"

`/dashboard/ingressi` (estensione del prompt 04):

Aggiungi sezione "Live" in alto:
- Mostra ultimi 10 ingressi in tempo reale via Supabase Realtime
- Per ogni nuovo ingresso: card scivola dall'alto con avatar + nome + esito
- Badge animato per stato (verde granted, rosso denied)
- Auto-rimozione dopo 30 secondi

Implementazione:

```ts
// Client component
const channel = supabase
  .channel('access_logs_live')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'access_logs',
    filter: `gym_id=eq.${gymId}`,
  }, (payload) => {
    // Aggiungi alla lista live
  })
  .subscribe()
```

### 9. Statistiche accessi

Sotto la sezione live, dashboard analytics:

- Bar chart: ingressi per ora del giorno (oggi)
- Heatmap settimana: giorno (Lun-Dom) × ora (6-24), colore intensità
- Top 10 membri più frequenti del mese
- Membri "fantasma": iscritti con < 2 ingressi negli ultimi 30 giorni (per outreach retention)

### 10. Membri "ghost": alert proattivo

Server query `getGhostMembers(gymId, days = 30)`:
- Member con subscription attiva
- Nessun access_log negli ultimi N giorni
- Ritorna lista per dashboard

Card in home dashboard "Membri inattivi":
- "5 membri non vengono da più di 30 giorni"
- Click → lista filtrata in `/dashboard/membri?filter=ghost`
- Bottone "Manda messaggio motivazionale" (template precompilato)

### 11. Migration aggiuntiva: badge_uid generation

Quando si crea un membro, se `badge_uid` non viene fornito esplicitamente, generalo automaticamente:

```sql
-- Trigger che imposta badge_uid auto se nullo all'insert
create or replace function public.set_default_badge_uid()
returns trigger
language plpgsql
as $$
begin
  if new.badge_uid is null and new.role = 'member' then
    -- Genera UID univoco: gym_short + timestamp + random
    new.badge_uid := 'qt_' || substring(new.gym_id::text, 1, 8) || '_' || 
                     to_char(now(), 'YYYYMMDDHH24MISS') || '_' ||
                     substring(md5(random()::text), 1, 6);
  end if;
  return new;
end;
$$;

create trigger profiles_default_badge_uid
  before insert on public.profiles
  for each row execute function public.set_default_badge_uid();
```

## Cosa NON fare

- Non implementare integrazione hardware specifico (richiederà prompt aggiuntivo dedicato quando avrai il modello del tornello)
- Non implementare sistema di geofencing / check-in via GPS (post-MVP, complesso e non richiesto)
- Non implementare biometria (impronta/face) — richiede hardware specifico

## Come testare

1. Crea device "Tablet ingresso" da `/dashboard/impostazioni/dispositivi`, copia token
2. Apri `/access?token=...` su un secondo tab/dispositivo
3. Da PWA membro su mobile, mostra QR code
4. Scansiona QR dal tablet → schermata verde "Bentornato!"
5. Verifica `access_logs` in DB: nuova riga con `granted=true`
6. Sospendi il membro dalla dashboard → riprova scan → schermata rossa "Abbonamento sospeso"
7. Riattiva → schermata verde
8. Backdate `subscription.end_date` di 5 giorni fa (oltre grace period 3) → schermata rossa "Abbonamento scaduto"
9. Backdate solo 2 giorni fa (entro grace) → schermata verde con avviso
10. Test live dashboard: scan multipli appaiono in real-time nella sezione Live
11. Mock adapter test (per future hardware integrations): chiama `mockAdapter.simulateBadge('qt_xxx')` da console
