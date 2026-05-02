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
import { requireOwnerOrStaff, requireUser } from '@/lib/auth'
import { getOwnerNotifications } from '@/lib/queries/notifications'

export default async function OwnerDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Fan out: once we know the auth user.id we can run the profile fetch
  // and the notifications query in parallel instead of one-after-the-other.
  // Both `requireUser` and `requireOwnerOrStaff` are wrapped in
  // `react.cache`, so the second call reuses the first's result.
  const user = await requireUser()
  const [profile, { notifications, unread }] = await Promise.all([
    requireOwnerOrStaff(),
    getOwnerNotifications(user.id, 20),
  ])

  return (
    <TooltipProvider>
      <div className="relative flex min-h-screen w-full bg-background text-foreground">
        <div
          aria-hidden="true"
          className="bg-aurora-soft pointer-events-none fixed inset-x-0 top-0 h-[60vh] opacity-90"
        />
        <div
          aria-hidden="true"
          className="bg-grain pointer-events-none fixed inset-0 opacity-[0.18] mix-blend-multiply dark:opacity-[0.08]"
        />

        <OwnerSidebar
          ownerName={profile.full_name}
          ownerEmail={profile.email}
          ownerAvatarUrl={profile.avatar_url}
        />
        <div className="relative flex min-w-0 flex-1 flex-col">
          <OwnerTopbar
            ownerName={profile.full_name}
            ownerEmail={profile.email}
            ownerAvatarUrl={profile.avatar_url}
            initialNotifications={notifications}
            initialUnread={unread}
          />
          <main className="relative flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-8 lg:px-10 lg:pt-10 xl:px-14">
            <div className="mx-auto w-full max-w-[1400px]">{children}</div>
          </main>
        </div>
      </div>
      <Toaster />
    </TooltipProvider>
  )
}
