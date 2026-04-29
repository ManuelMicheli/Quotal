# Prompt 06 — Pagamenti Contanti & Ricevute PDF

## Contesto

Stripe pronto (prompt 05). Ora il flusso parallelo: pagamenti in contanti registrati dal titolare in dashboard, generazione ricevute PDF (per cash + Stripe), numerazione progressiva, cassa giornaliera, esportazione per commercialista.

**Decisione operativa critica:** la ricevuta è un documento fiscale. Va generata **server-side**, salvata in Supabase Storage, e il `receipt_number` deve essere progressivo, univoco per gym e per anno. Mai rigenerare con numero diverso.

## Task

### 1. Installazione PDF stack

```bash
npm install @react-pdf/renderer
```

`@react-pdf/renderer` permette di scrivere PDF in React/JSX puro, server-side. È più semplice di puppeteer (no browser headless) ed è production-ready.

### 2. Template ricevuta

Crea `lib/pdf/receipt-template.tsx`:

```tsx
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer'
import type { Payment, Profile, Gym, SubscriptionPlan } from '@/lib/domain-types'

// Registra font (servono URL pubbliche o file locali)
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://...inter-regular.ttf' },
    { src: 'https://...inter-semibold.ttf', fontWeight: 600 },
    { src: 'https://...inter-bold.ttf', fontWeight: 700 },
  ],
})

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: 'Inter', fontSize: 10, color: '#0A0A0A', backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32, paddingBottom: 16, borderBottom: '1px solid #E7E5E4' },
  // ... etc
})

type ReceiptProps = {
  payment: Payment
  member: Profile
  gym: Gym
  plan: SubscriptionPlan
  subscriptionPeriod: { start: Date, end: Date }
}

export function ReceiptDocument({ payment, member, gym, plan, subscriptionPeriod }: ReceiptProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header: logo gym + dati gym a sinistra, "RICEVUTA" + numero a destra */}
        {/* Sezione "Cliente": dati member */}
        {/* Sezione "Dettaglio": tabella con piano, periodo, importo */}
        {/* Totale grande in basso */}
        {/* Footer: metodo pagamento, nota legale, "Powered by Quotal" piccolo */}
      </Page>
    </Document>
  )
}
```

**Layout ricevuta professionale:**

- **Header (top):**
  - Sinistra: Logo gym (se presente) + nome gym + indirizzo + P.IVA + email/telefono
  - Destra: titolo "RICEVUTA N° {receipt_number}" + data emissione

- **Sezione cliente:**
  - "Intestato a:"
  - Nome, indirizzo, codice fiscale (se presente)

- **Tabella dettaglio:**
  - Colonne: Descrizione | Periodo | Quantità | Importo
  - Riga: "Abbonamento {plan.name}" | "{start_date} → {end_date}" | 1 | {price}

- **Totali:**
  - Subtotale
  - Eventuali tasse/IVA (in regime forfettario = 0%, mostra "Operazione esente IVA art. 1 c. 58 L. 190/2014")
  - **Totale grande** in font display

- **Footer:**
  - Metodo pagamento (Contanti / Carta / SEPA / Bonifico)
  - Data pagamento
  - Nota: "Documento valido come ricevuta non fiscale. Conservare per eventuale rimborso."
  - Piccolo "Powered by Quotal" in fondo, font 8pt grigio

**Variante FATTURA (quando il membro ha richiesto fattura):**
- Stesso layout ma intestato "FATTURA N° {invoice_number}"
- Codice fiscale obbligatorio nei dati cliente
- Marca da bollo €2 se importo > 77.47€ ed esente IVA (mostra "Marca da bollo assolta in modo virtuale" — impostazione configurabile in gym.settings)

### 3. Generazione PDF server-side

Crea `lib/pdf/generate-receipt.ts`:

