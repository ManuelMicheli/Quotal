/**
 * Member profile page — `/app/profilo`.
 *
 * Apple-style grouped settings list: hero avatar, then sections of
 * tappable rows with leading icon discs, separated by hairline dividers.
 *
 * Server component for the data load; the form itself is a client
 * component (`ProfileForm`).
 */
import {
  BellIcon,
  ChevronRightIcon,
  FileTextIcon,
  KeyIcon,
  LogOutIcon,
  ShieldIcon,
  SunIcon,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'

import { PageHeader } from '@/components/member/page-header'
import { PrivacyActions } from '@/components/member/privacy-actions'
import { ProfileForm } from '@/components/member/profile-form'
import { LogoutButton } from '@/components/shared/logout-button'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { requireMember } from '@/lib/auth'
import { APP_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Profilo',
}

export default async function MemberProfilePage() {
  const profile = await requireMember()
  const initials =
    profile.full_name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '·'

  return (
    <div className="flex flex-col gap-5 md:gap-8">
      <PageHeader
        title="Profilo"
        subtitle={profile.email}
        showBack={false}
      />

      <section className="ring-elevated relative overflow-hidden rounded-3xl bg-card p-6 sheen md:p-10">
        <div
          aria-hidden="true"
          className="pulse-glow pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full opacity-60 md:-right-20 md:-top-20 md:h-72 md:w-72"
          style={{
            background:
              'radial-gradient(closest-side, color-mix(in oklab, var(--accent) 38%, transparent), transparent)',
          }}
        />
        <div className="relative flex items-center gap-4 md:gap-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-foreground font-display text-2xl text-background shadow-[var(--shadow-2)] md:h-24 md:w-24 md:text-4xl">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="heading-display truncate text-xl md:text-4xl">
              {profile.full_name}
            </p>
            <p className="truncate text-sm text-muted-foreground md:text-base">
              {profile.email}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-5 md:gap-6 lg:col-span-1">
          <Section title="I tuoi dati">
            <ProfileForm profile={profile} />
          </Section>
        </div>

        <div className="flex flex-col gap-5 md:gap-6 lg:col-span-1">
          <Section title="Notifiche e sicurezza" padded={false}>
            <RowLink
              href="/app/profilo/notifiche"
              icon={BellIcon}
              tone="info"
              hint="Email · Push"
            >
              Notifiche
            </RowLink>
            <RowLink
              href="/reset-password"
              icon={KeyIcon}
              tone="muted"
              hint="Password"
            >
              Cambia password
            </RowLink>
            <LogoutButton
              variant="ghost"
              showIcon={false}
              className="tap-shrink h-auto w-full justify-start gap-3 rounded-none px-5 py-4 text-sm text-destructive hover:bg-destructive-soft hover:text-destructive"
            >
              <span className="bg-destructive-soft text-destructive flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl">
                <LogOutIcon size={16} aria-hidden="true" />
              </span>
              Esci dall&apos;account
            </LogoutButton>
          </Section>

          <Section title="Aspetto">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="bg-warning-soft text-warning flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl">
                  <SunIcon size={16} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">Tema</span>
                  <span className="block text-xs text-muted-foreground">
                    Chiaro · Scuro · Sistema
                  </span>
                </span>
              </div>
              <ThemeToggle variant="segmented" />
            </div>
          </Section>
        </div>

        <div className="flex flex-col gap-5 md:gap-6 md:col-span-2 lg:col-span-1">
          <Section title="Privacy e dati">
            <PrivacyActions />
          </Section>

          <Section title="Documenti legali" padded={false}>
            <RowLink href="/privacy" icon={ShieldIcon} tone="info">
              Informativa privacy
            </RowLink>
            <RowLink href="/termini" icon={FileTextIcon} tone="muted">
              Termini e condizioni
            </RowLink>
            <RowLink href="/cookie-policy" icon={FileTextIcon} tone="muted">
              Cookie policy
            </RowLink>
          </Section>
        </div>
      </div>

      <p className="px-2 text-center text-[11px] text-muted-foreground md:text-xs">
        {APP_NAME} v0.1.0 · © {new Date().getFullYear()} Quotal
        <br />
        Per richieste GDPR scrivi a{' '}
        <a href="mailto:privacy@quotal.it" className="text-accent underline">
          privacy@quotal.it
        </a>
      </p>
    </div>
  )
}

function Section({
  title,
  children,
  padded = true,
}: {
  title: string
  children: React.ReactNode
  padded?: boolean
}) {
  return (
    <section className="ring-soft overflow-hidden rounded-3xl bg-card">
      <h2 className="eyebrow px-5 pb-1 pt-5">{title}</h2>
      <div
        className={cn(
          padded ? 'px-5 pb-5 pt-3' : 'mt-2 divide-y divide-border/60',
        )}
      >
        {children}
      </div>
    </section>
  )
}

const ROW_TONE: Record<'info' | 'accent' | 'warning' | 'muted', string> = {
  info: 'bg-info-soft text-info',
  accent: 'bg-accent-soft text-accent',
  warning: 'bg-warning-soft text-warning',
  muted: 'bg-muted text-muted-foreground',
}

function RowLink({
  href,
  icon: Icon,
  tone = 'muted',
  hint,
  children,
}: {
  href: string
  icon: LucideIcon
  tone?: keyof typeof ROW_TONE
  hint?: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="tap-shrink flex items-center gap-3 px-5 py-4 text-sm transition-colors hover:bg-muted/40"
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl',
          ROW_TONE[tone],
        )}
      >
        <Icon size={16} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{children}</span>
        {hint ? (
          <span className="block truncate text-xs text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </span>
      <ChevronRightIcon size={16} className="shrink-0 text-muted-foreground" />
    </Link>
  )
}
