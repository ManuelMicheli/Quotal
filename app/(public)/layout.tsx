/**
 * Public route group — no auth required.
 *
 * Hosts the `/pay/[token]` flow plus its `/success` and `/failed` screens.
 * Members never log in to pay; the token is the trust boundary, gated
 * server-side via `payment_sessions.token`.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10 sm:px-6 sm:py-16">
      {children}
    </div>
  )
}
