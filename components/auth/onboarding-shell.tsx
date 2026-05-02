import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { AuthBackground } from '@/components/auth/auth-background'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { APP_NAME } from '@/lib/constants'

/**
 * Wide shell for the public owner-onboarding flow. Same aurora/mesh/grain
 * backdrop as the rest of the auth group; just generous extra width to fit
 * the multi-section setup form and a Stepper at the top.
 */
export function OnboardingShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background text-foreground relative isolate min-h-svh overflow-hidden">
      <AuthBackground />

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

      <main className="relative z-10 mx-auto w-full max-w-2xl px-4 pb-12 pt-4 sm:px-6">
        {children}
      </main>

      <footer className="text-muted-foreground pb-safe relative z-10 mt-4 flex flex-col items-center gap-2 pb-8 text-xs">
        <nav className="flex gap-4">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy
          </Link>
          <Link href="/termini" className="hover:text-foreground transition-colors">
            Termini
          </Link>
          <Link
            href="/cookie-policy"
            className="hover:text-foreground transition-colors"
          >
            Cookie
          </Link>
        </nav>
        <p>
          © {new Date().getFullYear()} {APP_NAME}
        </p>
      </footer>
    </div>
  )
}
