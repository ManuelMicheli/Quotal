'use server'

/**
 * Server actions for the owner dashboard.
 *
 * All mutations live here. Each action:
 *   1. Verifies the caller is owner/staff via `requireOwnerOrStaff()`.
 *   2. Re-validates input with Zod, even if the client already did.
 *   3. Performs the mutation against Supabase (RLS enforces gym scope).
 *   4. Calls `revalidatePath()` so server components see the new state.
 *   5. Returns a structured `ActionResult` instead of throwing — the calling
 *      client component can render inline errors without breaking redirects.
 */
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { requireOwnerOrStaff } from '@/lib/auth'
import { ROLES, SUBSCRIPTION_STATUS } from '@/lib/constants'
import type { GymSettings } from '@/lib/domain-types'
import { dispatchNotification } from '@/lib/notifications/dispatcher'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  createMemberSchema,
  gymRulesSchema,
  gymSettingsSchema,
  planSchema,
  renewSubscriptionSchema,
  resumeSubscriptionSchema,
  suspendSubscriptionSchema,
  updateMemberSchema,
  updateWorkoutPlanSchema,
  workoutPlanSchema,
  type CreateMemberInput,
  type GymRulesInput,
  type GymSettingsInput,
  type PlanInput,
  type RenewSubscriptionInput,
  type ResumeSubscriptionInput,
  type SuspendSubscriptionInput,
  type UpdateMemberInput,
  type UpdateWorkoutPlanInput,
  type WorkoutPlanInput,
} from '@/lib/validations/owner'

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }

function zodToFieldErrors(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
) {
  const fieldErrors: Record<string, string> = {}
  for (const issue of issues) {
    const key = issue.path
      .map((p) => (typeof p === 'symbol' ? p.description ?? '' : String(p)))
      .join('.')
    if (!fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return fieldErrors
}

/** ISO date `YYYY-MM-DD`. */
function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function todayIso(): string {
  return toIsoDate(new Date())
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return toIsoDate(d)
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

/**
 * Create a new member (auth user + profile row).
 *
 * Uses the admin client because regular signup goes through email
 * confirmation; for owner-created accounts we want the user usable
 * immediately. Requires `SUPABASE_SERVICE_ROLE_KEY` to be a real key — with
 * the placeholder it will fail at runtime.
 *
 * The DB trigger `handle_new_user` creates the matching profile row from the
 * user_metadata. After creation we update the profile with the extra fields
 * (address, fiscal_code, etc.) the trigger does not write.
 */
export async function createMemberAction(
  input: CreateMemberInput,
): Promise<ActionResult<{ id: string }>> {
  const owner = await requireOwnerOrStaff()
  const parsed = createMemberSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ?? 'Controlla i dati inseriti.',
      fieldErrors: zodToFieldErrors(parsed.error.issues),
    }
  }
  const data = parsed.data

  if (data.create_subscription) {
    if (!data.plan_id) {
      return { ok: false, error: 'Seleziona un piano per il primo abbonamento.' }
    }
    if (!data.payment_method) {
      return {
        ok: false,
        error: 'Seleziona un metodo di pagamento per il primo abbonamento.',
      }
    }
  }

  const admin = createAdminClient()

  // 1. Create the auth user. A random password is generated; the member will
  //    set their own via the password-reset link (Phase 09 wiring).
  const tempPassword =
    crypto.randomUUID().replace(/-/g, '') + 'Aa1!'
  const { data: created, error: createError } = await admin.auth.admin.createUser(
    {
      email: data.email.toLowerCase(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name,
        gym_id: owner.gym_id,
        role: ROLES.MEMBER,
        phone: data.phone,
      },
    },
  )
  if (createError || !created.user) {
    return {
      ok: false,
      error: createError?.message?.toLowerCase().includes('already')
        ? 'Esiste già un account con questa email.'
        : `Creazione utente non riuscita: ${createError?.message ?? 'errore sconosciuto'}.`,
    }
  }
  const memberId = created.user.id

  // 2. Update the profile with the rest of the fields. RLS allows owner to
  //    update profiles in their own gym.
  const supabase = await createClient()
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      address: data.address ?? null,
      city: data.city ?? null,
      province: data.province ?? null,
      postal_code: data.postal_code ?? null,
      birth_date: data.birth_date ?? null,
      fiscal_code: data.fiscal_code ?? null,
      badge_uid: data.badge_uid ?? null,
      notes: data.notes ?? null,
    })
    .eq('id', memberId)

  if (updateError) {
    console.error('[owner] createMember profile update failed:', updateError.message)
    // Don't fail the whole action — the user exists with a minimal profile.
  }

  // 3. Optionally create the first subscription.
  if (data.create_subscription && data.plan_id && data.payment_method) {
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('duration_days')
      .eq('id', data.plan_id)
      .maybeSingle()

    if (plan) {
      const startIso = data.start_date ?? todayIso()
      const endIso = addDaysIso(startIso, plan.duration_days)
      const { error: subError } = await supabase.from('subscriptions').insert({
        gym_id: owner.gym_id,
        member_id: memberId,
        plan_id: data.plan_id,
        start_date: startIso,
        end_date: endIso,
        original_end_date: endIso,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        payment_method: data.payment_method,
      })
      if (subError) {
        console.error('[owner] createMember subscription failed:', subError.message)
      }
      // NOTE: Cash payment recording is implemented in Phase 06.
    }
  }

  // Phase 09: send welcome email (best-effort, never blocks creation).
  try {
    const { data: subInfo } = await supabase
      .from('subscriptions')
      .select('end_date, plan:subscription_plans(name, price_cents)')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const planRow = Array.isArray(subInfo?.plan)
      ? subInfo?.plan[0]
      : subInfo?.plan
    await dispatchNotification({
      type: 'welcome',
      recipient_id: memberId,
      data: {
        plan: planRow ?? null,
        end_date: subInfo?.end_date ?? null,
      },
    })
  } catch (err) {
    console.warn('[owner] welcome notification dispatch failed', err)
  }

  revalidatePath('/dashboard', 'layout')
  return { ok: true, data: { id: memberId }, message: 'Membro creato con successo.' }
}

