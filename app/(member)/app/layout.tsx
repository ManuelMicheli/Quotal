/**
 * Layout for the member PWA.
 *
 * Server component. Calls `requireMember()` so every nested page gets the
 * profile guard "for free". Renders:
 *   - the offline banner (top, conditional)
 *   - the page content with bottom padding to clear the bottom nav
 *   - the install-prompt (above the bottom nav, conditional)
 *   - the bottom nav (sticky, fixed)
 *   - the SW registration shim (mounted once, no UI)
 *
 * Min-screen + flex layout keeps short pages aligned to the top of the
 * viewport on mobile. The `pb-24` reserves room for the 64px-tall bottom
 * nav + the iPhone home-indicator safe area.
 */
import type { Metadata, Viewport } from 'next'

import { BottomNav } from '@/components/member/bottom-nav'
import { InstallPrompt } from '@/components/member/install-prompt'
import { OnlineBanner } from '@/components/member/online-banner'
import { ServiceWorkerRegister } from '@/components/member/sw-register'
import { Toaster } from '@/components/ui/sonner'
import { requireMember } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'La tua palestra',
  // Help iOS Safari pick the right colour for the status bar in PWA mode.
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
  // Side-effect only — `requireMember` redirects on missing role / no
  // session. Doesn't need to be awaited's value here; nested pages call
  // `requireMember()` again to actually use the profile.
  await requireMember()

  return (
    <div className="relative min-h-dvh bg-gradient-to-b from-stone-50 to-stone-100 text-foreground">
      <ServiceWorkerRegister />
      <OnlineBanner />
      <main
        className="mx-auto w-full max-w-md px-4 pb-24 pt-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
      >
        {children}
      </main>
      <InstallPrompt />
      <BottomNav />
      <Toaster position="top-center" />
    </div>
  )
}
