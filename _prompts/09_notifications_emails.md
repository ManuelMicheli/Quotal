# Prompt 09 — Notifiche, Email, Push & Cron Jobs

## Contesto

App membro e accessi pronti (prompt 07-08). Ora costruisci tutto il sistema di comunicazione asincrona: email transazionali via Resend, template React Email, cron job per scadenze automatiche, push notifications, retry logic per SEPA falliti, notifiche in-app per il titolare.

**Decisione architetturale:** un solo sistema centralizzato di notifiche (`lib/notifications/`) con dispatcher unico. Ogni evento di business chiama `dispatchNotification(type, recipient, data)` e il dispatcher decide canali (email/push/in-app) e idempotency. Niente chiamate Resend sparse per il codebase.

## Task

### 1. Setup Resend

```bash
npm install resend react-email @react-email/components
```

Aggiorna `.env.local`:
```
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Quotal <noreply@quotal.it>
RESEND_REPLY_TO=support@quotal.it
```

**Configurazione dominio (manuale, da fare ora):**
- Vai su Resend dashboard → aggiungi dominio `quotal.it` (o il tuo dominio finale)
- Aggiungi DNS records (SPF, DKIM, DMARC) — documenta in `docs/email-setup.md`
- Verifica dominio prima di andare in produzione

Per testing locale, Resend permette di inviare a indirizzi verificati anche senza dominio custom.

Crea `lib/email/client.ts`:

```ts
import { Resend } from 'resend'
import { env } from '@/lib/env'

export const resend = new Resend(env.RESEND_API_KEY)

export const EMAIL_FROM = env.RESEND_FROM_EMAIL
export const EMAIL_REPLY_TO = env.RESEND_REPLY_TO
```

### 2. React Email templates

Crea `emails/` alla root del progetto (separata da `app/`, è la convenzione React Email).

Setup script `package.json`:
```json
"scripts": {
  "email:dev": "email dev -p emails",
  "email:export": "email export -p emails"
}
```

#### Template base condiviso

`emails/_components/email-layout.tsx`:

```tsx
import { Html, Head, Preview, Body, Container, Img, Hr, Text, Link, Section } from '@react-email/components'

type Props = {
  preview: string
  gym: { name: string, logo_url: string | null, brand_color: string, address: string, email: string }
  children: React.ReactNode
}

export function EmailLayout({ preview, gym, children }: Props) {
  return (
    <Html lang="it">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: '#FAFAF9', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <Container style={{ maxWidth: 560, margin: '40px auto', padding: 32, backgroundColor: '#FFFFFF', borderRadius: 12 }}>
          {/* Header con logo gym */}
          <Section style={{ marginBottom: 32, paddingBottom: 16, borderBottom: '1px solid #E7E5E4' }}>
            {gym.logo_url ? <Img src={gym.logo_url} alt={gym.name} height={48} /> : <Text style={{ fontSize: 24, fontWeight: 700, color: gym.brand_color }}>{gym.name}</Text>}
          </Section>
          
          {/* Content */}
          {children}
          
          {/* Footer */}
          <Hr style={{ marginTop: 48, marginBottom: 16, borderColor: '#E7E5E4' }} />
          <Text style={{ fontSize: 12, color: '#78716C', textAlign: 'center' }}>
            {gym.name} · {gym.address} · {gym.email}
          </Text>
          <Text style={{ fontSize: 11, color: '#A8A29E', textAlign: 'center', marginTop: 8 }}>
            Powered by <Link href="https://quotal.it" style={{ color: '#A8A29E' }}>Quotal</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
```

#### Template specifici (creane uno per ogni tipo)

In `emails/`:

**`welcome.tsx`** — `type: 'welcome'`
- Saluta il nuovo membro
- Riassume piano + scadenza
- CTA "Accedi alla tua app" → `/app`

**`expiry-7d.tsx`** — `type: 'expiry_7d'`
- "Il tuo abbonamento scade tra 7 giorni"
- Mostra data scadenza
- CTA "Rinnova ora" → `/app/abbonamento/rinnova`

**`expiry-3d.tsx`** — `type: 'expiry_3d'` (più urgente, copy diverso)