/**
 * Update an existing member's profile fields (no auth changes).
 */
export async function updateMemberAction(
  memberId: string,
  input: UpdateMemberInput,
): Promise<ActionResult> {
  await requireOwnerOrStaff()
  const parsed = updateMemberSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Controlla i dati inseriti.',
      fieldErrors: zodToFieldErrors(parsed.error.issues),
    }
  }
  const data = parsed.data

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: data.full_name,
      email: data.email.toLowerCase(),
      phone: data.phone ?? null,
      birth_date: data.birth_date ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      province: data.province ?? null,
      postal_code: data.postal_code ?? null,
      fiscal_code: data.fiscal_code ?? null,
      badge_uid: data.badge_uid ?? null,
      notes: data.notes ?? null,
      is_problematic: data.is_problematic ?? false,
      problematic_reason: data.problematic_reason ?? null,
    })
    .eq('id', memberId)

  if (error) {
    return { ok: false, error: `Aggiornamento non riuscito: ${error.message}` }
  }
  revalidatePath('/dashboard/membri')
  revalidatePath(`/dashboard/membri/${memberId}`)
  return { ok: true, message: 'Profilo aggiornato.' }
}

/**
 * Delete a member. Hard-delete the auth user (cascades to profile via
 * `on delete cascade` on the FK). Owner cannot delete themself by RLS.
 */
