# Prompt 03 — Auth & Roles

## Contesto

Schema DB pronto (prompt 02 completato). Ora implementa autenticazione, ruoli (owner/staff/member), redirect logic, e onboarding del titolare.

**Architettura auth:**
- Supabase Auth con email + password
- Magic link come opzione secondaria (prompt 09)
- Profile auto-creato dal trigger DB al signup (già implementato in prompt 02)
- Middleware refresha sessione su ogni request
- Redirect basato su `role`: owner → `/dashboard`, member → `/app`, staff → `/dashboard` (read-only su alcune sezioni in v2)

## Task

### 1. Pagine auth

#### `app/(auth)/layout.tsx`

Layout pulito centrato verticalmente, sfondo `brand.background`, card centrale max-width 420px con shadow soft, logo Quotal in alto. Nessuna nav.

#### `app/(auth)/login/page.tsx`

Form con email + password. Server Action per login. Gestione errori inline. Link a `/signup` per nuovo membro. Link "Password dimenticata?" che apre dialog reset password.

Query param opzionale `?role=owner|member` solo per UX (cambia leggermente il copy: "Accedi come titolare" vs "Accedi al tuo abbonamento"). Il role reale è nel profile, non nella query.

Server Action `loginAction`:
1. Valida con Zod (email valida, password min 8)
2. Chiama `supabase.auth.signInWithPassword()`
3. In caso di errore generico, mostra "Email o password non corretti" (no leak su quale dei due è sbagliato)
4. In successo, redirect basato su role del profile:
   - owner/staff → `/dashboard`
   - member → `/app`

Dopo il login, `revalidatePath('/', 'layout')`.

#### `app/(auth)/signup/page.tsx`

Signup **solo per membri**. Form con:
- Nome completo (required)
- Email (required, valida)
- Telefono (opzionale)
- Password (min 8, almeno 1 maiuscola, 1 numero — usa Zod)
- Conferma password
- Checkbox "Accetto Termini e Privacy" (required)

**Niente codice fiscale qui** — è opzionale, lo richiediamo solo se il membro vuole emettere fattura (gestito in `/app/profilo` o al primo pagamento).

Server Action `signupAction`:
1. Valida con Zod
2. Recupera il `gym_id` dell'unica palestra esistente (single-tenant MVP)
3. Chiama `supabase.auth.signUp()` con metadata:
   ```ts
   {
     full_name: name,
     phone: phone,
     gym_id: gymId,
     role: 'member'
   }
   ```
4. Il trigger DB crea il profile automaticamente
5. Mostra schermata "Controlla la tua email per confermare l'account" (Supabase invia email di conferma di default)
6. Dopo conferma email, redirect a `/app`

#### `app/(auth)/onboarding-titolare/page.tsx`

Pagina speciale, **una tantum**, accessibile solo se non esiste ancora nessun owner. Setup iniziale del titolare:
- Nome titolare
- Email titolare
- Password
- Nome palestra
- P.IVA palestra
- Indirizzo, città, CAP, provincia
- Telefono palestra

Server Action `ownerOnboardingAction`:
1. Verifica che non esista già un owner (`select count(*) from profiles where role = 'owner'`)
2. Se esiste: redirect a `/login`
3. Aggiorna la riga `gyms` esistente con i dati reali (sostituisce i seed data)
4. Crea utente owner con `supabase.auth.admin.createUser()` (richiede service role) con `email_confirm: true` (no email confirm per setup)
5. Il trigger DB crea il profile con role='owner'
6. Redirect a `/dashboard`

**Importante:** questa pagina deve essere **disabilitata in produzione dopo il primo setup**. Aggiungi check via env var `ENABLE_OWNER_ONBOARDING=true` che il titolare imposterà a `false` dopo il primo accesso, oppure check sul DB (più sicuro).

#### `app/(auth)/reset-password/page.tsx` e `app/(auth)/update-password/page.tsx`

- Reset: form con email, chiama `supabase.auth.resetPasswordForEmail()` con redirectTo `/update-password`
- Update: form con nuova password (servirà solo se l'utente arriva via link email)

### 2. Middleware

Aggiorna `middleware.ts` root:

```ts
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2)$).*)',
  ],
}
```

Aggiorna `lib/supabase/middleware.ts` con la logica completa:

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => 
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  
  const { data: { user } } = await supabase.auth.getUser()
  
  const { pathname } = request.nextUrl
  
  // Route pubbliche (no auth richiesta)
  const publicPaths = ['/', '/login', '/signup', '/reset-password', '/onboarding-titolare']
  const isPublic = publicPaths.some(p => pathname === p || pathname.startsWith(p + '/'))
  
  // API webhooks pubbliche
  const isWebhook = pathname.startsWith('/api/webhooks/')
  const isHealthcheck = pathname === '/api/health'
  
  if (!user && !isPublic && !isWebhook && !isHealthcheck) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }
  
  // Se loggato e su pagine auth, redirect a dashboard appropriata
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const url = request.nextUrl.clone()
    url.pathname = profile?.role === 'member' ? '/app' : '/dashboard'
    return NextResponse.redirect(url)
  }
  
  // Route guard per ruoli
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (pathname.startsWith('/dashboard') && profile?.role === 'member') {
      const url = request.nextUrl.clone()
      url.pathname = '/app'
      return NextResponse.redirect(url)
    }
    
    if (pathname.startsWith('/app') && profile?.role !== 'member') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }
  
  return response
}
```

### 3. Server-side auth helpers

Crea `lib/auth.ts`:

```ts
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/domain-types'

