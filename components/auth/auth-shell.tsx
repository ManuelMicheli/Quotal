import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { AuthBackground } from '@/components/auth/auth-background'
import { ThemeForcer } from '@/components/auth/theme-forcer'

/**
 * Premium dark shell for the public auth pages. Forces dark theme,
 * renders the silky mesh background, exposes a "back to home" affordance,
 * and centres the page content in a `max-w-md` column.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <>
      <ThemeForcer theme="dark" />
      <div className="relative min-h-svh overflow-hidden bg-[#0A0A0A] text-zinc-50">
        <AuthBackground />

        <a
          href="#auth-main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-zinc-100 focus:px-3 focus:py-1.5 focus:text-zinc-900"
        >
          Salta al contenuto
        </a>

        <header className="relative z-10 flex h-16 items-center px-6 md:px-10">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-zinc-100"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            <span className="font-medium">Home</span>
          </Link>
        </header>

        <main
          id="auth-main"
          className="relative z-10 mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-md flex-col items-center justify-center px-6 pb-16"
        >
          {children}
        </main>
      </div>
    </>
  )
}