export async function deleteMemberAction(
  memberId: string,
): Promise<ActionResult> {
  const owner = await requireOwnerOrStaff()
  if (memberId === owner.id) {
    return { ok: false, error: 'Non puoi eliminare il tuo stesso account.' }
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(memberId)
  if (error) {
    return { ok: false, error: `Eliminazione non riuscita: ${error.message}` }
  }
  revalidatePath('/dashboard/membri')
  redirect('/dashboard/membri')
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

/**
 * Create a fresh subscription for a member ("renewal" in product copy).
 *
 * If the existing active subscription would still be running, the new
 * subscription stacks: start_date defaults to current end_date so the member
 * doesn't lose paid days.
 */
export async function renewSubscriptionAction(
  input: RenewSubscriptionInput,
): Promise<ActionResult<{ id: string }>> {
  const owner = await requireOwnerOrStaff()
  const parsed = renewSubscriptionSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Controlla i dati inseriti.',
      fieldErrors: zodToFieldErrors(parsed.error.issues),
    }
  }
  const data = parsed.data

  const supabase = await createClient()
  const { data: plan, error: planError } = await supabase
    .from('subscription_plans')
    .select('duration_days')
    .eq('id', data.plan_id)
    .maybeSingle()

  if (planError || !plan) {
    return { ok: false, error: 'Piano non trovato.' }
  }

  const endIso = addDaysIso(data.start_date, plan.duration_days)
  const { data: created, error } = await supabase
    .from('subscriptions')
    .insert({
      gym_id: owner.gym_id,
      member_id: data.member_id,
      plan_id: data.plan_id,
      start_date: data.start_date,
      end_date: endIso,
      original_end_date: endIso,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      payment_method: data.payment_method,
    })
    .select('id')
    .single()

  if (error || !created) {
    return { ok: false, error: `Rinnovo non riuscito: ${error?.message ?? 'errore'}` }
  }

  revalidatePath('/dashboard', 'layout')
  return { ok: true, data: { id: created.id }, message: 'Abbonamento rinnovato.' }
}

/**
 * Suspend an active subscription. Creates a row in
 * `subscription_suspensions` with `suspended_at = now()`. The end_date is NOT
 * touched yet; it gets `days_added_to_end_date` shifted on resume.
 */
export async function suspendSubscriptionAction(
  input: SuspendSubscriptionInput,
): Promise<ActionResult> {
  const owner = await requireOwnerOrStaff()
  const parsed = suspendSubscriptionSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Controlla i dati inseriti.',
      fieldErrors: zodToFieldErrors(parsed.error.issues),
    }
  }

  const supabase = await createClient()
  const { data: sub, error: fetchError } = await supabase
    .from('subscriptions')
    .select('id, gym_id, member_id, status')
    .eq('id', parsed.data.subscription_id)
    .maybeSingle()

  if (fetchError || !sub) {
    return { ok: false, error: 'Abbonamento non trovato.' }
  }
  if (sub.status !== SUBSCRIPTION_STATUS.ACTIVE) {
    return { ok: false, error: 'Si possono sospendere solo abbonamenti attivi.' }
  }

  const { error: insertError } = await supabase
    .from('subscription_suspensions')
    .insert({
      gym_id: sub.gym_id,
      member_id: sub.member_id,
      subscription_id: sub.id,
      created_by: owner.id,
      reason: parsed.data.reason ?? null,
    })
  if (insertError) {
    return { ok: false, error: `Sospensione non riuscita: ${insertError.message}` }
  }

  const { error: statusError } = await supabase
    .from('subscriptions')
    .update({ status: SUBSCRIPTION_STATUS.SUSPENDED })
    .eq('id', sub.id)
  if (statusError) {
    return { ok: false, error: `Sospensione non riuscita: ${statusError.message}` }
  }

  // Phase 09: notify the member.
  try {
    await dispatchNotification({
      type: 'subscription_suspended',
      recipient_id: sub.member_id,
      subscription_id: sub.id,
      data: { reason: parsed.data.reason ?? null },
    })
  } catch (err) {
    console.warn('[owner] suspended notification dispatch failed', err)
  }

  revalidatePath('/dashboard', 'layout')
  return { ok: true, message: 'Abbonamento sospeso.' }
}

/**
 * Resume a suspended subscription:
 *   - days_suspended = days between suspended_at and today
 *   - end_date += days_suspended
 *   - subscription_suspensions: resumed_at = now, days_added_to_end_date = X
 *   - subscription.suspension_days_used += X
 *   - status = active
 */