/**
 * Server-only. Recupera l'utente corrente o redirect a /login.
 */
export async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

/**
 * Server-only. Recupera profile + user, o redirect a /login.
 */
export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  if (error || !profile) redirect('/login')
  return profile
}

/**
 * Server-only. Richiede ruolo owner o staff, altrimenti redirect.
 */
export async function requireOwnerOrStaff(): Promise<Profile> {
  const profile = await requireProfile()
  if (profile.role !== 'owner' && profile.role !== 'staff') {
    redirect('/app')
  }
  return profile
}

/**
 * Server-only. Richiede ruolo member.
 */
export async function requireMember(): Promise<Profile> {
  const profile = await requireProfile()
  if (profile.role !== 'member') redirect('/dashboard')
  return profile
}
```

### 4. Logout

Server Action in `app/actions/auth.ts`:

```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
```

### 5. UI Components condivisi

`components/shared/auth-form.tsx` — wrapper card con titolo e descrizione, riusato in login/signup/reset.

`components/shared/logo.tsx` — il logo testuale "Quotal" in Instrument Serif. Props: `size` ('sm' | 'md' | 'lg'), `variant` ('default' | 'mono').

`components/shared/logout-button.tsx` — Client component con bottone che chiama `logoutAction`.

### 6. Placeholder dashboard e app

`app/(owner)/dashboard/page.tsx` — server component che chiama `requireOwnerOrStaff()`, mostra solo "Benvenuto, {profile.full_name}" e bottone logout. Verrà espanso nel prompt 04.

`app/(member)/app/page.tsx` — server component che chiama `requireMember()`, mostra solo "Benvenuto, {profile.full_name}" e bottone logout. Verrà espanso nel prompt 07.

### 7. Email templates Supabase Auth

Configura nel dashboard Supabase (sezione Authentication → Email Templates) i template italiani per:

- **Confirm signup**: "Conferma il tuo account Quotal"
- **Reset password**: "Reimposta la tua password Quotal"
- **Magic link**: (per il prompt 09)

Documenta in `docs/supabase-email-templates.md` i template da copiare/incollare nel dashboard (Supabase non supporta migrazione di questi template via CLI).

Esempio per "Confirm signup":

```html
<h2>Benvenuto in Quotal!</h2>
<p>Ciao {{ .Email }},</p>
<p>Grazie per esserti iscritto. Conferma il tuo indirizzo email cliccando sul pulsante qui sotto:</p>
<p><a href="{{ .ConfirmationURL }}">Conferma email</a></p>
<p>Se non hai richiesto questa registrazione, ignora pure questa email.</p>
<p>— Il team Quotal</p>
```

### 8. Validazioni Zod

Crea `lib/validations/auth.ts` con schemi riutilizzabili:

```ts
import { z } from 'zod'

export const passwordSchema = z.string()
  .min(8, 'Minimo 8 caratteri')
  .regex(/[A-Z]/, 'Almeno una lettera maiuscola')
  .regex(/[0-9]/, 'Almeno un numero')

export const loginSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(1, 'Password richiesta'),
})

export const signupSchema = z.object({
  full_name: z.string().min(2, 'Nome troppo corto'),
  email: z.string().email('Email non valida'),
  phone: z.string().optional(),
  password: passwordSchema,
  password_confirm: z.string(),
  terms: z.literal(true, { errorMap: () => ({ message: 'Devi accettare i termini' }) }),
}).refine(d => d.password === d.password_confirm, {
  message: 'Le password non coincidono',
  path: ['password_confirm'],
})

export const ownerOnboardingSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  password: passwordSchema,
  gym_name: z.string().min(2),
  gym_vat_number: z.string().regex(/^\d{11}$/, 'P.IVA: 11 cifre'),
  gym_address: z.string().min(2),
  gym_city: z.string().min(2),
  gym_province: z.string().length(2),
  gym_postal_code: z.string().regex(/^\d{5}$/),
  gym_phone: z.string().min(6),
})
```

## Cosa NON fare

- Non implementare 2FA (post-MVP)
- Non implementare social login (Google/Apple) — post-MVP
- Non implementare invio email custom (i template default Supabase bastano per ora; Resend arriva nel prompt 09)

## Come testare

1. Avvia dev server, vai su `/onboarding-titolare`, crea il primo titolare → redirect a `/dashboard`
2. Logout → vai su `/signup`, crea un membro → conferma email → login → redirect a `/app`
3. Da membro, prova ad accedere a `/dashboard` → redirect automatico a `/app`
4. Da titolare, prova ad accedere a `/app` → redirect automatico a `/dashboard`
5. Senza login, accedi a `/dashboard` → redirect a `/login?redirectTo=/dashboard`
6. Reset password: inserisci email → ricevi email Supabase → clicchi link → arrivi su `/update-password`
7. Su Supabase Studio, verifica che le righe in `profiles` siano create automaticamente al signup