**`expiry-today.tsx`** — `type: 'expiry_today'` (oggi è l'ultimo giorno)

**`post-expiry-3d.tsx`** — `type: 'post_expiry_3d'` (3 giorni dopo scadenza, periodo grazia finito)

**`sepa-failed.tsx`** — `type: 'sepa_failed'`
- "L'addebito SEPA non è andato a buon fine"
- Motivo (insufficienti fondi, conto chiuso, etc.)
- CTA "Aggiorna metodo di pagamento"

**`sepa-succeeded.tsx`** — `type: 'sepa_succeeded'` (conferma rinnovo automatico)

**`receipt.tsx`** — `type: 'receipt'` (allegato PDF)
- "Ricevuta n° {receipt_number}"
- Riepilogo pagamento
- PDF allegato
- "Conserva questa email per i tuoi record"

**`subscription-renewed.tsx`** — `type: 'subscription_renewed'`

**`subscription-suspended.tsx`** — `type: 'subscription_suspended'` (notifica al membro quando il titolare sospende)

**`subscription-resumed.tsx`** — `type: 'subscription_resumed'`

**`monthly-owner-report.tsx`** — `type: 'monthly_owner_report'`
- Solo per owner
- Riepilogo mese: incassi, nuovi membri, scadenze, etc.
- Allegato PDF report

Tutti i template usano `<EmailLayout>` come wrapper e ricevono props tipizzate.

### 3. Notification dispatcher

Crea `lib/notifications/dispatcher.ts`:

```ts
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from '@/lib/email/client'
import { render } from '@react-email/components'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { sendPushNotification } from './push'
import * as templates from '@/emails'

export type NotificationType = 
  | 'welcome' | 'expiry_7d' | 'expiry_3d' | 'expiry_today' | 'post_expiry_3d'
  | 'sepa_failed' | 'sepa_succeeded' | 'receipt'
  | 'subscription_renewed' | 'subscription_suspended' | 'subscription_resumed'
  | 'monthly_owner_report'

type DispatchInput = {
  type: NotificationType
  member_id: string
  subscription_id?: string
  payment_id?: string
  data?: Record<string, any>
  channels?: ('email' | 'push' | 'in_app')[]   // default: ['email']
  attachments?: { filename: string, content: Buffer }[]
}

export async function dispatchNotification(input: DispatchInput) {
  const supabase = createServiceRoleClient()
  
  // 1. Idempotency check (per type + subscription_id)
  if (input.subscription_id) {
    const { data: existing } = await supabase
      .from('notifications_sent')
      .select('id')
      .eq('subscription_id', input.subscription_id)
      .eq('type', input.type)
      .maybeSingle()
    
    if (existing) {
      console.log(`Notification ${input.type} for sub ${input.subscription_id} already sent, skipping`)
      return { skipped: true, reason: 'already_sent' }
    }
  }
  
  // 2. Recupera dati: member, gym, subscription, payment
  const { data: member } = await supabase
    .from('profiles')
    .select('*, gym:gyms(*)')
    .eq('id', input.member_id)
    .single()
  
  if (!member) throw new Error('Member not found')
  
  // 3. Per ogni canale, invia
  const channels = input.channels ?? ['email']
  const results: Record<string, any> = {}
  
  if (channels.includes('email')) {
    const result = await sendEmail(input.type, member, input.data, input.attachments)
    results.email = result
  }
  
  if (channels.includes('push')) {
    const result = await sendPushNotification(input.member_id, input.type, input.data)
    results.push = result
  }
  
  // 4. Logga in notifications_sent
  await supabase.from('notifications_sent').insert({
    gym_id: member.gym_id,
    member_id: input.member_id,
    subscription_id: input.subscription_id,
    type: input.type,
    channel: channels.join(','),
    resend_message_id: results.email?.id,
    metadata: { ...input.data, results },
  })
  
  return { sent: true, results }
}

async function sendEmail(type: NotificationType, member: any, data: any, attachments: any[] = []) {
  const Template = templates[type] // e.g. templates.welcome
  if (!Template) throw new Error(`No template for ${type}`)
  
  const html = await render(<Template member={member} gym={member.gym} {...data} />)
  
  const { data: result, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: member.email,
    reply_to: EMAIL_REPLY_TO,
    subject: getSubject(type, member, data),
    html,
    attachments: attachments.map(a => ({ filename: a.filename, content: a.content })),
  })
  
  if (error) throw error
  return result
}

function getSubject(type: NotificationType, member: any, data: any): string {
  const subjects: Record<NotificationType, string> = {
    welcome: `Benvenuto in ${member.gym.name}!`,
    expiry_7d: `Il tuo abbonamento scade tra 7 giorni`,
    expiry_3d: `⚠️ Il tuo abbonamento scade tra 3 giorni`,
    expiry_today: `Ultimo giorno per rinnovare il tuo abbonamento`,
    post_expiry_3d: `Il tuo abbonamento è scaduto — rinnova subito`,
    sepa_failed: `L'addebito SEPA non è andato a buon fine`,
    sepa_succeeded: `Pagamento ricevuto — abbonamento rinnovato`,
    receipt: `Ricevuta ${data?.receipt_number}`,
    subscription_renewed: `Abbonamento rinnovato fino al ${data?.end_date}`,
    subscription_suspended: `Il tuo abbonamento è stato sospeso`,
    subscription_resumed: `Il tuo abbonamento è stato riattivato`,
    monthly_owner_report: `Report mensile ${member.gym.name}`,
  }
  return subjects[type]
}
```

### 4. Push notifications send

Crea `lib/notifications/push.ts`:

```bash
npm install web-push
npm install -D @types/web-push
```

```ts
import webpush from 'web-push'
import { env } from '@/lib/env'
import { createServiceRoleClient } from '@/lib/supabase/admin'

