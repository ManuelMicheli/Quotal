'use server'

/**
 * Server Actions for authentication flows.
 *
 * All actions return a structured `ActionResult` instead of throwing — that
 * lets the calling client component render inline errors without trying to
 * catch a server-action exception (which would break the redirect on success).
 *
 * Successful login/signup either:
 *   - throw NEXT_REDIRECT (via `redirect()`) — handled transparently by Next
 *   - return `{ ok: true, message }` — the client shows a confirmation screen
 */

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { dashboardPathForRole } from '@/lib/auth'
import { ROLES } from '@/lib/constants'
import { env } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  loginSchema,
  ownerOnboardingSchema,
  resetPasswordSchema,
  signupSchema,
  updatePasswordSchema,
} from '@/lib/validations/auth'

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string }

/**
 * Sign in with email + password. On success, redirect to the role-specific
 * landing page. We deliberately collapse all auth errors to a single generic
 * message so we don't leak whether the email or password is the problem.
 */
export async function loginAction(formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        'Controlla i dati inseriti e riprova.',
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error || !data.user) {
    return { ok: false, error: 'Email o password non corretti.' }
  }

  // Look up the profile to know where to send the user. Falls back to
  // /dashboard if the profile is missing — the layout-level guards will
  // bounce them to /login if something is truly wrong.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle()

  revalidatePath('/', 'layout')
  redirect(dashboardPathForRole(profile?.role ?? ROLES.OWNER))
}

/**
 * Member self-signup. The DB trigger `handle_new_user` reads
 * `raw_user_meta_data` and creates the matching profile row, so we only
 * need to pass the right metadata here.
 *
 * Returns `{ ok: true, message }` on success: Supabase has just emailed the
 * user a confirmation link, and we render a "check your inbox" screen.
 */
export async function signupAction(formData: FormData): Promise<ActionResult> {
  const parsed = signupSchema.safeParse({
    full_name: formData.get('full_name'),
    email: formData.get('email'),
    phone: formData.get('phone') || undefined,
    password: formData.get('password'),
    password_confirm: formData.get('password_confirm'),
    terms: formData.get('terms') === 'on' || formData.get('terms') === 'true',
  })

  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        'Controlla i dati inseriti e riprova.',
    }
  }

  const supabase = await createClient()

  // Single-tenant MVP: all members belong to the one and only gym.
  const { data: gym, error: gymError } = await supabase
    .from('gyms')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (gymError || !gym) {
    return {
      ok: false,
      error:
        'Configurazione palestra non trovata. Contatta il titolare per completare il setup.',
    }
  }

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/app`,
      data: {
        full_name: parsed.data.full_name,
        phone: parsed.data.phone,
        gym_id: gym.id,
        role: ROLES.MEMBER,
      },
    },
  })

  if (error) {
    // Most common error here: user already registered. Use a friendly copy.
    if (error.message.toLowerCase().includes('already')) {
      return {
        ok: false,
        error: 'Esiste già un account con questa email. Prova ad accedere.',
      }
    }
    return {
      ok: false,
      error: 'Registrazione non riuscita. Riprova fra qualche istante.',
    }
  }

  return {
    ok: true,
    message:
      'Ti abbiamo inviato un’email di conferma. Clicca sul link per attivare il tuo account.',
  }
}

/**
 * Sign out and redirect to the login page. Called from the shared
 * `LogoutButton` client component.
 */
export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

/**
 * Send a password-reset email. Supabase will deliver an email with a magic
 * link that lands on `/auth/callback` and then redirects to
 * `/update-password` with a one-shot recovery session.
 *
 * We respond with the same success message regardless of whether the email
 * exists in our user base, to avoid leaking account existence.
 */
export async function resetPasswordAction(
  formData: FormData,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    email: formData.get('email'),
  })

  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        'Inserisci un indirizzo email valido.',
    }
  }

  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/update-password`,
  })

  return {
    ok: true,
    message:
      'Se l’email è registrata, riceverai a breve un link per reimpostare la password.',
  }
}