export async function resumeSubscriptionAction(
  input: ResumeSubscriptionInput,
): Promise<ActionResult> {
  await requireOwnerOrStaff()
  const parsed = resumeSubscriptionSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'ID abbonamento non valido.' }
  }
  const supabase = await createClient()

  const { data: sub, error: fetchError } = await supabase
    .from('subscriptions')
    .select('id, member_id, status, end_date, suspension_days_used')
    .eq('id', parsed.data.subscription_id)
    .maybeSingle()

  if (fetchError || !sub) {
    return { ok: false, error: 'Abbonamento non trovato.' }
  }
  if (sub.status !== SUBSCRIPTION_STATUS.SUSPENDED) {
    return { ok: false, error: 'Solo gli abbonamenti sospesi possono essere riattivati.' }
  }

  const { data: suspension, error: suspError } = await supabase
    .from('subscription_suspensions')
    .select('id, suspended_at')
    .eq('subscription_id', sub.id)
    .is('resumed_at', null)
    .order('suspended_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (suspError || !suspension) {
    return { ok: false, error: 'Riga di sospensione attiva non trovata.' }
  }

  const suspendedAt = new Date(suspension.suspended_at)
  const now = new Date()
  const daysSuspended = Math.max(
    0,
    Math.round((now.getTime() - suspendedAt.getTime()) / (1000 * 60 * 60 * 24)),
  )
  const newEnd = addDaysIso(sub.end_date, daysSuspended)

  await supabase
    .from('subscription_suspensions')
    .update({
      resumed_at: now.toISOString(),
      days_added_to_end_date: daysSuspended,
    })
    .eq('id', suspension.id)

  const { error: subError } = await supabase
    .from('subscriptions')
    .update({
      status: SUBSCRIPTION_STATUS.ACTIVE,
      end_date: newEnd,
      suspension_days_used: (sub.suspension_days_used ?? 0) + daysSuspended,
    })
    .eq('id', sub.id)

  if (subError) {
    return { ok: false, error: `Riattivazione non riuscita: ${subError.message}` }
  }

  // Phase 09: notify the member. Idempotency is on (subscription_id,
  // type); since `subscription_resumed` is a distinct type from
  // `subscription_suspended`, we can re-use the subscription_id without
  // needing the force flag.
  try {
    await dispatchNotification({
      type: 'subscription_resumed',
      recipient_id: sub.member_id,
      subscription_id: sub.id,
      data: { end_date: newEnd, days_added: daysSuspended },
    })
  } catch (err) {
    console.warn('[owner] resumed notification dispatch failed', err)
  }

  revalidatePath('/dashboard', 'layout')
  return {
    ok: true,
    message: `Abbonamento riattivato. End-date prolungata di ${daysSuspended} giorni.`,
  }
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export async function createPlanAction(
  input: PlanInput,
): Promise<ActionResult<{ id: string }>> {
  const owner = await requireOwnerOrStaff()
  const parsed = planSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Controlla i dati inseriti.',
      fieldErrors: zodToFieldErrors(parsed.error.issues),
    }
  }

  const supabase = await createClient()
  const { data: maxRow } = await supabase
    .from('subscription_plans')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: created, error } = await supabase
    .from('subscription_plans')
    .insert({
      gym_id: owner.gym_id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      duration_days: parsed.data.duration_days,
      price_cents: parsed.data.price_cents,
      is_active: parsed.data.is_active ?? true,
      sort_order: (maxRow?.sort_order ?? 0) + 1,
    })
    .select('id')
    .single()

  if (error || !created) {
    return { ok: false, error: `Creazione piano non riuscita: ${error?.message}` }
  }
  revalidatePath('/dashboard/impostazioni/piani')
  return { ok: true, data: { id: created.id }, message: 'Piano creato.' }
}

