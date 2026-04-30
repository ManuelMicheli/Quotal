'use server'

/**
 * Server actions for the owner-side access-control UI.
 *
 * Operations:
 *   - createAccessDeviceAction — provision a new device, return the
 *     cleartext token ONCE (the page is responsible for showing it).
 *   - rotateAccessDeviceTokenAction — generate a fresh secret, return new
 *     cleartext, replace the hash.
 *   - toggleAccessDeviceActiveAction — flip is_active without deleting.
 *   - deleteAccessDeviceAction — hard delete (devices are cheap to recreate).
 *
 * Every action verifies the caller is owner/staff and writes through the
 * SSR client so RLS enforces gym scope. The token hash never leaves the
 * server — even on error paths we only return error strings.
 */
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { generateDeviceToken } from '@/lib/access/device-auth'
import { requireOwnerOrStaff } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string }

const deviceTypeSchema = z.enum(['turnstile', 'tablet', 'rfid_reader', 'other'])

const createSchema = z.object({
  name: z.string().trim().min(2, 'Inserisci un nome (almeno 2 caratteri)'),
  device_type: deviceTypeSchema,
})
export type CreateDeviceInput = z.infer<typeof createSchema>

export async function createAccessDeviceAction(
  input: CreateDeviceInput,
): Promise<
  ActionResult<{
    id: string
    name: string
    device_type: string
    /** Cleartext bearer token. Show ONCE in the dialog, never persist client-side. */
    token: string
  }>
> {
  const owner = await requireOwnerOrStaff()
  const parsed = createSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Dati non validi',
    }
  }
  const supabase = await createClient()

  // Insert with a placeholder hash so the row gets a stable id, then update
  // with the real hash. Two-step keeps the token format `qd_<id>_<secret>`
  // anchored to the actual database id.
  const placeholder = 'pending-' + crypto.randomUUID()
  const { data: row, error: insertErr } = await supabase
    .from('access_devices')
    .insert({
      gym_id: owner.gym_id,
      name: parsed.data.name,
      device_type: parsed.data.device_type,
      token_hash: placeholder,
      is_active: true,
      created_by: owner.id,
    })
    .select('id, name, device_type')
    .single()

  if (insertErr || !row) {
    return {
      ok: false,
      error: `Creazione fallita: ${insertErr?.message ?? 'errore sconosciuto'}`,
    }
  }

  const { token, hash } = generateDeviceToken(row.id)
  const { error: updErr } = await supabase
    .from('access_devices')
    .update({ token_hash: hash })
    .eq('id', row.id)

  if (updErr) {
    // Best-effort cleanup: don't leave a phantom device with a placeholder hash.
    await supabase.from('access_devices').delete().eq('id', row.id)
    return {
      ok: false,
      error: `Salvataggio token fallito: ${updErr.message}`,
    }
  }

  revalidatePath('/dashboard/impostazioni/dispositivi')
  return {
    ok: true,
    data: {
      id: row.id,
      name: row.name,
      device_type: row.device_type,
      token,
    },
    message: 'Dispositivo creato. Salva il token: non sarà più mostrato.',
  }
}

export async function rotateAccessDeviceTokenAction(
  deviceId: string,
): Promise<ActionResult<{ token: string }>> {
  await requireOwnerOrStaff()
  if (!deviceId || typeof deviceId !== 'string') {
    return { ok: false, error: 'ID dispositivo mancante' }
  }
  const supabase = await createClient()
  // Confirm the device exists and is in our gym (RLS enforces this).
  const { data: existing, error: fetchErr } = await supabase
    .from('access_devices')
    .select('id')
    .eq('id', deviceId)
    .maybeSingle()
  if (fetchErr || !existing) {
    return { ok: false, error: 'Dispositivo non trovato' }
  }
  const { token, hash } = generateDeviceToken(deviceId)
  const { error } = await supabase
    .from('access_devices')
    .update({ token_hash: hash })
    .eq('id', deviceId)
  if (error) {
    return { ok: false, error: `Rigenerazione fallita: ${error.message}` }
  }
  revalidatePath('/dashboard/impostazioni/dispositivi')
  return { ok: true, data: { token }, message: 'Nuovo token generato.' }
}

export async function toggleAccessDeviceActiveAction(
  deviceId: string,
): Promise<ActionResult> {
  await requireOwnerOrStaff()
  const supabase = await createClient()
  const { data: existing, error: fetchErr } = await supabase
    .from('access_devices')
    .select('is_active')
    .eq('id', deviceId)
    .maybeSingle()
  if (fetchErr || !existing) {
    return { ok: false, error: 'Dispositivo non trovato' }
  }
  const { error } = await supabase
    .from('access_devices')
    .update({ is_active: !existing.is_active })
    .eq('id', deviceId)
  if (error) {
    return { ok: false, error: `Aggiornamento fallito: ${error.message}` }
  }
  revalidatePath('/dashboard/impostazioni/dispositivi')
  return { ok: true }
}

export async function deleteAccessDeviceAction(
  deviceId: string,
): Promise<ActionResult> {
  await requireOwnerOrStaff()
  const supabase = await createClient()
  const { error } = await supabase
    .from('access_devices')
    .delete()
    .eq('id', deviceId)
  if (error) {
    return { ok: false, error: `Eliminazione fallita: ${error.message}` }
  }
  revalidatePath('/dashboard/impostazioni/dispositivi')
  return { ok: true, message: 'Dispositivo eliminato.' }
}
