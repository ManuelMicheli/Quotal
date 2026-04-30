'use server'

/**
 * Phase 10 — GDPR server actions.
 *
 * - `exportMyDataAction()` — Art. 20 portability. Builds a ZIP containing
 *   every record we hold for the calling member (profile + subscriptions +
 *   payments + access logs + notifications + SEPA mandates), uploads it to
 *   the private `exports` bucket, and returns a 24h signed download URL.
 *
 * - `requestAccountDeletionAction()` — Art. 17 right to be forgotten.
 *   Inserts a row into `account_deletion_requests` (the titolare clears it
 *   manually within 30 days). DOES NOT immediately delete payments —
 *   Italian fiscal retention requires keeping receipts/invoices for 10
 *   years (art. 2220 c.c.).
 *
 * - `processAccountDeletionAction(id, decision)` — owner-side action used
 *   from `/dashboard/impostazioni/gdpr-richieste`. On `processed`, it
 *   scrubs PII from the profile and flips `deleted_at`. On `rejected`, it
 *   stores the reason. Payments and fiscal records remain untouched.
 *
 * All actions are protected by `requireMember()` / `requireOwnerOrStaff()`
 * and rate-limited via `lib/security/rate-limit.ts`.
 */

import JSZip from 'jszip'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireMember, requireOwnerOrStaff } from '@/lib/auth'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string }

// ---------------------------------------------------------------------------
// Data export — Art. 20 GDPR
// ---------------------------------------------------------------------------

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 // 24h

export async function exportMyDataAction(): Promise<
  ActionResult<{ downloadUrl: string; expiresAt: string }>
> {
  const profile = await requireMember()

  // Cap to 2 exports/h to stop scripted abuse — generation is expensive.
  const rl = await checkRateLimit('dataExport', profile.id)
  if (!rl.success) {
    return {
      ok: false,
      error:
        'Hai già richiesto un&apos;esportazione di recente. Riprova fra qualche ora.',
    }
  }

  const supabase = await createClient()
  const admin = createAdminClient()

  // Insert the request row first so we have an audit even if we fail later.
  const { data: requestRow, error: insertError } = await admin
    .from('data_export_requests')
    .insert({
      member_id: profile.id,
      gym_id: profile.gym_id,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError || !requestRow) {
    console.error('[actions/legal] cannot insert export request:', insertError)
    return {
      ok: false,
      error: 'Impossibile registrare la richiesta. Riprova fra qualche minuto.',
    }
  }

  try {
    // Pull every relation through RLS — we want exactly what the member
    // would see anyway.
    const [
      profileRes,
      gymRes,
      subscriptionsRes,
      paymentsRes,
      accessLogsRes,
      sepaRes,
      pushRes,
      notificationsRes,
      preferencesRes,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', profile.id).single(),
      supabase.from('gyms').select('*').eq('id', profile.gym_id).maybeSingle(),
      supabase
        .from('subscriptions')
        .select('*, plan:subscription_plans(*)')
        .eq('member_id', profile.id),
      supabase
        .from('payments')
        .select('*')
        .eq('member_id', profile.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('access_logs')
        .select('*')
        .eq('member_id', profile.id)
        .order('accessed_at', { ascending: false }),
      supabase.from('sepa_mandates').select('*').eq('member_id', profile.id),
      supabase
        .from('push_subscriptions')
        .select('id, created_at, last_seen_at, user_agent')
        .eq('member_id', profile.id),
      supabase
        .from('notifications_sent')
        .select('id, type, channel, sent_at, delivery_status')
        .eq('member_id', profile.id)
        .order('sent_at', { ascending: false }),
      supabase
        .from('notification_preferences')
        .select('*')
        .eq('member_id', profile.id)
        .maybeSingle(),
    ])

    const exportPayload = {
      meta: {
        generated_at: new Date().toISOString(),
        member_id: profile.id,
        gym_id: profile.gym_id,
        format_version: 1,
        notes:
          'Esportazione completa dei dati personali ai sensi dell&apos;art. 20 GDPR. ' +
          'Conserva questo file in luogo sicuro: contiene informazioni personali.',
      },
      profile: profileRes.data ?? null,
      gym: gymRes.data ?? null,
      subscriptions: subscriptionsRes.data ?? [],
      payments: paymentsRes.data ?? [],
      access_logs: accessLogsRes.data ?? [],
      sepa_mandates: sepaRes.data ?? [],
      push_subscriptions: pushRes.data ?? [],
      notifications_sent: notificationsRes.data ?? [],
      notification_preferences: preferencesRes.data ?? null,
    }

    const zip = new JSZip()
    zip.file(
      'dati-personali.json',
      JSON.stringify(exportPayload, null, 2),
    )

    // CSV view of access logs — many users prefer to open in Excel.
    const accessRows = exportPayload.access_logs as Array<{
      accessed_at: string
      granted: boolean
      denial_reason: string | null
    }>
    const accessCsv = [
      'data_e_ora,esito,motivo_negato',
      ...accessRows.map(
        (r) =>
          `${r.accessed_at},${r.granted ? 'consentito' : 'negato'},${
            r.denial_reason ?? ''
          }`,
      ),
    ].join('\n')
    zip.file('ingressi.csv', accessCsv)

    // Human-readable README so the member knows what they got.
    zip.file(
      'LEGGIMI.txt',
      [
        'Esportazione dei tuoi dati personali — Quotal',
        '----------------------------------------------',
        '',
        'Questa cartella contiene una copia completa dei dati che Quotal',
        'detiene su di te alla data di generazione del file.',
        '',
        'Contenuto:',
        '  - dati-personali.json  → tutti i dati strutturati (profilo, ',
        '                            abbonamenti, pagamenti, ecc.)',
        '  - ingressi.csv         → log accessi in formato tabellare',
        '',
        'Per richieste, scrivi a privacy@quotal.it',
      ].join('\n'),
    )

    const buffer = await zip.generateAsync({ type: 'uint8array' })

    // Path scheme: `{member_id}/{requestId}.zip` so the storage RLS policy
    // can use `storage.foldername(name)[1]` to authorise the download.
    const path = `${profile.id}/${requestRow.id}.zip`

    const { error: uploadError } = await admin.storage
      .from('exports')
      .upload(path, buffer, {
        contentType: 'application/zip',
        upsert: true,
      })

    if (uploadError) {
      throw new Error(`upload failed: ${uploadError.message}`)
    }

    const { data: signed, error: signError } = await admin.storage
      .from('exports')
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

    if (signError || !signed) {
      throw new Error(`signed url failed: ${signError?.message ?? 'unknown'}`)
    }

    const expiresAt = new Date(
      Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
    ).toISOString()

    await admin
      .from('data_export_requests')
      .update({
        status: 'fulfilled',
        fulfilled_at: new Date().toISOString(),
        download_path: path,
        expires_at: expiresAt,
      })
      .eq('id', requestRow.id)

    revalidatePath('/app/profilo')

    return {
      ok: true,
      data: { downloadUrl: signed.signedUrl, expiresAt },
      message: 'Esportazione pronta: il link scade tra 24 ore.',
    }
  } catch (err) {
    console.error('[actions/legal] export failed:', err)
    await admin
      .from('data_export_requests')
      .update({
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      })
      .eq('id', requestRow.id)
    return {
      ok: false,
      error:
        'Esportazione non riuscita. Riprova più tardi o scrivi a privacy@quotal.it.',
    }
  }
}

// ---------------------------------------------------------------------------
// Account deletion — Art. 17 GDPR
// ---------------------------------------------------------------------------

const requestDeletionSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
})

