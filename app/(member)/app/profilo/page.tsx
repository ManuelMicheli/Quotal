/**
 * Member profile page — `/app/profilo`.
 *
 * Stacks sections: profile (editable form), notifications, security,
 * privacy/GDPR, theme, legal documents, app info.
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
  const initials = profile.full_name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="flex flex-col gap-5 md:gap-8">
      <PageHeader
        title="Profilo"
        subtitle={profile.email}
        showBack={false}
      />

      <section className="ring-elevated relative overflow-hidden rounded-[28px] bg-card p-6 md:p-10">
        <div
          aria-hidden="true"
          className="absolute -right-16 -top-16 h-44 w-44 rounded-full opacity-60 md:h-72 md:w-72 md:-right-20 md:-top-20"
          style={{
            background:
              'radial-gradient(closest-side, color-mix(in oklab, var(--accent) 35%, transparent), transparent)',
          }}
        />
        <div className="relative flex items-center gap-4 md:gap-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-foreground font-display text-2xl text-background md:h-24 md:w-24 md:text-4xl">
            {initials || '·'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-xl tracking-tight md:text-4xl">
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
            <RowLink href="/app/profilo/notifiche" icon={BellIcon}>
              Email e push
            </RowLink>
            <RowLink href="/reset-password" icon={KeyIcon}>
              Cambia password
            </RowLink>
            <LogoutButton
              variant="ghost"
              showIcon={false}
              className="tap-shrink h-auto w-full justify-start gap-3 rounded-none px-5 py-4 text-sm text-destructive hover:bg-destructive/5 hover:text-destructive"
            >
              <LogOutIcon size={16} aria-hidden="true" />
              Esci dall&apos;account
            </LogoutButton>
          </Section>

          <Section title="Aspetto">
            <ThemeToggle variant="segmented" />
          </Section>
        </div>

        <div className="flex flex-col gap-5 md:gap-6 md:col-span-2 lg:col-span-1">
          <Section title="Privacy e dati">
            <PrivacyActions />
          </Section>

          <Section title="Documenti legali" padded={false}>
            <RowLink href="/privacy" icon={ShieldIcon}>
              Informativa privacy
            </RowLink>
            <RowLink href="/termini" icon={FileTextIcon}>
              Termini e condizioni
            </RowLink>
            <RowLink href="/cookie-policy" icon={FileTextIcon}>
              Cookie policy
            </RowLink>
          </Section>
        </div>
      </div>

      <p className="px-2 text-center text-[11px] text-muted-foreground md:text-xs">
        {APP_NAME} v0.1.0 · © {new Date().getFullYear()} Quotal
        <br />
        Per richieste GDPR scrivi a{' '}
        <a
          href="mailto:privacy@quotal.it"
          className="text-[color:var(--accent)] underline"
        >
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
      <h2 className="px-5 pb-1 pt-4 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </h2>
      <div
        className={cn(
          padded ? 'px-5 pb-5 pt-3' : 'divide-y divide-border/60 pt-1',
        )}
      >
        {children}
      </div>
    </section>
  )
}

function RowLink({
  href,
  icon: Icon,
  children,
}: {
  href: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="tap-shrink flex items-center gap-3 px-5 py-4 text-sm transition-colors hover:bg-muted/40"
    >
      <Icon size={16} className="shrink-0 text-muted-foreground" />
      <span className="flex-1">{children}</span>
      <ChevronRightIcon
        size={16}
        className="shrink-0 text-muted-foreground"
      />
    </Link>
  )
}
