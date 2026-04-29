/**
 * Owner dashboard layout.
 *
 * Server component — runs on every request. Calls `requireOwnerOrStaff()`
 * which short-circuits with `redirect()` for anonymous users and members.
 * Loads the current gym row (RLS-scoped) and renders the sidebar/topbar
 * shell around the route content.
 */
import { OwnerSidebar } from '@/components/owner/sidebar'
import { OwnerTopbar } from '@/components/owner/topbar'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { requireOwnerOrStaff } from '@/lib/auth'

export default async function OwnerDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await requireOwnerOrStaff()

  return (
    <TooltipProvider>
      <div className="flex min-h-screen w-full bg-background">
        <OwnerSidebar
          ownerName={profile.full_name}
          ownerEmail={profile.email}
          ownerAvatarUrl={profile.avatar_url}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <OwnerTopbar
            ownerName={profile.full_name}
            ownerEmail={profile.email}
            ownerAvatarUrl={profile.avatar_url}
          />
          <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10">
            {children}
          </main>
        </div>
      </div>
      <Toaster />
    </TooltipProvider>
  )
}
