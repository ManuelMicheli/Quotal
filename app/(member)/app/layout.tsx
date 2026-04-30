/**
 * Layout for the member PWA.
 *
 * Server component. Calls `requireMember()` so every nested page gets the
 * profile guard "for free".
 *
 * Responsive shape:
 *   - Phone: single column (max-w-md), bottom dock for nav, install prompt.
 *   - Tablet+: glass top bar with full nav, container expands to max-w-6xl,
 *     bottom dock hides.
 */
import type { Metadata, Viewport } from 'next'

import { BottomNav } from '@/components/member/bottom-nav'
import { InstallPrompt } from '@/components/member/install-prompt'
import { OnlineBanner } from '@/components/member/online-banner'
import { ServiceWorkerRegister } from '@/components/member/sw-register'
import { MemberTopBar } from '@/components/member/top-bar'
import { Toaster } from '@/components/ui/sonner'
import { requireMember } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'La tua palestra',
  appleWebApp: {
    title: 'Quotal',
    statusBarStyle: 'black-translucent',
    capable: true,
  },
}

export const viewport: Viewport = {
  themeColor: '#0F766E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
}

export default async function MemberAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireMember()

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden="true"
        className="bg-aurora pointer-events-none fixed inset-x-0 top-0 h-[60vh]"
      />
      <div
        aria-hidden="true"
        className="bg-grain pointer-events-none fixed inset-0 opacity-40 mix-blend-multiply"
      />

      <ServiceWorkerRegister />
      <OnlineBanner />
      <MemberTopBar />

      <main className="relative mx-auto w-full max-w-md px-5 pb-32 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:max-w-5xl md:px-8 md:pb-16 md:pt-10 lg:max-w-6xl lg:px-10 lg:pt-12">
        {children}
      </main>

      <InstallPrompt />
      <BottomNav />
      <Toaster position="top-center" />
    </div>
  )
}
