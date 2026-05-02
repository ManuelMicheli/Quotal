/**
 * Layout for the member PWA.
 *
 * Server component. Calls `requireMember()` so every nested page gets the
 * profile guard "for free".
 *
 * Responsive shape:
 *   - Phone: single column (max-w-md), bottom dock for nav, install prompt.
 *   - Tablet (md): glass top bar with full nav, fluid container.
 *   - Desktop (lg+): persistent left sidebar with nav + profile, fluid
 *     content fills the remaining horizontal space (capped at 2xl).
 */
import type { Metadata, Viewport } from 'next'

import { BottomNav } from '@/components/member/bottom-nav'
import { InstallPrompt } from '@/components/member/install-prompt'
import { MemberSidebar } from '@/components/member/sidebar'
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
  const profile = await requireMember()

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
      <MemberSidebar
        fullName={profile.full_name}
        email={profile.email}
      />

      <main
        className="relative w-full max-w-md mx-auto px-5 pb-32 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:max-w-none md:px-8 md:pb-16 md:pt-8 lg:ml-72 lg:mr-0 lg:max-w-[calc(100vw-18rem)] lg:px-10 lg:pt-10 xl:px-14 2xl:px-20"
      >
        <div className="mx-auto w-full lg:max-w-[1400px] 2xl:max-w-[1600px]">
          {children}
        </div>
      </main>

      <InstallPrompt />
      <BottomNav />
      <Toaster position="top-center" />
    </div>
  )
}