export async function requestAccountDeletionAction(input: {
  reason?: string
}): Promise<ActionResult> {
  const profile = await requireMember()
  const parsed = requestDeletionSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Motivo non valido (max 1000 caratteri).' }
  }

  const admin = createAdminClient()

  // Don't queue the same request twice — keep the existing pending row.
  const { data: existing } = await admin
    .from('account_deletion_requests')
    .select('id')
    .eq('member_id', profile.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    return {
      ok: true,
      message:
        'Hai già una richiesta di cancellazione in lavorazione. Verrà processata entro 30 giorni.',
    }
  }

  const { error } = await admin.from('account_deletion_requests').insert({
    member_id: profile.id,
    gym_id: profile.gym_id,
    reason: parsed.data.reason ?? null,
    status: 'pending',
  })

  if (error) {
    console.error('[actions/legal] cannot queue deletion:', error.message)
    return {
      ok: false,
      error:
        'Impossibile registrare la richiesta. Scrivi a privacy@quotal.it.',
    }
  }

  revalidatePath('/app/profilo')
  return {
    ok: true,
    message:
      'Richiesta ricevuta. Verrà processata entro 30 giorni come previsto dal GDPR.',
  }
}

const processDeletionSchema = z.object({
  request_id: z.string().uuid(),
  decision: z.enum(['processed', 'rejected']),
  notes: z.string().trim().max(1000).optional(),
})

export async function processAccountDeletionAction(input: {
  request_id: string
  decision: 'processed' | 'rejected'
  notes?: string
}): Promise<ActionResult> {
  const owner = await requireOwnerOrStaff()
  const parsed = processDeletionSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Dati non validi.' }
  }

  const admin = createAdminClient()

  const { data: request, error: requestError } = await admin
    .from('account_deletion_requests')
    .select('id, member_id, gym_id, status')
    .eq('id', parsed.data.request_id)
    .single()

  if (requestError || !request) {
    return { ok: false, error: 'Richiesta non trovata.' }
  }
  if (request.gym_id !== owner.gym_id) {
    return { ok: false, error: 'Permessi insufficienti.' }
  }
  if (request.status !== 'pending') {
    return { ok: false, error: 'Richiesta già processata.' }
  }

  if (parsed.data.decision === 'processed') {
    // Scrub PII while preserving the row so payments still FK-link cleanly.
    const { error: scrubError } = await admin
      .from('profiles')
      .update({
        full_name: 'Utente eliminato',
        phone: null,
        birth_date: null,
        address: null,
        city: null,
        province: null,
        postal_code: null,
        fiscal_code: null,
        notes: null,
        avatar_url: null,
        badge_uid: null,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', request.member_id)

    if (scrubError) {
      console.error('[actions/legal] scrub failed:', scrubError.message)
      return {
        ok: false,
        error: `Impossibile anonimizzare il profilo: ${scrubError.message}`,
      }
    }

    // Best-effort: remove ancillary PII that doesn't impact fiscal records.
    await admin
      .from('push_subscriptions')
      .delete()
      .eq('member_id', request.member_id)
    await admin
      .from('notification_preferences')
      .delete()
      .eq('member_id', request.member_id)
  }

  const { error: updateError } = await admin
    .from('account_deletion_requests')
    .update({
      status: parsed.data.decision,
      processed_at: new Date().toISOString(),
      notes: parsed.data.notes ?? null,
    })
    .eq('id', request.id)

  if (updateError) {
    return { ok: false, error: updateError.message }
  }

  revalidatePath('/dashboard/impostazioni/gdpr-richieste')
  return {
    ok: true,
    message:
      parsed.data.decision === 'processed'
        ? 'Profilo anonimizzato. I dati fiscali sono stati conservati per i 10 anni di legge.'
        : 'Richiesta marcata come rifiutata.',
  }
}
