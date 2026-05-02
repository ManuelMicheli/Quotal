/**
 * Kiosk shell — forces permanent dark mode regardless of the user's
 * `next-themes` preference. Members scan from any environment, but the
 * tablet itself is wall-mounted, so dark is the right surface 100% of
 * the time.
 *
 * The wrapper applies the `.dark` class scoped to this subtree, which
 * activates the dark CSS variables defined in `globals.css` without
 * touching the theme provider state.
 */
export default function AccessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="dark">
      <div className="min-h-screen bg-background text-foreground">
        {children}
      </div>
    </div>
  )
}
