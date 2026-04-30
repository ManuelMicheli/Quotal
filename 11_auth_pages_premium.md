# 11 — Auth Pages Premium (stile Resend, full-dark)

> **Obiettivo**: Sostituire le pagine auth (login, signup, reset password) con design premium full-dark ispirato a Resend. Aggiungere OAuth Google + Apple. Far percepire Quotal come prodotto premium fin dal primo touchpoint, anche ai membri della palestra.
>
> **Branch git**: `feature/11-auth-premium`
>
> **Tempo stimato Claude Code**: 1-2 sessioni
>
> **Prerequisito**: prompt 00-03 completati (in particolare 03 che ha l'auth funzionante base)
>
> **Nota importante**: questo prompt **sovrascrive** le pagine UI create in 03. La logica server-side (server actions, middleware, role-based redirect) resta invariata. Cambiamo SOLO l'UI delle pagine `/login`, `/signup`, `/reset-password`, `/update-password`.

---

## Contesto

Le pagine auth nel prompt 03 sono funzionali ma "basic-shadcn". Vogliamo elevarle al livello di Resend, Linear, Vercel: dark, minimale, premium, con un dettaglio visivo che lascia il segno (gradient morbido animato sullo sfondo, logo in card squared).

Queste pagine sono **l'unica zona dell'app in dark mode forzato** — il resto dell'app (dashboard titolare e PWA membro) rimane nel brand chiaro/warm definito nel prompt 01. La transizione dark→light avviene al login, e questo crea un effetto "porta che si apre verso il prodotto" molto memorabile.

## Decisioni di design

- **Background**: `#0A0A0A` con gradient SVG/CSS animato che simula stoffa silky (mesh gradient)
- **Card centrale**: trasparente sopra il gradient, no border, no shadow — il contenuto galleggia
- **Logo Quotal**: card 56x56px con `border-radius: 14px`, `bg: rgb(20 20 20 / 0.8)`, `backdrop-blur`, lettera "Q" o monogramma in font display, colore bianco con `text-shadow` morbido
- **Accent**: teal `#14B8A6` (più acceso del teal-700 dell'app interna, perché su dark serve più luminanza)
- **Typography**:
  - Heading: Instrument Serif (già in stack) per dare carattere — taglia 32px desktop, 28px mobile
  - Body: Inter
  - Mono: JetBrains Mono per email placeholder e shortcuts
- **Spacing**: generoso, respiro alla Resend (max-w-md per il form, py-32 minimo)
- **Easing curves**: `cubic-bezier(0.16, 1, 0.3, 1)` per tutto (out-expo)

## Task

### 1. Setup OAuth providers in Supabase

#### Google OAuth

Documenta in `/docs/oauth-setup.md`:

1. Vai su [Google Cloud Console](https://console.cloud.google.com)
2. Crea progetto "Quotal" (o usa esistente)
3. Vai a "APIs & Services" → "Credentials"
4. Crea "OAuth 2.0 Client ID" → tipo "Web application"
5. Authorized JavaScript origins: `https://<PROJECT_REF>.supabase.co`, `http://localhost:3000`, `https://quotal.it` (o dominio finale)
6. Authorized redirect URIs: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
7. Copia Client ID e Client Secret
8. Vai su Supabase Dashboard → Authentication → Providers → Google → Enable + paste credentials

#### Apple OAuth

Apple Sign-In richiede Apple Developer Program (€99/anno). Se Manuel non lo ha ancora:

**Opzione A**: rimanda Apple Sign-In a v2, lascia placeholder UI ma disabilita il bottone (con tooltip "Disponibile presto")

**Opzione B** (se ha già Developer Program):
1. [Apple Developer Console](https://developer.apple.com/account)
2. Identifiers → registra App ID con "Sign In with Apple" capability
3. Identifiers → registra Services ID (es. `it.quotal.signin`)
4. Configure Services ID con domain `<PROJECT_REF>.supabase.co` e return URL `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
5. Keys → crea key con "Sign In with Apple" → scarica `.p8`
6. Costruisci client secret JWT (Supabase ha tool, o usa lib `apple-signin-auth`)
7. Supabase Dashboard → Authentication → Providers → Apple → Enable

Aggiungi env vars (per documentazione, non per codice — Supabase gestisce le credentials):
```env
# OAuth setup tracker (no-code, info only)
GOOGLE_OAUTH_CONFIGURED=true
APPLE_OAUTH_CONFIGURED=false  # toggle quando pronto
```

In `lib/auth/providers.ts` esponi config dinamica:
```typescript
export const enabledOAuthProviders = {
  google: true,
  apple: process.env.APPLE_OAUTH_ENABLED === 'true'
} as const

export type OAuthProvider = keyof typeof enabledOAuthProviders
```

I bottoni nelle UI mostrano lo stato: se Apple disabilitato, mostralo con stile dimmed + badge "Presto" + cursor not-allowed.

---

### 2. Layout dedicato `/auth` in dark forzato

Crea `app/(auth)/layout.tsx` (sovrascrivi quello del prompt 03):

```tsx
import { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AuthBackground } from '@/components/auth/auth-background'
import { ThemeForcer } from '@/components/auth/theme-forcer'

export const metadata = {
  title: 'Accedi a Quotal'
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ThemeForcer theme="dark" />
      <div className="relative min-h-svh overflow-hidden bg-[#0A0A0A] text-zinc-50">
        {/* Animated background */}
        <AuthBackground />
        
        {/* Top nav — back to home */}
        <header className="relative z-10 flex h-16 items-center px-6 md:px-10">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-zinc-100"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            <span className="font-medium">Home</span>
          </Link>
        </header>

        {/* Main content */}
        <main className="relative z-10 mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-md flex-col items-center justify-center px-6 pb-16">
          {children}
        </main>
      </div>
    </>
  )
}
```

#### `components/auth/theme-forcer.tsx`

Forza dark theme solo nelle pagine auth, indipendente dalla preferenza utente nel resto dell'app:

```tsx
'use client'
import { useEffect } from 'react'

export function ThemeForcer({ theme }: { theme: 'dark' | 'light' }) {
  useEffect(() => {
    const html = document.documentElement
    const previous = html.getAttribute('data-theme')
    html.setAttribute('data-theme', theme)
    html.classList.toggle('dark', theme === 'dark')
    
    return () => {
      if (previous) {
        html.setAttribute('data-theme', previous)
        html.classList.toggle('dark', previous === 'dark')
      } else {
        html.removeAttribute('data-theme')
      }
    }
  }, [theme])
  
  return null
}
```

---

### 3. Animated background "silky"

Il dettaglio che fa la differenza visiva. Crea `components/auth/auth-background.tsx`:

Approccio: **mesh gradient SVG** + **noise texture overlay** + **subtle parallax al mouse move** (disabilitato per `prefers-reduced-motion`).

```tsx
'use client'

import { useEffect, useRef } from 'react'

export function AuthBackground() {
  const ref = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || !ref.current) return
    
    const el = ref.current
    let raf = 0
    let targetX = 0, targetY = 0
    let currentX = 0, currentY = 0
    
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2
      const y = (e.clientY / window.innerHeight - 0.5) * 2
      targetX = x * 30 // max 30px shift
      targetY = y * 30
    }
    
    const tick = () => {
      currentX += (targetX - currentX) * 0.05
      currentY += (targetY - currentY) * 0.05
      el.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`
      raf = requestAnimationFrame(tick)
    }
    
    window.addEventListener('mousemove', onMove)
    tick()
    
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])
  
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Mesh gradient — silky cloth effect */}
      <div ref={ref} className="absolute -inset-[20%]">
        <svg
          className="size-full opacity-60"
          viewBox="0 0 1200 1200"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            {/* Top-right silk gradient */}
            <radialGradient id="silk-1" cx="85%" cy="15%" r="60%">
              <stop offset="0%" stopColor="#3F3F46" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#1F1F23" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#0A0A0A" stopOpacity="0" />
            </radialGradient>
            
            {/* Bottom-left silk gradient (subtle teal hint) */}
            <radialGradient id="silk-2" cx="10%" cy="90%" r="55%">
              <stop offset="0%" stopColor="#134E4A" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#0A0A0A" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0A0A0A" stopOpacity="0" />
            </radialGradient>
            
            {/* Soft turbulence for cloth texture */}
            <filter id="silk-noise">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.012 0.04"
                numOctaves="2"
                seed="3"
              />
              <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.15 0" />
              <feComposite in2="SourceGraphic" operator="in" />
            </filter>
            
            {/* Diagonal sweep — "fold" of the silk */}
            <linearGradient id="silk-fold" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="40%" stopColor="#0A0A0A" stopOpacity="0" />
              <stop offset="55%" stopColor="#52525B" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#71717A" stopOpacity="0.18" />
              <stop offset="65%" stopColor="#52525B" stopOpacity="0.25" />
              <stop offset="80%" stopColor="#0A0A0A" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          <rect width="100%" height="100%" fill="url(#silk-1)" />
          <rect width="100%" height="100%" fill="url(#silk-2)" />
          <rect width="100%" height="100%" fill="url(#silk-fold)" />
          <rect width="100%" height="100%" filter="url(#silk-noise)" opacity="0.5" />
        </svg>
      </div>
      
      {/* Vignette to focus center */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(10,10,10,0.6) 100%)'
        }}
      />
      
      {/* Grain overlay (very subtle) */}
      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence baseFrequency=\'0.9\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' /%3E%3C/svg%3E")'
        }}
      />
    </div>
  )
}
```

**Risultato visivo**: dark base + due "luci" angolari morbide (alto-dx grigio, basso-sx teal subtle) + striscia diagonale che simula la piega della stoffa (come Resend) + grain leggero. Il tutto si sposta dolcemente al mouse move per un effetto premium parallax.

Performance: SVG statico, parallax via `transform: translate3d`, GPU-accelerated. Su mobile niente parallax (no mousemove). 60fps garantito.

---

### 4. Logo card "R-style"

Crea `components/auth/quotal-logo-card.tsx`:

```tsx
import { motion } from 'framer-motion'

export function QuotalLogoCard() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="mb-10"
    >
      <div className="relative mx-auto flex size-14 items-center justify-center rounded-[14px] bg-zinc-900/80 backdrop-blur-sm ring-1 ring-white/10">
        {/* Subtle inner glow */}
        <div className="absolute inset-0 rounded-[14px] bg-gradient-to-br from-white/[0.08] to-transparent" />
        
        {/* Q monogram — usa Instrument Serif per carattere */}
        <span 
          className="relative font-display text-2xl font-medium leading-none text-white"
          style={{ 
            textShadow: '0 0 20px rgba(20, 184, 166, 0.3)' // subtle teal glow
          }}
        >
          Q
        </span>
      </div>
    </motion.div>
  )
}
```

**Variante con SVG custom** (se Manuel ha logo svg vero):

```tsx
<div className="relative mx-auto flex size-14 items-center justify-center rounded-[14px] bg-zinc-900/80 backdrop-blur-sm ring-1 ring-white/10">
  <Image
    src="/logo-mark-light.svg"
    alt="Quotal"
    width={28}
    height={28}
    priority
  />
</div>
```

Crea `/public/logo-mark-light.svg` placeholder con la "Q" in stile Instrument Serif esportata da Figma. Manuel può sostituirlo dopo con logo definitivo.

---

### 5. OAuth buttons

Crea `components/auth/oauth-buttons.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import { signInWithProvider } from '@/app/actions/auth'
import { enabledOAuthProviders, type OAuthProvider } from '@/lib/auth/providers'
import { GoogleIcon, AppleIcon } from '@/components/icons'

export function OAuthButtons({ next }: { next?: string }) {
  const [pending, startTransition] = useTransition()
  const [activeProvider, setActiveProvider] = useState<OAuthProvider | null>(null)
  
  const handleClick = (provider: OAuthProvider) => {
    if (!enabledOAuthProviders[provider]) return
    setActiveProvider(provider)
    startTransition(async () => {
      await signInWithProvider(provider, next)
    })
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      <OAuthButton
        provider="google"
        icon={<GoogleIcon className="size-4" />}
        label="Continua con Google"
        enabled={enabledOAuthProviders.google}
        loading={pending && activeProvider === 'google'}
        onClick={() => handleClick('google')}
      />
      <OAuthButton
        provider="apple"
        icon={<AppleIcon className="size-4" />}
        label="Continua con Apple"
        enabled={enabledOAuthProviders.apple}
        loading={pending && activeProvider === 'apple'}
        onClick={() => handleClick('apple')}
      />
    </motion.div>
  )
}

function OAuthButton({
  provider,
  icon,
  label,
  enabled,
  loading,
  onClick
}: {
  provider: OAuthProvider
  icon: React.ReactNode
  label: string
  enabled: boolean
  loading: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!enabled || loading}
      whileHover={enabled ? { scale: 1.01 } : undefined}
      whileTap={enabled ? { scale: 0.99 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="
        group relative flex h-11 items-center justify-center gap-2.5
        rounded-xl bg-zinc-900/60 px-4 backdrop-blur-sm
        ring-1 ring-white/[0.08] transition-all duration-200
        hover:bg-zinc-800/80 hover:ring-white/[0.16]
        disabled:opacity-40 disabled:hover:bg-zinc-900/60 disabled:hover:ring-white/[0.08]
        disabled:cursor-not-allowed
        focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950
      "
    >
      {loading ? (
        <Spinner className="size-4" />
      ) : (
        <>
          {icon}
          <span className="text-sm font-medium text-zinc-100">{label}</span>
          {!enabled && (
            <span className="ml-1 rounded-md bg-zinc-700/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-300">
              Presto
            </span>
          )}
        </>
      )}
    </motion.button>
  )
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle
        cx="12" cy="12" r="10"
        stroke="currentColor" strokeOpacity="0.25" strokeWidth="2"
      />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      >
        <animateTransform
          attributeName="transform" type="rotate"
          from="0 12 12" to="360 12 12" dur="0.8s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  )
}
```

#### Icone SVG ufficiali brand

In `components/icons.tsx` aggiungi:

```tsx
export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

export function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  )
}
```

---

### 6. Form input premium dark

Crea `components/auth/auth-input.tsx` per uniformità:

```tsx
'use client'

import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, error, hint, type = 'text', className, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-')
    
    return (
      <div className="space-y-1.5">
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-zinc-300"
        >
          {label}
        </label>
        
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={cn(
              'block h-11 w-full rounded-xl bg-zinc-900/50 px-4',
              'text-sm text-zinc-50 placeholder:text-zinc-600',
              'ring-1 ring-white/[0.08] backdrop-blur-sm transition-all duration-200',
              'hover:ring-white/[0.16]',
              'focus:bg-zinc-900/70 focus:outline-none focus:ring-2 focus:ring-teal-400/60',
              error && 'ring-red-500/60 focus:ring-red-500/80',
              isPassword && 'pr-11',
              type === 'email' && 'font-mono text-[13px]',
              className
            )}
            {...props}
          />
          
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300 focus:outline-none focus-visible:text-zinc-100"
              aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          )}
        </div>
        
        {error && (
          <p className="flex items-center gap-1.5 text-xs text-red-400" role="alert">
            <span className="inline-block size-1 rounded-full bg-red-400" />
            {error}
          </p>
        )}
        
        {hint && !error && (
          <p className="text-xs text-zinc-500">{hint}</p>
        )}
      </div>
    )
  }
)

AuthInput.displayName = 'AuthInput'
```

---

### 7. Pagina `/login`

Sovrascrive `app/(auth)/login/page.tsx`:

```tsx
import Link from 'next/link'
import { Suspense } from 'react'
import { QuotalLogoCard } from '@/components/auth/quotal-logo-card'
import { OAuthButtons } from '@/components/auth/oauth-buttons'
import { LoginForm } from '@/components/auth/login-form'
import { AuthDivider } from '@/components/auth/auth-divider'

export const metadata = {
  title: 'Accedi'
}

export default function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  return (
    <div className="w-full">
      <QuotalLogoCard />
      
      <div className="space-y-2 text-center">
        <h1 className="font-display text-[32px] font-medium leading-tight text-white md:text-[34px]">
          Bentornato
        </h1>
        <p className="text-sm text-zinc-400">
          Non hai un account?{' '}
          <Link
            href="/signup"
            className="font-medium text-zinc-100 transition-colors hover:text-teal-400"
          >
            Registrati
          </Link>
        </p>
      </div>
      
      <Suspense fallback={null}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function LoginContent({
  searchParams
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await searchParams
  
  return (
    <div className="mt-10 space-y-6">
      <OAuthButtons next={next} />
      <AuthDivider label="oppure" />
      <LoginForm next={next} initialError={error} />
    </div>
  )
}
```

#### `components/auth/login-form.tsx`

```tsx
'use client'

import { useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { AuthInput } from './auth-input'
import { AuthSubmitButton } from './auth-submit-button'
import { signInWithEmail } from '@/app/actions/auth'

export function LoginForm({
  next,
  initialError
}: {
  next?: string
  initialError?: string
}) {
  const [error, setError] = useState<string | undefined>(initialError)
  const [pending, startTransition] = useTransition()
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(undefined)
    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      const result = await signInWithEmail(formData)
      if (result?.error) setError(result.error)
    })
  }
  
  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-5"
    >
      <input type="hidden" name="next" value={next || ''} />
      
      {/* Honeypot — bot trap */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] opacity-0 pointer-events-none"
      />
      
      <AuthInput
        label="Email"
        name="email"
        type="email"
        placeholder="alan.turing@example.com"
        autoComplete="email"
        required
        autoFocus
      />
      
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
            Password
          </label>
          <Link
            href="/reset-password"
            className="text-xs text-zinc-400 transition-colors hover:text-teal-400"
          >
            Password dimenticata?
          </Link>
        </div>
        <AuthInput
          label=""
          id="password"
          name="password"
          type="password"
          placeholder="••••••••••"
          autoComplete="current-password"
          required
          minLength={8}
        />
      </div>
      
      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/20"
          role="alert"
        >
          {error}
        </motion.div>
      )}
      
      <AuthSubmitButton pending={pending}>Accedi</AuthSubmitButton>
    </motion.form>
  )
}
```

#### `components/auth/auth-submit-button.tsx`

```tsx
'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

export function AuthSubmitButton({
  children,
  pending
}: {
  children: ReactNode
  pending?: boolean
}) {
  return (
    <motion.button
      type="submit"
      disabled={pending}
      whileHover={!pending ? { scale: 1.01 } : undefined}
      whileTap={!pending ? { scale: 0.99 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="
        relative flex h-11 w-full items-center justify-center
        rounded-xl bg-zinc-100 text-sm font-semibold text-zinc-900
        ring-1 ring-zinc-200 transition-all duration-200
        hover:bg-white disabled:cursor-not-allowed disabled:opacity-60
        focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950
      "
    >
      {pending ? (
        <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
          <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : (
        children
      )}
    </motion.button>
  )
}
```

#### `components/auth/auth-divider.tsx`

```tsx
export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="relative flex items-center" aria-hidden="true">
      <div className="flex-1 border-t border-white/[0.08]" />
      <span className="px-4 text-xs uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      <div className="flex-1 border-t border-white/[0.08]" />
    </div>
  )
}
```

---

### 8. Pagina `/signup` (membri palestra)

Sovrascrive `app/(auth)/signup/page.tsx`. Stesso layout di login, ma:

- Heading: "Crea un account Quotal"
- Sottotitolo: "Hai già un account? **Accedi**"
- Form con 4 campi: nome, cognome, email, password (no codice fiscale qui — opzionale dopo, come deciso)
- Footer disclaimer: "Iscrivendoti, accetti i nostri **Termini**, **Uso Accettabile** e **Privacy Policy**"

```tsx
// app/(auth)/signup/page.tsx
import Link from 'next/link'
import { Suspense } from 'react'
import { QuotalLogoCard } from '@/components/auth/quotal-logo-card'
import { OAuthButtons } from '@/components/auth/oauth-buttons'
import { SignupForm } from '@/components/auth/signup-form'
import { AuthDivider } from '@/components/auth/auth-divider'

export const metadata = {
  title: 'Registrati'
}

export default function SignupPage({
  searchParams
}: {
  searchParams: Promise<{ invitation?: string; error?: string }>
}) {
  return (
    <div className="w-full">
      <QuotalLogoCard />
      
      <div className="space-y-2 text-center">
        <h1 className="font-display text-[32px] font-medium leading-tight text-white md:text-[34px]">
          Crea un account Quotal
        </h1>
        <p className="text-sm text-zinc-400">
          Hai già un account?{' '}
          <Link
            href="/login"
            className="font-medium text-zinc-100 transition-colors hover:text-teal-400"
          >
            Accedi
          </Link>
        </p>
      </div>
      
      <Suspense fallback={null}>
        <SignupContent searchParams={searchParams} />
      </Suspense>
      
      <p className="mt-8 text-center text-xs leading-relaxed text-zinc-500">
        Iscrivendoti, accetti i nostri{' '}
        <Link href="/termini-e-condizioni" className="text-zinc-400 underline underline-offset-2 hover:text-zinc-200">
          Termini
        </Link>
        ,{' '}
        <Link href="/uso-accettabile" className="text-zinc-400 underline underline-offset-2 hover:text-zinc-200">
          Uso Accettabile
        </Link>
        {' '}e{' '}
        <Link href="/privacy-policy" className="text-zinc-400 underline underline-offset-2 hover:text-zinc-200">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  )
}

async function SignupContent({
  searchParams
}: {
  searchParams: Promise<{ invitation?: string; error?: string }>
}) {
  const { invitation, error } = await searchParams
  
  return (
    <div className="mt-10 space-y-6">
      <OAuthButtons />
      <AuthDivider label="oppure" />
      <SignupForm invitationToken={invitation} initialError={error} />
    </div>
  )
}
```

#### `components/auth/signup-form.tsx`

```tsx
'use client'

import { useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import { AuthInput } from './auth-input'
import { AuthSubmitButton } from './auth-submit-button'
import { PasswordStrengthMeter } from './password-strength-meter'
import { signUpWithEmail } from '@/app/actions/auth'

export function SignupForm({
  invitationToken,
  initialError
}: {
  invitationToken?: string
  initialError?: string
}) {
  const [error, setError] = useState<string | undefined>(initialError)
  const [password, setPassword] = useState('')
  const [pending, startTransition] = useTransition()
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(undefined)
    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      const result = await signUpWithEmail(formData)
      if (result?.error) setError(result.error)
    })
  }
  
  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-5"
    >
      {invitationToken && <input type="hidden" name="invitation_token" value={invitationToken} />}
      
      <input
        type="text" name="website" tabIndex={-1} autoComplete="off"
        aria-hidden="true" className="absolute left-[-9999px] opacity-0 pointer-events-none"
      />
      
      <div className="grid grid-cols-2 gap-4">
        <AuthInput
          label="Nome"
          name="first_name"
          autoComplete="given-name"
          required
          autoFocus
        />
        <AuthInput
          label="Cognome"
          name="last_name"
          autoComplete="family-name"
          required
        />
      </div>
      
      <AuthInput
        label="Email"
        name="email"
        type="email"
        placeholder="alan.turing@example.com"
        autoComplete="email"
        required
      />
      
      <div className="space-y-2">
        <AuthInput
          label="Password"
          name="password"
          type="password"
          placeholder="••••••••••"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={e => setPassword(e.target.value)}
          hint="Minimo 8 caratteri, almeno una lettera e un numero"
        />
        <PasswordStrengthMeter password={password} />
      </div>
      
      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/20"
          role="alert"
        >
          {error}
        </motion.div>
      )}
      
      <AuthSubmitButton pending={pending}>Crea account</AuthSubmitButton>
    </motion.form>
  )
}
```

#### `components/auth/password-strength-meter.tsx`

Mostra 4 barre orizzontali che si colorano in base alla strength (weak/fair/good/strong). Usa `zxcvbn` (lib leggera, ~400KB di dictionary, lazy import per evitare bundle bloat):

```tsx
'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export function PasswordStrengthMeter({ password }: { password: string }) {
  const [score, setScore] = useState(0)
  
  useEffect(() => {
    if (!password) {
      setScore(0)
      return
    }
    
    let cancelled = false
    // Lazy load zxcvbn to avoid 400kb on initial load
    import('zxcvbn').then(({ default: zxcvbn }) => {
      if (cancelled) return
      const result = zxcvbn(password)
      setScore(result.score) // 0-4
    })
    
    return () => { cancelled = true }
  }, [password])
  
  const labels = ['', 'Debole', 'Bassa', 'Media', 'Forte', 'Robusta']
  const colors = [
    'bg-zinc-700',
    'bg-red-500/70',
    'bg-orange-500/70',
    'bg-yellow-500/70',
    'bg-teal-400/70',
    'bg-teal-400'
  ]
  
  if (!password) return null
  
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map(i => (
          <motion.div
            key={i}
            initial={false}
            animate={{ opacity: i <= score ? 1 : 0.3 }}
            className={`h-1 rounded-full ${i <= score ? colors[score] : 'bg-zinc-800'}`}
          />
        ))}
      </div>
      <p className="text-xs text-zinc-500">
        Sicurezza: <span className="text-zinc-300">{labels[score]}</span>
      </p>
    </div>
  )
}
```

Aggiungi `zxcvbn` alle deps:
```bash
npm install zxcvbn
npm install -D @types/zxcvbn
```

---

### 9. Server actions OAuth + Email

Aggiorna `app/actions/auth.ts` (creato in prompt 03) con:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import type { OAuthProvider } from '@/lib/auth/providers'
import { rateLimiters, checkRateLimit } from '@/lib/ratelimit' // dal prompt 10

const PROVIDER_MAP = {
  google: 'google',
  apple: 'apple'
} as const

export async function signInWithProvider(provider: OAuthProvider, next?: string) {
  const supabase = await createClient()
  const headersList = await headers()
  const origin = headersList.get('origin') || process.env.NEXT_PUBLIC_SITE_URL!
  
  const redirectTo = new URL('/auth/callback', origin)
  if (next) redirectTo.searchParams.set('next', next)
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: PROVIDER_MAP[provider],
    options: {
      redirectTo: redirectTo.toString(),
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account' // Sempre mostra picker, anche se già loggato
      }
    }
  })
  
  if (error) {
    console.error('OAuth error:', error)
    redirect(`/login?error=${encodeURIComponent('Errore durante l\'accesso. Riprova.')}`)
  }
  
  if (data?.url) redirect(data.url)
}
```

Aggiorna anche `signInWithEmail` e `signUpWithEmail` per:
- Honeypot check (`if (formData.get('website')) return { error: 'Errore' }`)
- Rate limiting (`checkRateLimit(rateLimiters.auth, identifier)` con identifier = email + IP)
- Validazione zod
- Mappa errori Supabase a messaggi italiani user-friendly:

```typescript
function mapAuthError(error: { message: string; code?: string }): string {
  const map: Record<string, string> = {
    'invalid_credentials': 'Email o password non corretti',
    'email_not_confirmed': 'Devi prima confermare la tua email. Controlla la casella di posta.',
    'user_already_registered': 'Esiste già un account con questa email. Prova ad accedere.',
    'weak_password': 'Password troppo debole. Usa almeno 8 caratteri con lettere e numeri.',
    'over_email_send_rate_limit': 'Troppe richieste. Riprova tra qualche minuto.',
    'signup_disabled': 'Le iscrizioni sono temporaneamente disabilitate.'
  }
  return map[error.code || ''] || error.message || 'Si è verificato un errore. Riprova.'
}
```

---

### 10. Callback OAuth

Crea `app/auth/callback/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  
  if (error) {
    console.error('OAuth callback error:', error, errorDescription)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Accesso annullato o errore. Riprova.')}`
    )
  }
  
  if (code) {
    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!exchangeError) {
      // handle_new_user trigger (dal prompt 02) crea automaticamente il profilo
      // Recupera ruolo per redirect corretto
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        // Role-based redirect
        if (profile?.role === 'owner' || profile?.role === 'staff') {
          return NextResponse.redirect(`${origin}/dashboard`)
        }
        return NextResponse.redirect(`${origin}${next === '/' ? '/m' : next}`)
      }
    }
    
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Errore durante la verifica. Riprova.')}`
    )
  }
  
  return NextResponse.redirect(`${origin}/login`)
}
```

---

### 11. Pagine `/reset-password` e `/update-password`

Stesso treatment dark/premium. Riutilizza i componenti `AuthInput`, `AuthSubmitButton`, `QuotalLogoCard`.

`app/(auth)/reset-password/page.tsx`:
- Heading: "Reimposta la password"
- Sottotitolo: "Inserisci la tua email. Ti invieremo un link per reimpostare la password."
- Solo input email + submit
- Success state inline: "Controlla la tua casella" con illustrazione SVG sottile (envelope)

`app/(auth)/update-password/page.tsx`:
- Heading: "Imposta nuova password"
- Sottotitolo: "Scegli una password sicura per il tuo account."
- 2 input: nuova password + conferma
- PasswordStrengthMeter
- Validazione client-side: le 2 password devono coincidere

---

### 12. Verifica email post-signup

Crea `app/(auth)/verifica-email/page.tsx`:

Pagina ponte che mostra:
- Logo card
- Icona envelope animata (subtle pulse)
- Heading: "Controlla la tua email"
- Body: "Abbiamo inviato un link di verifica a **{email}**. Clicca sul link per attivare il tuo account."
- Bottone "Reinvia email" (rate-limited a 1/2min)
- Link "Cambia indirizzo email" → torna a signup

Layout: stesso `(auth)/layout.tsx`.

---

### 13. Dettagli tipografici e finishing

In `app/globals.css` aggiungi (nella sezione `[data-theme="dark"]` o globale):

```css
/* Auth pages — disable text selection on decorative elements */
.auth-decorative {
  user-select: none;
  -webkit-user-select: none;
}