```ts
import { renderToBuffer } from '@react-pdf/renderer'
import { ReceiptDocument } from './receipt-template'
import { createServiceRoleClient } from '@/lib/supabase/admin'

export async function generateAndStoreReceipt(paymentId: string): Promise<string> {
  const supabase = createServiceRoleClient()
  
  // 1. Recupera payment + member + gym + plan + subscription
  const { data: payment } = await supabase
    .from('payments')
    .select('*, member:profiles!member_id(*), subscription:subscriptions(*, plan:subscription_plans(*))')
    .eq('id', paymentId)
    .single()
  
  if (!payment) throw new Error('Payment not found')
  
  // 2. Recupera gym
  const { data: gym } = await supabase
    .from('gyms')
    .select('*')
    .eq('id', payment.gym_id)
    .single()
  
  // 3. Renderizza PDF
  const buffer = await renderToBuffer(
    <ReceiptDocument 
      payment={payment} 
      member={payment.member}
      gym={gym}
      plan={payment.subscription.plan}
      subscriptionPeriod={{
        start: new Date(payment.subscription.start_date),
        end: new Date(payment.subscription.end_date),
      }}
    />
  )
  
  // 4. Upload a Supabase Storage
  const path = `${payment.gym_id}/receipts/${payment.receipt_number}.pdf`
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    })
  
  if (uploadError) throw uploadError
  
  // 5. Ottieni signed URL (durata lunga, es. 1 anno)
  const { data: signedUrl } = await supabase.storage
    .from('documents')
    .createSignedUrl(path, 60 * 60 * 24 * 365)
  
  // 6. Update payment.receipt_pdf_url
  await supabase.from('payments')
    .update({ receipt_pdf_url: signedUrl?.signedUrl })
    .eq('id', paymentId)
  
  return signedUrl!.signedUrl
}
```

**Storage bucket setup** (manuale in Supabase Studio o via SQL):

```sql
insert into storage.buckets (id, name, public) values ('documents', 'documents', false);

-- Policy: solo owner/staff possono leggere documenti del proprio gym
create policy "Owners read own gym documents"
on storage.objects for select
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = (select gym_id::text from public.profiles where id = auth.uid())
);

-- Membro può leggere solo le proprie ricevute (path: {gym_id}/receipts/{receipt_number}.pdf)
-- Implementiamo via signed URLs lato server, niente accesso diretto bucket per i membri
```

### 4. Server Action per pagamento contanti

Server Action `registerCashPaymentAction(input)` in `app/actions/payments.ts`:

```ts
'use server'

import { z } from 'zod'
import { requireOwnerOrStaff } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { generateAndStoreReceipt } from '@/lib/pdf/generate-receipt'

const inputSchema = z.object({
  member_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  start_date: z.string(),               // ISO date
  amount_cents: z.number().int().min(0),
  payment_method: z.enum(['cash', 'bank_transfer']),
  notes: z.string().optional(),
  emit_invoice: z.boolean().default(false),
  invoice_fiscal_code: z.string().optional(),  // required se emit_invoice
})

export async function registerCashPaymentAction(input: z.infer<typeof inputSchema>) {
  const owner = await requireOwnerOrStaff()
  const data = inputSchema.parse(input)
  const supabase = createServiceRoleClient()
  
  // 1. Recupera plan
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', data.plan_id)
    .single()
  
  if (!plan) throw new Error('Plan not found')
  
  // 2. Calcola end_date
  const startDate = new Date(data.start_date)
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + plan.duration_days)
  
  // 3. Verifica/crea subscription via RPC atomic
  const { data: result, error } = await supabase.rpc('register_cash_payment', {
    p_gym_id: owner.gym_id,
    p_member_id: data.member_id,
    p_plan_id: data.plan_id,
    p_start_date: data.start_date,
    p_end_date: endDate.toISOString().split('T')[0],
    p_amount_cents: data.amount_cents,
    p_payment_method: data.payment_method,
    p_created_by: owner.id,
    p_notes: data.notes ?? null,
    p_emit_invoice: data.emit_invoice,
    p_invoice_fiscal_code: data.invoice_fiscal_code ?? null,
  })
  
  if (error) throw error
  
  const { payment_id, subscription_id } = result
  
  // 4. Genera ricevuta PDF (in background — non blocchiamo la response)
  generateAndStoreReceipt(payment_id).catch(err => {
    console.error('Failed to generate receipt:', err)
    // Log to Sentry, ma non fallire la transazione
  })
  
  // 5. Se emit_invoice, genera anche fattura (stesso template, variante)
  if (data.emit_invoice) {
    generateAndStoreInvoice(payment_id).catch(err => console.error(err))
  }
  
  return { success: true, payment_id, subscription_id }
}
```

#### RPC `register_cash_payment`

