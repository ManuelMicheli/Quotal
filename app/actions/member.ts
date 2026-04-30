'use server'

/**
 * Server actions for the member PWA.
 *
 * Pattern matches `app/actions/owner.ts`:
 *   1. `requireMember()` — never trust the client.
 *   2. Re-validate input with Zod even if the client already did.
 *   3. Mutation hits Supabase via the SSR client so RLS scopes the row.
 *   4. `revalidatePath('/app', 'layout')` so the home re-renders.
 *   5. Return a structured `ActionResult` (matches owner actions for
 *      shared client form patterns).
 */
import { revalidatePath } from 'next/cache'

import { requireMember } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import {
  pushSubscribeSchema,
  updateMemberProfileSchema,
  type PushSubscribeInput,
  type UpdateMemberProfileInput,
} from '@/lib/validations/member'

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }

function zodToFieldErrors(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
) {
  const fieldErrors: Record<string, string> = {}
  for (const issue of issues) {
    const key = issue.path
      .map((p) => (typeof p === 'symbol' ? (p.description ?? '') : String(p)))
      .join('.')
    if (!fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return fieldErrors
}

// ---------------------------------------------------------------------------
// Profile self-update
// ---------------------------------------------------------------------------

/**
 * Update the signed-in member's own profile.
 *
 * Note: `email` is intentionally NOT editable here. Changing the email
 * requires the Supabase auth flow (verification email + recovery link),
 * which we'll wire up in a later phase. `role` and `gym_id` are protected
 * by RLS — the policy explicitly forbids the member from changing them.
 */
export async function updateMemberProfileAction(
  input: UpdateMemberProfileInput,
): Promise<ActionResult> {
  const profile = await requireMember()
  const parsed = updateMemberProfileSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Controlla i dati inseriti.',
      fieldErrors: zodToFieldErrors(parsed.error.issues),
    }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone ?? null,
      birth_date: parsed.data.birth_date ?? null,
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
      province: parsed.data.province ?? null,
      postal_code: parsed.data.postal_code ?? null,
      fiscal_code: parsed.data.fiscal_code ?? null,
    })
    .eq('id', profile.id)

  if (error) {
    console.error('[actions/member] updateProfile failed:', error.message)
    return { ok: false, error: 'Salvataggio non riuscito. Riprova.' }
  }

  // Revalidate everything under /app — the new name shows in the topbar
  // and on receipts going forward.
  revalidatePath('/app', 'layout')
  return { ok: true, message: 'Profilo aggiornato.' }
}

// ---------------------------------------------------------------------------
// Push notifications — register a subscription (send pipeline = Phase 09)
// ---------------------------------------------------------------------------

export async function pushSubscribeAction(
  input: PushSubscribeInput,
): Promise<ActionResult> {
  const profile = await requireMember()
  const parsed = pushSubscribeSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Subscription non valida.',
    }
  }

  const supabase = await createClient()
  // Upsert by endpoint — every browser/device has a unique endpoint URL.
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      member_id: profile.id,
      gym_id: profile.gym_id,
      endpoint: parsed.data.endpoint,
      p256dh_key: parsed.data.keys.p256dh,
      auth_key: parsed.data.keys.auth,
      user_agent: parsed.data.user_agent ?? null,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' },
  )

  if (error) {
    console.error('[actions/member] pushSubscribe failed:', error.message)
    return { ok: false, error: 'Registrazione notifiche non riuscita.' }
  }
  return { ok: true, message: 'Notifiche attivate.' }
}

export async function pushUnsubscribeAction(
  endpoint: string,
): Promise<ActionResult> {
  const profile = await requireMember()
  const supabase = await createClient()
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('member_id', profile.id)

  if (error) {
    return { ok: false, error: 'Disattivazione notifiche non riuscita.' }
  }
  return { ok: true }
}
