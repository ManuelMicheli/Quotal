/**
 * Quotal brand tokens.
 *
 * Source of truth for colors, fonts, and radii used across the app.
 * These mirror the CSS custom properties exposed in `app/globals.css`
 * (Tailwind v4 `@theme inline`). When updating one, update the other.
 */

export const brand = {
  primary: '#0A0A0A',
  primaryForeground: '#FAFAFA',
  accent: '#0F766E',
  accentForeground: '#FFFFFF',
  background: '#FAFAF9',
  foreground: '#0A0A0A',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  muted: '#F5F5F4',
  mutedForeground: '#57534E',
  border: '#E7E5E4',
} as const

export const fonts = {
  sans: 'Inter Variable, system-ui, sans-serif',
  display: '"Instrument Serif", Georgia, serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
} as const

export const radii = {
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
} as const

export type BrandToken = keyof typeof brand
export type FontToken = keyof typeof fonts
export type RadiusToken = keyof typeof radii