```sql
create or replace function public.register_cash_payment(
  p_gym_id uuid,
  p_member_id uuid,
  p_plan_id uuid,
  p_start_date date,
  p_end_date date,
  p_amount_cents integer,
  p_payment_method text,
  p_created_by uuid,
  p_notes text,
  p_emit_invoice boolean,
  p_invoice_fiscal_code text
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_existing_sub record;
  v_subscription_id uuid;
  v_payment_id uuid;
  v_receipt_number text;
  v_invoice_number text;
begin
  -- Trova subscription attiva esistente
  select * into v_existing_sub
  from public.subscriptions
  where member_id = p_member_id 
    and status in ('active', 'expired')
  order by end_date desc
  limit 1;
  
  if v_existing_sub is not null and v_existing_sub.status = 'active' then
    -- Estensione: somma duration al end_date esistente
    update public.subscriptions
    set end_date = end_date + (p_end_date - p_start_date),
        original_end_date = original_end_date + (p_end_date - p_start_date),
        updated_at = now()
    where id = v_existing_sub.id
    returning id into v_subscription_id;
  else
    -- Nuova subscription
    insert into public.subscriptions (
      gym_id, member_id, plan_id, start_date, end_date, original_end_date,
      status, payment_method, auto_renew
    ) values (
      p_gym_id, p_member_id, p_plan_id, p_start_date, p_end_date, p_end_date,
      'active', p_payment_method, false
    ) returning id into v_subscription_id;
  end if;
  
  -- Genera receipt_number
  v_receipt_number := public.generate_receipt_number(p_gym_id);
  
  -- Genera invoice_number se richiesto
  if p_emit_invoice then
    v_invoice_number := public.generate_invoice_number(p_gym_id);
    
    -- Aggiorna profile.fiscal_code se non già presente
    update public.profiles 
    set fiscal_code = p_invoice_fiscal_code
    where id = p_member_id and fiscal_code is null;
  end if;
  
  -- Insert payment
  insert into public.payments (
    gym_id, member_id, subscription_id, amount_cents, payment_method,
    status, receipt_number, invoice_number, notes, paid_at, created_by
  ) values (
    p_gym_id, p_member_id, v_subscription_id, p_amount_cents, p_payment_method,
    'succeeded', v_receipt_number, v_invoice_number, p_notes, now(), p_created_by
  ) returning id into v_payment_id;
  
  return jsonb_build_object(
    'payment_id', v_payment_id,
    'subscription_id', v_subscription_id,
    'receipt_number', v_receipt_number,
    'invoice_number', v_invoice_number
  );
end;
$$;

-- Funzione invoice_number simile a receipt_number
create or replace function public.generate_invoice_number(p_gym_id uuid)
returns text
language plpgsql
as $$
declare
  v_year text := to_char(now(), 'YYYY');
  v_count integer;
begin
  select count(*) + 1 into v_count
  from public.payments
  where gym_id = p_gym_id
    and invoice_number like v_year || '/%';
  
  return v_year || '/' || lpad(v_count::text, 4, '0');
end;
$$;
```

### 5. Generazione fattura (variante)

`lib/pdf/generate-invoice.ts` — simile a `generateAndStoreReceipt` ma:
- Template variante con header "FATTURA"
- Path storage: `{gym_id}/invoices/{invoice_number_safe}.pdf` (invoice_number ha `/`, sostituire con `_`)
- Aggiorna `payments.invoice_pdf_url`

### 6. UI: Dialog "Registra pagamento contanti"

Nel `/dashboard/membri/[id]`, bottone "Registra pagamento contanti" → dialog con:

- Select piano (default: ultimo piano del membro o piano default)
- Data inizio (default: oggi, o data fine subscription corrente se attiva)
- Importo (auto-compilato da plan.price_cents, editabile per casi particolari)
- Metodo: Contanti / Bonifico (radio)
- Sezione "Fattura?" (collassata, click per espandere):
  - Toggle "Emetti fattura"
  - Se attivo: campo Codice Fiscale (validato), warning se >77.47€ "Sarà inclusa marca da bollo virtuale €2"
- Note (textarea opzionale)
- Bottone "Conferma e stampa ricevuta"

Su submit:
1. Chiama `registerCashPaymentAction`
2. Mostra toast successo con link "Scarica ricevuta"
3. Apre automaticamente la ricevuta in nuovo tab (window.open)
4. Refresh della pagina membro

### 7. UI: Quick action dashboard "Registra pagamento contanti"

Nella home dashboard, bottone "+ Registra pagamento contanti" apre dialog **con search membro**:

- Input search "Cerca membro per nome/email/telefono" → autocomplete (server search)
- Click membro → form pagamento (stesso del punto 6)

Use case: il titolare registra rapidamente quando il membro paga in palestra senza dover prima navigare al profilo.

### 8. Cassa giornaliera

`/dashboard/cassa` — pagina dedicata.

