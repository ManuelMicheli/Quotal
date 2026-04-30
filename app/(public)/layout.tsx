/**
 * Public route group — no auth required.
 *
 * Hosts the `/pay/[token]` flow plus its `/success` and `/failed` screens.
 * Members never log in to pay; the token is the trust boundary, gated
 * server-side via `payment_sessions.token`.
 */
import { ThemeToggle } from '@/components/shared/theme-toggle'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-10 sm:px-6 sm:py-16">
      <div
        aria-hidden="true"
        className="bg-aurora pointer-events-none fixed inset-x-0 top-0 h-[60vh]"
      />
      <div
        aria-hidden="true"
        className="bg-grain pointer-events-none fixed inset-0 opacity-30 mix-blend-multiply"
      />
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <div className="relative">{children}</div>
    </div>
  )
}
