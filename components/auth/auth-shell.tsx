import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { AuthBackground } from '@/components/auth/auth-background'
import { ThemeToggle } from '@/components/shared/theme-toggle'

/**
 * Premium auth shell. Aurora + mesh + grain backdrop, glass card centered,
 * generous whitespace, theme-aware (dark mode flawless). Each auth page
 * supplies its own glass card via children.
 */
export function AuthShell({
  children,
  width = 'md',
}: {
  children: ReactNode
  /** Card max-width — `md` for login/reset/verify, `lg` for signup, `xl` for onboarding. */
  width?: 'md' | 'lg' | 'xl'
}) {
  const widthClass =
    width === 'xl'
      ? 'max-w-2xl'
      : width === 'lg'
        ? 'max-w-lg'
        : 'max-w-md'

  return (
    <div className="bg-background text-foreground relative isolate min-h-svh overflow-hidden">
      <AuthBackground />

      <a
        href="#auth-main"
        className="bg-foreground text-background sr-only rounded-md px-3 py-1.5 text-sm font-medium focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
      >
        Salta al contenuto
      </a>

      <header className="pt-safe relative z-10 flex h-16 items-center justify-between px-4 md:px-8">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground tap-shrink group inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          <span className="font-medium">Home</span>
        </Link>
        <ThemeToggle />
      </header>

      <main
        id="auth-main"
        className={`pb-safe relative z-10 mx-auto flex min-h-[calc(100svh-4rem)] w-full ${widthClass} flex-col items-center justify-center px-4 pb-12 sm:px-6`}
      >
        {children}
      </main>
    </div>
  )
}
