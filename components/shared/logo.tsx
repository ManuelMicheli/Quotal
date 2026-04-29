/**
 * Brand wordmark — "Quotal" set in Instrument Serif.
 *
 * Server component. Sized presets so we don't have to repeat font-size
 * tweaks across the auth screens, the dashboard header, and emails.
 */
import { cn } from '@/lib/utils'
import { APP_NAME } from '@/lib/constants'

type LogoSize = 'sm' | 'md' | 'lg'
type LogoVariant = 'default' | 'mono'

const SIZE_CLASSES: Record<LogoSize, string> = {
  sm: 'text-2xl',
  md: 'text-4xl',
  lg: 'text-6xl',
}

export function Logo({
  size = 'md',
  variant = 'default',
  className,
}: {
  size?: LogoSize
  variant?: LogoVariant
  className?: string
}) {
  return (
    <span
      className={cn(
        'font-display tracking-tight leading-none',
        SIZE_CLASSES[size],
        variant === 'mono' ? 'text-foreground' : 'text-foreground',
        className,
      )}
    >
      {APP_NAME}
    </span>
  )
}