**KPI top:**
- Card "Incassato oggi" (suddiviso: Contanti, Carta, SEPA, Bonifico)
- Card "Incassato mese"
- Card "Numero transazioni oggi"

**Lista transazioni del giorno:**
- Tabella ordinata per ora
- Colonne: Ora | Membro | Importo | Metodo | Ricevuta # | Azioni (scarica PDF)

**Bottone "Chiudi cassa"** (a fine giornata):
- Genera PDF report cassa giornaliero (stesso stack `@react-pdf/renderer`)
- Report contiene:
  - Header data
  - Riepilogo: totale per metodo
  - Lista transazioni
  - Spazio per firma del titolare
- Salva il PDF in `{gym_id}/daily-reports/{YYYY-MM-DD}.pdf`
- Marker DB: tabella `daily_close_reports` con data e PDF URL (no logica reverse, solo storico)

### 9. Esportazione per commercialista

`/dashboard/pagamenti` — bottone "Esporta per commercialista":

Server Action `exportForAccountantAction(monthYear)`:
1. Recupera tutti i payments del mese
2. Genera Excel riepilogativo con colonne: Data | Numero | Cliente | CF | Importo | IVA | Metodo
3. Crea ZIP con:
   - `riepilogo_{YYYY-MM}.xlsx`
   - Cartella `ricevute/` con tutti i PDF
   - Cartella `fatture/` con tutti i PDF (se presenti)
4. Ritorna download del ZIP

Per Excel usa `exceljs` (`npm install exceljs`).

### 10. Numerazione progressiva: gestione anno

A inizio anno la numerazione si resetta automaticamente (la funzione SQL filtra per `like 'YYYY-%'`). Aggiungi documentazione in `docs/numerazione-fiscale.md`:

```markdown
# Numerazione fiscale Quotal

- **Ricevute:** formato `YYYY-NNNN` (es. `2026-0001`). Si resetta ogni 1° gennaio.
- **Fatture:** formato `YYYY/NNNN` (es. `2026/0001`). Si resetta ogni 1° gennaio.
- **Univocità:** garantita a livello DB con unique index `(gym_id, receipt_number)` e `(gym_id, invoice_number)`.
- **Race conditions:** la funzione `generate_receipt_number()` ha race condition teorica. Per il volume MVP non è un problema; in produzione con volumi alti useremo advisory lock.
- **Modifiche post-emissione:** la legge italiana NON permette di modificare ricevute/fatture dopo emissione. Per correzioni: emettere nota di credito (gestita in v2).
```

### 11. Storno e rimborso contanti

Server Action `refundCashPaymentAction(paymentId, reason)`:
1. Verifica owner
2. Insert nuovo payment con status='refunded', amount_cents negativo, riferimento al payment originale (campo `refund_of_payment_id`)
3. Update subscription: `end_date -= plan.duration_days` (rollback estensione)
4. Genera "Nota di rimborso" PDF (variante template)

Aggiungi migration:

```sql
alter table public.payments add column refund_of_payment_id uuid references public.payments(id);
```

### 12. Report mensile automatico (opzionale, ma user gold)

Cron job mensile (1° del mese) che genera report del mese precedente e lo invia per email al titolare:

- "Report mese di {mese}: hai incassato €X (+Y% vs mese precedente)"
- Allegato PDF con dettagli
- Implementazione effettiva nel prompt 09 (ora solo predisponi la funzione)

## Cosa NON fare

- Non implementare integrazione SDI fatture elettroniche (post-MVP, prompt aggiuntivo dedicato)
- Non gestire IVA al 22% — la palestra è in regime forfettario o associativo (esente)
- Non implementare scontrini elettronici (Telematici) — non necessario per ricevute non fiscali

## Come testare

1. Crea membro
2. Registra pagamento contanti → ricevuta PDF generata in pochi secondi
3. Apri PDF: layout pulito, dati corretti, numero `2026-0001`
4. Registra altri 2 pagamenti → numeri `2026-0002`, `2026-0003`
5. Registra pagamento con "Emetti fattura" + CF valido → ricevuta + fattura entrambe generate, numerazioni separate
6. Vai su `/dashboard/cassa` → vedi 3 transazioni del giorno con totali corretti
7. "Chiudi cassa" → PDF report generato e salvato
8. "Esporta per commercialista" → ZIP scaricato con Excel + PDF
9. Refund: storna un pagamento → status 'refunded', subscription end_date arretrata correttamente
10. Verifica RLS Storage: prova ad accedere a un PDF di un altro gym → 403
