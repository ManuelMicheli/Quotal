/**
 * Aurora + mesh + grain backdrop for the auth pages.
 *
 * Server component (no parallax — keeps Lighthouse + reduced-motion clean).
 * All visual treatment lives in `app/globals.css` utilities so dark/light
 * theming flips together with the rest of the app.
 */
export function AuthBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="bg-mesh absolute inset-0" />
      <div className="bg-aurora absolute inset-x-0 top-0 h-[80vh] opacity-90" />
      <div className="bg-grain absolute inset-0 opacity-[0.35] mix-blend-overlay" />

      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 50%, transparent 0%, transparent 55%, color-mix(in oklab, var(--background) 65%, transparent) 100%)',
        }}
      />
    </div>
  )
}
