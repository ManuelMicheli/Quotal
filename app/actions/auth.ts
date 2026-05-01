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
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { dashboardPathForRole } from '@/lib/auth'
import {
  enabledOAuthProviders,
  type OAuthProvider,
} from '@/lib/auth/providers'
import { ROLES } from '@/lib/constants'
import { env } from '@/lib/env'
import { checkRateLimit } from '@/lib/security/rate-limit'
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
 * Generic message returned when the rate-limit middleware fires. We keep it
 * vague on purpose: any leaked detail (e.g. window length) helps an attacker
 * pace their burst.
 */
const RATE_LIMITED_MESSAGE =
  'Troppi tentativi ravvicinati. Aspetta qualche istante prima di riprovare.'

/**
 * Convert a free-text gym name into a URL-safe slug. ASCII-only, lowercase,
 * dash-separated, capped at 50 chars. Empty input collapses to 'palestra'.
 */
function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize('NFKD')
    // Strip Unicode combining marks (accents) left behind by NFKD.
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
  return base || 'palestra'
}

/**
 * Resolve an unused slug derived from `base` by appending an incrementing
 * suffix until a collision-free value is found. Uses the admin client because
 * we run pre-auth and the gyms table is RLS-locked to authenticated users.
 */
async function ensureUniqueGymSlug(
  admin: ReturnType<typeof createAdminClient>,
  base: string,
): Promise<string> {
  let candidate = base
  let suffix = 1
  // Loop bound is defensive; collision chains beyond 100 are virtually
  // impossible with normal gym names.
  for (let i = 0; i < 100; i++) {
    const { data } = await admin
      .from('gyms')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()
    if (!data) return candidate
    suffix += 1
    candidate = `${base}-${suffix}`
  }
  // Fallback: random tail. Keeps the action resilient even in absurd edge
  // cases instead of failing the whole onboarding.
  return `${base}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Sign in with email + password. On success, redirect to the role-specific
 * landing page. We deliberately collapse all auth errors to a single generic
 * message so we don't leak whether the email or password is the problem.
 */
export async function loginAction(formData: FormData): Promise<ActionResult> {
  const rl = await checkRateLimit('auth')
  if (!rl.success) return { ok: false, error: RATE_LIMITED_MESSAGE }

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
  const rl = await checkRateLimit('auth')
  if (!rl.success) return { ok: false, error: RATE_LIMITED_MESSAGE }

  // Honeypot: a hidden `website` field that a real human never fills in but
  // bots scraping every field tend to set. We pretend success rather than
  // 4xx so the bot gets no feedback to retry against.
  const honeypot = formData.get('website')
  if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
    return {
      ok: true,
      message:
        'Ti abbiamo inviato un’email di conferma. Clicca sul link per attivare il tuo account.',
    }
  }

  const parsed = signupSchema.safeParse({
    full_name: formData.get('full_name'),
    email: formData.get('email'),
    phone: formData.get('phone') || undefined,
    password: formData.get('password'),
    password_confirm: formData.get('password_confirm'),
    gym_slug: formData.get('gym_slug'),
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

  // Multi-tenant: resolve the target gym by the slug embedded in the public
  // signup link. Read via the admin client because signup runs as `anon` and
  // RLS on `gyms` only grants SELECT to `authenticated`. Slug is public.
  const admin = createAdminClient()
  const { data: gym, error: gymError } = await admin
    .from('gyms')
    .select('id')
    .eq('slug', parsed.data.gym_slug)
    .maybeSingle()

  if (gymError || !gym) {
    return {
      ok: false,
      error:
        'Palestra non trovata. Verifica il link di iscrizione con il titolare.',
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
 * Kick off an OAuth sign-in via Supabase. We rebuild the redirect URL on
 * the server so the `next` query param (and the optional gym slug used by
 * the multi-tenant signup flow) is preserved through the provider round-trip.
 */
export async function signInWithProviderAction(
  provider: OAuthProvider,
  next?: string,
  gymSlug?: string,
): Promise<ActionResult> {
  if (!enabledOAuthProviders[provider]) {
    return {
      ok: false,
      error: 'Questo provider non è ancora disponibile.',
    }
  }

  const rl = await checkRateLimit('auth')
  if (!rl.success) return { ok: false, error: RATE_LIMITED_MESSAGE }

  const supabase = await createClient()
  const headersList = await headers()
  const origin =
    headersList.get('origin') ||
    env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'

  const redirectTo = new URL('/auth/callback', origin)
  if (next) redirectTo.searchParams.set('next', next)
  if (gymSlug) redirectTo.searchParams.set('gym', gymSlug)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectTo.toString(),
      queryParams:
        provider === 'google'
          ? { access_type: 'offline', prompt: 'select_account' }
          : undefined,
    },
  })

  if (error || !data?.url) {
    return {
      ok: false,
      error: 'Accesso non riuscito. Riprova fra qualche istante.',
    }
  }

  redirect(data.url)
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
  const rl = await checkRateLimit('passwordReset')
  if (!rl.success) return { ok: false, error: RATE_LIMITED_MESSAGE }

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
 * Public owner onboarding. Provisions a brand-new gym row and the owner
 * profile/user that goes with it, then signs the owner in. Used as the
 * self-service path for any new gym joining the platform.
 *
 * The flow is rate-limited but otherwise unauthenticated, so guard against
 * abuse via:
 *   - rate limiter on the `auth` bucket
 *   - email + slug uniqueness checks
 *   - admin client only used for the strictly necessary writes
 */
export async function ownerOnboardingAction(
  formData: FormData,
): Promise<ActionResult> {
  const rl = await checkRateLimit('auth')
  if (!rl.success) return { ok: false, error: RATE_LIMITED_MESSAGE }

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

  // 1. Reject duplicate VAT numbers up front so two owners can't claim the
  // same legal entity. We treat VAT as an effective unique key in the app
  // even though the schema doesn't enforce it (legacy single-tenant DDL).
  const { data: existingByVat } = await admin
    .from('gyms')
    .select('id')
    .eq('vat_number', parsed.data.gym_vat_number)
    .maybeSingle()
  if (existingByVat) {
    return {
      ok: false,
      error:
        'Esiste già una palestra registrata con questa P.IVA. Contatta il supporto se è un errore.',
    }
  }

  // 2. Provision a brand-new gym row with a slug derived from the gym name.
  const slug = await ensureUniqueGymSlug(
    admin,
    slugify(parsed.data.gym_name),
  )

  const { data: gym, error: gymInsertError } = await admin
    .from('gyms')
    .insert({
      name: parsed.data.gym_name,
      slug,
      vat_number: parsed.data.gym_vat_number,
      address: parsed.data.gym_address,
      city: parsed.data.gym_city,
      province: parsed.data.gym_province,
      postal_code: parsed.data.gym_postal_code,
      phone: parsed.data.gym_phone,
      email: parsed.data.email,
    })
    .select('id')
    .single()

  if (gymInsertError || !gym) {
    return {
      ok: false,
      error: 'Creazione palestra non riuscita. Riprova fra qualche istante.',
    }
  }

  // 3. Create the owner user — `handle_new_user` will write the matching
  // profile row using the gym_id we pass in metadata.
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
    // Roll the gym back so a failed user creation doesn't leave an orphan
    // tenant row that future onboardings will clash with on slug/VAT.
    await admin.from('gyms').delete().eq('id', gym.id)
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
