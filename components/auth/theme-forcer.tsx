'use client'

import { useEffect } from 'react'

/**
 * Forces a theme on the auth pages independent of the user's site-wide
 * preference. Restores whatever was active before on unmount so the
 * dark/light transition into the app stays clean.
 */
export function ThemeForcer({ theme }: { theme: 'dark' | 'light' }) {
  useEffect(() => {
    const html = document.documentElement
    const hadDark = html.classList.contains('dark')
    const previous = html.getAttribute('data-theme')

    html.setAttribute('data-theme', theme)
    html.classList.toggle('dark', theme === 'dark')

    return () => {
      if (previous) {
        html.setAttribute('data-theme', previous)
      } else {
        html.removeAttribute('data-theme')
      }
      html.classList.toggle('dark', hadDark)
    }
  }, [theme])

  return null
}