export async function updatePlanAction(
  id: string,
  input: PlanInput,
): Promise<ActionResult> {
  await requireOwnerOrStaff()
  const parsed = planSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Controlla i dati inseriti.',
      fieldErrors: zodToFieldErrors(parsed.error.issues),
    }
  }
  const supabase = await createClient()
  const { error } = await supabase
    .from('subscription_plans')
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      duration_days: parsed.data.duration_days,
      price_cents: parsed.data.price_cents,
      is_active: parsed.data.is_active ?? true,
    })
    .eq('id', id)
  if (error) {
    return { ok: false, error: `Aggiornamento non riuscito: ${error.message}` }
  }
  revalidatePath('/dashboard/impostazioni/piani')
  return { ok: true, message: 'Piano aggiornato.' }
}

export async function togglePlanActiveAction(
  id: string,
): Promise<ActionResult> {
  await requireOwnerOrStaff()
  const supabase = await createClient()
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('is_active')
    .eq('id', id)
    .maybeSingle()
  if (!plan) return { ok: false, error: 'Piano non trovato.' }
  const { error } = await supabase
    .from('subscription_plans')
    .update({ is_active: !plan.is_active })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/dashboard/impostazioni/piani')
  return { ok: true }
}

export async function reorderPlansAction(
  orderedIds: string[],
): Promise<ActionResult> {
  await requireOwnerOrStaff()
  const supabase = await createClient()
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i]
    if (!id) continue
    const { error } = await supabase
      .from('subscription_plans')
      .update({ sort_order: i + 1 })
      .eq('id', id)
    if (error) {
      return { ok: false, error: `Riordino non riuscito: ${error.message}` }
    }
  }
  revalidatePath('/dashboard/impostazioni/piani')
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Gym + settings
// ---------------------------------------------------------------------------

export async function updateGymSettingsAction(
  input: GymSettingsInput,
): Promise<ActionResult> {
  const owner = await requireOwnerOrStaff()
  const parsed = gymSettingsSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Controlla i dati inseriti.',
      fieldErrors: zodToFieldErrors(parsed.error.issues),
    }
  }
  const supabase = await createClient()
  const { error } = await supabase
    .from('gyms')
    .update({
      name: parsed.data.name,
      vat_number: parsed.data.vat_number ?? null,
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
      province: parsed.data.province ?? null,
      postal_code: parsed.data.postal_code ?? null,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email,
      brand_color: parsed.data.brand_color ?? null,
    })
    .eq('id', owner.gym_id)

  if (error) {
    return { ok: false, error: `Aggiornamento non riuscito: ${error.message}` }
  }
  revalidatePath('/dashboard/impostazioni/palestra')
  return { ok: true, message: 'Dati palestra aggiornati.' }
}

export async function updateGymRulesAction(
  input: GymRulesInput,
): Promise<ActionResult> {
  const owner = await requireOwnerOrStaff()
  const parsed = gymRulesSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Controlla i dati inseriti.',
      fieldErrors: zodToFieldErrors(parsed.error.issues),
    }
  }
  const supabase = await createClient()
  const { data: gym } = await supabase
    .from('gyms')
    .select('settings')
    .eq('id', owner.gym_id)
    .maybeSingle()

  const existing = (gym?.settings ?? {}) as Partial<GymSettings>
  const merged: GymSettings = {
    gracePeriodDays: parsed.data.gracePeriodDays,
    maxSuspensionDaysPerYear: parsed.data.maxSuspensionDaysPerYear,
    expiryNotificationDays: parsed.data.expiryNotificationDays,
    postExpiryNotificationDays: existing.postExpiryNotificationDays ?? [3],
    currency: existing.currency ?? 'EUR',
    locale: existing.locale ?? 'it-IT',
  }

  const { error } = await supabase
    .from('gyms')
    .update({ settings: merged })
    .eq('id', owner.gym_id)
  if (error) {
    return { ok: false, error: `Aggiornamento non riuscito: ${error.message}` }
  }
  revalidatePath('/dashboard/impostazioni/regole')
  return { ok: true, message: 'Regole aggiornate.' }
}