/* Smoother font rendering on dark bg */
[data-theme="dark"] {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

/* Email input — slightly off color hint for readability */
[data-theme="dark"] input[type="email"]::placeholder {
  font-feature-settings: 'tnum';
  letter-spacing: 0.01em;
}

/* Disable autofill yellow background in Chrome */
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px rgb(24 24 27 / 0.5) inset !important;
  -webkit-text-fill-color: #fafafa !important;
  caret-color: #fafafa !important;
  transition: background-color 5000s ease-in-out 0s;
}
```

In `tailwind.config.ts` (o equivalente Tailwind v4 in CSS), assicurati che:
- `font-display` sia mappato a Instrument Serif
- Custom utilities per text-shadow se necessarie

---

### 14. Accessibilità

Tutte le pagine auth devono passare:

- **Lighthouse Accessibility**: 100
- **axe-core**: 0 violations
- **WCAG 2.1 AA**: contrasto >= 4.5:1 per testo normale, 3:1 per large text

Check critici:
- Contrasto bianco su `#0A0A0A`: 19.5:1 ✓
- Contrasto `text-zinc-400` (#a1a1aa) su `#0A0A0A`: 8.4:1 ✓
- Contrasto `text-zinc-500` (#71717a) su `#0A0A0A`: 5.4:1 ✓ (limite per body, ok per hint/disclaimer)
- Contrasto `text-zinc-600` su `#0A0A0A`: 3.6:1 — **solo per placeholder**, NON per testo importante
- Focus rings sempre visibili (teal su dark = ottimo contrasto)
- Screen reader: form labels associati correttamente, error in `role="alert"`, aria-hidden su decorativi
- Keyboard navigation: tab order logico (logo → home back → OAuth Google → OAuth Apple → email → password → submit → footer links)

Aggiungi `<SkipToMain>` component se non esiste:
```tsx
<a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-zinc-100 focus:px-3 focus:py-1.5 focus:text-zinc-900">
  Salta al contenuto
</a>
```

---

### 15. Reduced motion

Tutte le animazioni (background parallax, motion entrance, hover scale) devono rispettare `prefers-reduced-motion`:

```tsx
// In framer-motion globalmente
import { MotionConfig } from 'framer-motion'

<MotionConfig reducedMotion="user">
  {children}
</MotionConfig>
```

Background parallax: già gestito in `auth-background.tsx` con check `matchMedia`.

---

## Cosa NON fare

- Non aggiungere captcha visibile (Cloudflare Turnstile è opzionale, già in prompt 10)
- Non aggiungere "Ricordami" checkbox — Supabase gestisce sessioni con refresh token automatici (default 1 settimana, configurabile in Supabase dashboard)
- Non aggiungere "Login con telefono" — non lo abbiamo configurato e richiede SMS provider (costoso)
- Non implementare 2FA in questo prompt (post-MVP)
- Non sostituire la pagina `/onboarding-titolare` — quella resta light-themed perché è dentro l'app
- Non cambiare middleware, server actions logic, role-based redirect — sovrascrive SOLO l'UI

---

## Come testare

### Visual

1. `npm run dev` → vai a `/login` → verifica:
   - Background dark con gradient silky animato
   - Logo Q card con border-radius 14px
   - 2 OAuth buttons + form sotto
   - Mouse move → leggero parallax sul gradient
   - Tab navigation visibile

2. Test mobile (DevTools responsive, 375px): tutto leggibile, niente parallax, OAuth in 1 colonna

3. Toggle "prefers-reduced-motion" in DevTools → verifica niente animazioni

4. Test browser Safari iOS reale (PWA target) → verifica autofill

### OAuth

5. Click "Continua con Google" → redirect Google → consenso → torna a `/auth/callback` → redirect a dashboard (se owner) o `/m` (se member)

6. Apple disabilitato (`APPLE_OAUTH_ENABLED=false`): bottone dimmed con badge "Presto"

7. Apple abilitato: stesso flow Google

### Email/Password

8. Login con credenziali sbagliate → vedi messaggio italiano "Email o password non corretti" in red box animato

9. Signup nuovo membro:
   - Nome, cognome, email, password debole → strength meter rosso, "Sicurezza: Debole"
   - Aumenta password → barre cambiano colore progressivamente fino a teal
   - Submit → ricevi email verifica → clicca link → redirect a `/m` (membro)

10. Honeypot: in DevTools, riempi campo `website` (display:none) → submit → response 200 fake, nessun account creato (controlla Supabase dashboard)

### Rate limit

11. 6 login falliti in 15 minuti → "Troppi tentativi, riprova tra X minuti"

### Reset password

12. `/reset-password` → inserisci email → vedi success state → controlla email → click link → `/update-password` → cambia password → redirect a login

### Accessibility

13. axe DevTools extension → 0 violations su `/login`, `/signup`, `/reset-password`

14. Tab navigation: logo back → OAuth → email → password → submit, tutti con focus ring teal visibile

15. Screen reader (VoiceOver Mac o NVDA Windows): leggi pagina, verifica labels e error announcements

### Performance

16. Lighthouse `/login`: Performance 95+, Accessibility 100, Best Practices 100, SEO 100

17. Bundle size: pagina auth < 80kb gzip (zxcvbn lazy-loaded conta solo se utente digita password)

---

## File da produrre (sintesi)

```
app/
├── (auth)/
│   ├── layout.tsx                  ← OVERWRITE (dark forced)
│   ├── login/page.tsx              ← OVERWRITE
│   ├── signup/page.tsx             ← OVERWRITE
│   ├── reset-password/page.tsx     ← OVERWRITE
│   ├── update-password/page.tsx    ← OVERWRITE
│   └── verifica-email/page.tsx     ← NEW
├── auth/
│   └── callback/route.ts           ← NEW (OAuth callback)
└── actions/
    └── auth.ts                     ← UPDATE (add signInWithProvider, error mapping)

components/auth/
├── auth-background.tsx             ← NEW (silky gradient)
├── auth-divider.tsx                ← NEW
├── auth-input.tsx                  ← NEW
├── auth-submit-button.tsx          ← NEW
├── login-form.tsx                  ← NEW
├── signup-form.tsx                 ← NEW
├── reset-password-form.tsx         ← NEW
├── update-password-form.tsx        ← NEW
├── oauth-buttons.tsx               ← NEW
├── password-strength-meter.tsx     ← NEW
├── quotal-logo-card.tsx            ← NEW
└── theme-forcer.tsx                ← NEW

components/icons.tsx                ← UPDATE (GoogleIcon, AppleIcon)

lib/auth/
└── providers.ts                    ← NEW (enabledOAuthProviders config)

public/
└── logo-mark-light.svg             ← NEW (placeholder Q monogram)

docs/
└── oauth-setup.md                  ← NEW (Google + Apple setup steps)
```

Total: ~14 nuovi file + 5 sovrascritti.

---

## Risultato atteso

Quando un utente arriva a `/login` o `/signup` per la prima volta:

1. Lo schermo è **immediatamente memorabile**: dark profondo con un gradient silky che si muove dolcemente
2. Il **logo Q** in card squared cattura l'occhio nel modo giusto (centro, non troppo grande)
3. Il **titolo serif** dà personalità — non sembra il millesimo signup form Bootstrap
4. **OAuth e form** sono accessibili istantaneamente, niente friction inutile
5. **Microanimazioni** (entrance staggered, hover scale, parallax) comunicano qualità senza distrarre
6. Quando si completa il login, **transizione dark→light** verso l'app interna = "porta che si apre", momento wow

Stesso livello di Resend, Linear, Vercel — ma con identità Quotal (font Instrument Serif, accent teal, italianità nei microcopy).

---

## Note finali

**Sul dark forzato**: alcuni utenti con `prefers-color-scheme: light` potrebbero stupirsi del dark improvviso. Se lo si vuole evitare, considera in v2 una variante light-themed delle stesse pagine. Per ora, il dark è una scelta di brand precisa: distingue le pagine auth dal resto dell'app e crea il momento wow.

**Sui font display**: Instrument Serif è già caricato dal prompt 01. Se per qualche motivo non lo è, aggiungerlo in `app/layout.tsx`:

```typescript
import { Instrument_Serif } from 'next/font/google'

const instrumentSerif = Instrument_Serif({
  weight: ['400'],
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap'
})
```

**Su Apple Sign-In**: se Manuel non ha Apple Developer Program (€99/anno), valutare se vale la pena. Per palestre italiane Google copre il 70%+ degli utenti. Apple è un nice-to-have, non un must. Considerare di abilitarlo solo se Manuel decide di pubblicare la PWA in App Store (richiede comunque Developer Program).

**Sul logo SVG vero**: il monogramma "Q" in Instrument Serif funziona come placeholder professionale. Se Manuel ha tempo, può creare un logomark dedicato in Figma (es. una "Q" stilizzata con il quadrato e una virgolette, come "Quote-tal") e sostituirlo in `/public/logo-mark-light.svg`.

**Quando estenderai a v2 (multi-tenant SaaS)**: queste stesse pagine resteranno per i membri delle palestre. Le pagine di signup TITOLARI (gym owner che si iscrivono a Quotal SaaS) saranno separate, su `quotal.it/iscrizione-titolare` o simile, con flow diverso (creazione gym, scelta piano Quotal SaaS, payment). Vedi prompt 12.
