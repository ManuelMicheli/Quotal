'use client'

/**
 * App-wide theme provider.
 *
 * Wraps `next-themes` with the project's defaults: class-based switching
 * (matches the `.dark` selector in globals.css), system preference as
 * default, smooth disabled-on-change to avoid flashing during route
 * transitions.
 */
import { ThemeProvider as NextThemesProvider } from 'next-themes'

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