// ---------------------------------------------------------------------------
// Owner profile (self-service)
// ---------------------------------------------------------------------------

export async function updateOwnerProfileAction(input: {
  full_name: string
  phone?: string | null
}): Promise<ActionResult> {
  const owner = await requireOwnerOrStaff()
  const fullName = input.full_name?.trim() ?? ''
  if (fullName.length < 2) {
    return { ok: false, error: 'Inserisci nome e cognome.' }
  }
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      phone: input.phone?.trim() ? input.phone.trim() : null,
    })
    .eq('id', owner.id)
  if (error) {
    return { ok: false, error: `Aggiornamento non riuscito: ${error.message}` }
  }
  revalidatePath('/dashboard', 'layout')
  return { ok: true, message: 'Profilo aggiornato.' }
}

export async function sendPasswordResetForOwnerAction(): Promise<ActionResult> {
  const owner = await requireOwnerOrStaff()
  const supabase = await createClient()
  const redirectTo =
    process.env.APP_URL?.replace(/\/$/, '') ??
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
    'http://localhost:3000'
  const { error } = await supabase.auth.resetPasswordForEmail(owner.email, {
    redirectTo: `${redirectTo}/reimposta`,
  })
  if (error) {
    return { ok: false, error: `Invio email non riuscito: ${error.message}` }
  }
  return { ok: true, message: 'Email inviata. Controlla la posta.' }
}

// ---------------------------------------------------------------------------
// Workout plans (schede allenamento)
// ---------------------------------------------------------------------------

export async function createWorkoutPlanAction(
  input: WorkoutPlanInput,
): Promise<ActionResult<{ id: string }>> {
  const owner = await requireOwnerOrStaff()
  const parsed = workoutPlanSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Controlla i dati inseriti.',
      fieldErrors: zodToFieldErrors(parsed.error.issues),
    }
  }

  const supabase = await createClient()
  const { data: created, error } = await supabase
    .from('workout_plans')
    .insert({
      gym_id: owner.gym_id,
      member_id: parsed.data.member_id,
      created_by: owner.id,
      title: parsed.data.title,
      split: parsed.data.split ?? null,
      notes: parsed.data.notes ?? null,
      days: parsed.data.days,
      is_active: parsed.data.is_active ?? true,
    })
    .select('id')
    .single()

  if (error || !created) {
    return {
      ok: false,
      error: `Creazione scheda non riuscita: ${error?.message ?? 'errore'}`,
    }
  }

  revalidatePath('/dashboard/schede')
  return { ok: true, data: { id: created.id }, message: 'Scheda creata.' }
}

export async function updateWorkoutPlanAction(
  id: string,
  input: UpdateWorkoutPlanInput,
): Promise<ActionResult> {
  await requireOwnerOrStaff()
  const parsed = updateWorkoutPlanSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Controlla i dati inseriti.',
      fieldErrors: zodToFieldErrors(parsed.error.issues),
    }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('workout_plans')
    .update({
      title: parsed.data.title,
      split: parsed.data.split ?? null,
      notes: parsed.data.notes ?? null,
      days: parsed.data.days,
      is_active: parsed.data.is_active ?? true,
    })
    .eq('id', id)

  if (error) {
    return { ok: false, error: `Aggiornamento non riuscito: ${error.message}` }
  }

  revalidatePath('/dashboard/schede')
  revalidatePath(`/dashboard/schede/${id}`)
  return { ok: true, message: 'Scheda aggiornata.' }
}

export async function deleteWorkoutPlanAction(
  id: string,
): Promise<ActionResult> {
  await requireOwnerOrStaff()
  const supabase = await createClient()
  const { error } = await supabase.from('workout_plans').delete().eq('id', id)
  if (error) {
    return { ok: false, error: `Eliminazione non riuscita: ${error.message}` }
  }

  revalidatePath('/dashboard/schede')
  return { ok: true, message: 'Scheda eliminata.' }
}