/**
 * Update password for the user logged in via the recovery session, then
 * redirect to the role-appropriate dashboard.
 */
export async function updatePasswordAction(
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get('password'),
    password_confirm: formData.get('password_confirm'),
  })

  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        'Controlla i dati inseriti e riprova.',
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      ok: false,
      error:
        'Sessione di recupero scaduta. Richiedi un nuovo link via email.',
    }
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })

  if (error) {
    return {
      ok: false,
      error:
        'Non siamo riusciti ad aggiornare la password. Riprova fra qualche istante.',
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  revalidatePath('/', 'layout')
  redirect(dashboardPathForRole(profile?.role ?? ROLES.OWNER))
}

/**
 * One-shot owner onboarding. Creates the very first owner user and updates
 * the gym row with the real data the user provided.
 *
 * Guards:
 *   1. `ENABLE_OWNER_ONBOARDING` env var must be truthy. Once the owner is
 *      live, the user flips this to false in production to lock the route.
 *   2. The flow refuses to proceed if any owner already exists in the DB
 *      (defence-in-depth in case the env var is left enabled by mistake).
 *
 * Uses the service-role client because regular signup goes through email
 * confirmation, and we want the owner to be able to log in immediately.
 */
export async function ownerOnboardingAction(
  formData: FormData,
): Promise<ActionResult> {
  if (process.env.ENABLE_OWNER_ONBOARDING !== 'true') {
    return {
      ok: false,
      error:
        'L’onboarding del titolare è disabilitato. Contatta il supporto se ne hai bisogno.',
    }
  }

  const parsed = ownerOnboardingSchema.safeParse({
    full_name: formData.get('full_name'),
    email: formData.get('email'),
    password: formData.get('password'),
    gym_name: formData.get('gym_name'),
    gym_vat_number: formData.get('gym_vat_number'),
    gym_address: formData.get('gym_address'),
    gym_city: formData.get('gym_city'),
    gym_province: formData.get('gym_province'),
    gym_postal_code: formData.get('gym_postal_code'),
    gym_phone: formData.get('gym_phone'),
  })

  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        'Controlla i dati inseriti e riprova.',
    }
  }

  const admin = createAdminClient()

  // 1. Refuse if an owner already exists (DB-level safety).
  const { count, error: countError } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', ROLES.OWNER)

  if (countError) {
    return {
      ok: false,
      error: 'Errore di connessione al database. Riprova fra qualche istante.',
    }
  }
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error:
        'Un titolare è già stato registrato. Effettua il login dalla pagina di accesso.',
    }
  }

  // 2. Update the existing seeded gym row with the real data.
  const { data: gym, error: gymSelectError } = await admin
    .from('gyms')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (gymSelectError || !gym) {
    return {
      ok: false,
      error:
        'Riga palestra non trovata: assicurati di aver eseguito i seed del database.',
    }
  }

  const { error: gymUpdateError } = await admin
    .from('gyms')
    .update({
      name: parsed.data.gym_name,
      vat_number: parsed.data.gym_vat_number,
      address: parsed.data.gym_address,
      city: parsed.data.gym_city,
      province: parsed.data.gym_province,
      postal_code: parsed.data.gym_postal_code,
      phone: parsed.data.gym_phone,
      email: parsed.data.email,
    })
    .eq('id', gym.id)

  if (gymUpdateError) {
    return {
      ok: false,
      error: 'Aggiornamento dati palestra non riuscito. Riprova.',
    }
  }

  // 3. Create the owner user — `handle_new_user` will write the profile.
  const { error: createUserError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.full_name,
      gym_id: gym.id,
      role: ROLES.OWNER,
    },
  })

  if (createUserError) {
    return {
      ok: false,
      error:
        createUserError.message.toLowerCase().includes('already')
          ? 'Esiste già un utente con questa email.'
          : 'Creazione utente non riuscita. Riprova.',
    }
  }

  // 4. Sign the owner in with their fresh credentials so they land in the
  // dashboard ready to go.
  const supabase = await createClient()
  await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