webpush.setVapidDetails(
  `mailto:${env.RESEND_REPLY_TO}`,
  env.VAPID_PUBLIC_KEY,
  env.VAPID_PRIVATE_KEY
)

export async function sendPushNotification(memberId: string, type: string, data: any) {
  const supabase = createServiceRoleClient()
  
  // Recupera tutte le subscription push del membro
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('member_id', memberId)
  
  if (!subs || subs.length === 0) return { sent: 0 }
  
  const payload = JSON.stringify({
    title: getTitle(type, data),
    body: getBody(type, data),
    icon: '/icons/icon-192.png',
    badge: '/icons/badge.png',
    data: { url: getDeepLink(type, data) },
  })
  
  const results = await Promise.allSettled(
    subs.map(sub => webpush.sendNotification({
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
    }, payload))
  )
  
  // Cleanup subscription scadute
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'rejected') {
      const err = (results[i] as any).reason
      if (err.statusCode === 404 || err.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', subs[i].id)
      }
    }
  }
  
  return { sent: results.filter(r => r.status === 'fulfilled').length }
}
```

Genera le VAPID keys con:
```bash
npx web-push generate-vapid-keys
```

Aggiungi `VAPID_PUBLIC_KEY` (anche pubblico, esposto al client come `NEXT_PUBLIC_VAPID_PUBLIC_KEY`) e `VAPID_PRIVATE_KEY` a `.env.local`.

### 5. UI: attivazione push lato membro

Estendi `/app/profilo` (dal prompt 07) aggiungendo:

**Sezione "Notifiche":**
- Toggle "Ricevi notifiche push" (chiede permesso al primo activate)
- Lista canali (per ora solo "Push del browser")

Client component `enable-push-button.tsx`:
```tsx
async function enablePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return alert('Notifiche non supportate su questo browser')
  }
  
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return
  
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
  })
  
  // Invia subscription al server
  await fetch('/api/member/push-subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription),
  })
}
```

### 6. Cron jobs Supabase

Supabase supporta cron via `pg_cron` extension. Abilita nel dashboard SQL editor:

```sql
create extension if not exists pg_cron with schema extensions;
```

Crea Edge Function Supabase per ogni job. Crea cartella `supabase/functions/`:

#### `supabase/functions/notify-expiring-subscriptions/index.ts`

Esegue ogni giorno alle 8:00 (orario Europe/Rome). Trova tutte le subscription in scadenza e invia email/push appropriate.

```ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  const today = new Date().toISOString().split('T')[0]
  
  // Trova subscription in scadenza tra 7 giorni
  const sevenDaysFromNow = new Date()
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
  const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0]
  
  const { data: expiring7 } = await supabase
    .from('subscriptions')
    .select('*, member:profiles(*), plan:subscription_plans(*)')
    .eq('status', 'active')
    .eq('end_date', sevenDaysStr)
  
  for (const sub of expiring7 ?? []) {
    // Chiama API Next.js per dispatch (oppure duplica logica qui)
    await fetch(`${Deno.env.get('APP_URL')}/api/cron/dispatch-notification`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${Deno.env.get('CRON_SECRET')}` },
      body: JSON.stringify({
        type: 'expiry_7d',
        member_id: sub.member_id,
        subscription_id: sub.id,
        data: { plan: sub.plan, end_date: sub.end_date },
      }),
    })
  }
  
  // Stessa logica per 3 giorni e 0 giorni
  // ...
  
  // Post-scadenza: 3 giorni dopo
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
  const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0]
  
  const { data: postExpired } = await supabase
    .from('subscriptions')
    .select('*, member:profiles(*), plan:subscription_plans(*)')
    .eq('end_date', threeDaysAgoStr)
    .in('status', ['active', 'expired'])
  
  for (const sub of postExpired ?? []) {
    await fetch(/* ... */ { type: 'post_expiry_3d', ... })
  }
  
  return new Response(JSON.stringify({ ok: true }))
})
```

#### `supabase/functions/update-expired-subscriptions/index.ts`

Esegue ogni giorno alle 00:30. Aggiorna status `active` → `expired` per subscription oltre `end_date + grace_period`.

```ts
// Esegue la SQL: select public.update_expired_subscriptions()
// (la funzione era già creata nel prompt 02)
await supabase.rpc('update_expired_subscriptions')
```

#### `supabase/functions/retry-failed-sepa/index.ts`

Esegue ogni giorno alle 9:00. Tenta retry su payments SEPA falliti negli ultimi 7 giorni (max 3 tentativi).

```ts
// Trova payments status='failed', payment_method='sepa', failed < 7gg fa, retry_count < 3
// Per ognuno: stripe.paymentIntents.create({...}) con stesso payment_method
// Se successo → update payment status
// Se fallisce di nuovo → incrementa retry_count, dispatch notifica 'sepa_failed' (con idempotency)
```

(Aggiungi colonna `retry_count` a `payments` con migration.)

#### `supabase/functions/monthly-report-owner/index.ts`

Esegue il 1° di ogni mese alle 8:00. Genera PDF report del mese precedente per ogni gym, invia per email al titolare.

```ts
// Per ogni gym:
// 1. Calcola KPI mese precedente (incassi, nuovi membri, scadenze, etc.)
// 2. Genera PDF con @react-pdf/renderer (template lib/pdf/monthly-report-template.tsx)
// 3. Invia email type='monthly_owner_report' al titolare con allegato
```

#### Schedule

Nel SQL editor Supabase:

```sql
select cron.schedule(
  'notify-expiring-subscriptions',
  '0 8 * * *',
  $$
  select net.http_post(
    url := 'https://<project>.supabase.co/functions/v1/notify-expiring-subscriptions',
    headers := '{"Authorization": "Bearer <service_role_key>"}'::jsonb
  ) as request_id;
  $$
);

select cron.schedule(
  'update-expired-subscriptions',
  '30 0 * * *',
  $$
  select public.update_expired_subscriptions();
  $$
);

-- Stessa cosa per gli altri cron
```

Documenta tutto in `docs/cron-jobs.md`.

### 7. Endpoint Next.js per dispatch

`app/api/cron/dispatch-notification/route.ts`:

```ts
import { dispatchNotification } from '@/lib/notifications/dispatcher'
import { env } from '@/lib/env'

export async function POST(req: Request) {
  // Auth con CRON_SECRET
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  const input = await req.json()
  const result = await dispatchNotification(input)
  return Response.json(result)
}
```

Aggiungi `CRON_SECRET` a env.

### 8. Hook into business events

Modifica le server actions create nei prompt precedenti per chiamare `dispatchNotification`:

**Prompt 04 — `createMemberAction`:**
```ts
// dopo creazione, se member ha subscription:
await dispatchNotification({
  type: 'welcome',
  member_id: newMember.id,
  data: { plan, subscription },
  channels: ['email'],
})
```

**Prompt 04 — `suspendSubscriptionAction`:**
```ts
await dispatchNotification({
  type: 'subscription_suspended',
  member_id: subscription.member_id,
  subscription_id: subscription.id,
  data: { reason },
})
```

**Prompt 04 — `resumeSubscriptionAction`:**
```ts
await dispatchNotification({ type: 'subscription_resumed', ... })
```

**Prompt 05 — webhook `payment_intent.succeeded` handler:**
```ts
// dopo creazione payment + ricevuta:
await dispatchNotification({
  type: 'receipt',
  member_id,
  payment_id,
  data: { receipt_number, amount, end_date },
  attachments: [{ filename: `ricevuta-${receipt_number}.pdf`, content: pdfBuffer }],
})

// Se è un rinnovo SEPA automatico:
await dispatchNotification({ type: 'sepa_succeeded', ... })

// Se è il primo pagamento di un nuovo membro:
await dispatchNotification({ type: 'welcome', ... })
```

**Prompt 05 — webhook `payment_intent.payment_failed`:**
```ts
await dispatchNotification({ type: 'sepa_failed', ... })
```

**Prompt 06 — `registerCashPaymentAction`:**
```ts
// dopo PDF generato:
await dispatchNotification({
  type: 'receipt',
  member_id,
  payment_id,
  attachments: [{ filename: ..., content: pdfBuffer }],
})
```

### 9. In-app notifications per il titolare

Estendi la dashboard per mostrare notifiche bell-icon (placeholder dal prompt 04, ora popola).

Migration:
```sql
create table public.owner_notifications (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  link text,                          -- deep link in dashboard
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index owner_notifications_unread_idx on public.owner_notifications(recipient_id, read_at) where read_at is null;
```

Tipi notifiche owner:
- `member_subscription_expiring` (riassunto giornaliero scadenze)
- `payment_failed` (SEPA fallito)
- `new_member_signup` (nuovo membro registrato dalla PWA)
- `monthly_report_ready`

Cron giornaliero genera questo digest. UI nel dashboard: bell-icon con counter, dropdown lista, click → naviga al link.

### 10. Email templates per il titolare

Aggiungi:
- `daily-digest-owner.tsx` — riepilogo giornaliero (scadenze, problemi)
- `payment-failed-owner.tsx` — alert SEPA failed
- `new-member-owner.tsx` — nuovo signup

Toggle in `/dashboard/impostazioni/notifiche`: il titolare può scegliere quali email ricevere.

### 11. Monitoring email deliverability

In `/dashboard/impostazioni/email-log` (visibile solo a owner):
- Lista ultime 100 email inviate
- Stato (delivered/bounced/complained — da webhook Resend)
- Filtro per tipo, destinatario

Webhook Resend `app/api/webhooks/resend/route.ts`:
```ts
// Ricevi eventi email.delivered, email.bounced, email.complained
// Update notifications_sent.metadata.delivery_status
```

### 12. Email preview in dev

Setup React Email preview server:
```bash
npm run email:dev
```

Apri `http://localhost:3000` (separato dal Next dev server, porta diversa). Vedi tutti i template renderizzati con dati di test.

Crea `emails/preview-data.ts` con dati mock per ogni template, così la preview funziona out-of-the-box.

## Cosa NON fare

- Non implementare WhatsApp/SMS (post-MVP, costoso e richiede provider Twilio/AWS SNS)
- Non implementare email broadcast del titolare a tutti i membri (post-MVP)
- Non implementare rate limiting custom email — Resend ha limiti suoi (100/day free, scalabili)

## Come testare

1. `npm run email:dev` → vedi tutti i template renderizzati con dati mock
2. Sandbox: invia welcome a tuo indirizzo via `dispatchNotification` da console
3. Crea nuovo membro da dashboard → ricevi email welcome
4. Backdate subscription a -1 giorno per il 7d → trigger cron manualmente → ricevi email expiry_7d
5. Verifica idempotency: chiama dispatch 2 volte con stesso subscription_id+type → seconda volta skip
6. Test push: dalla PWA membro attiva notifiche → invia push da dispatch → notifica appare
7. Webhook Resend: usa Resend dashboard per simulare bounce → verifica che notifications_sent.metadata sia aggiornato
8. Cron Supabase: vai a Database → Cron Jobs → vedi schedule attivi, manual trigger funziona
9. Genera report mensile: trigger manuale → email con PDF arriva al titolare
