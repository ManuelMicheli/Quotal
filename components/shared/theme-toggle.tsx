'use client'

/**
 * Animated three-state theme toggle (system / light / dark).
 *
 * Two visual variants:
 *   - `icon`  — circular icon-only button. Cycles light → dark → system on
 *               click. Used in the member shell top-right and other tight
 *               spaces.
 *   - `segmented` — labeled segmented control with three options. Used on
 *               the profile page where the affordance benefits from being
 *               explicit.
 */
import { MonitorIcon, MoonIcon, SunIcon, type LucideIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

type Mode = 'light' | 'dark' | 'system'

const MODES: ReadonlyArray<{ value: Mode; label: string; Icon: LucideIcon }> = [
  { value: 'light', label: 'Chiaro', Icon: SunIcon },
  { value: 'dark', label: 'Scuro', Icon: MoonIcon },
  { value: 'system', label: 'Sistema', Icon: MonitorIcon },
]

function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])
  return mounted
}

export function ThemeToggle({
  variant = 'icon',
  className,
}: {
  variant?: 'icon' | 'segmented'
  className?: string
}) {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const mounted = useMounted()

  if (variant === 'segmented') {
    return (
      <div
        role="radiogroup"
        aria-label="Tema"
        className={cn(
          'inline-flex w-full items-center gap-1 rounded-full bg-muted/60 p-1',
          className,
        )}
      >
        {MODES.map(({ value, label, Icon }) => {
          const active = mounted && theme === value
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(value)}
              className={cn(
                'tap-shrink relative inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-medium transition-colors',
                active
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          )
        })}
      </div>
    )
  }

  // Icon variant: cycles light → dark → system on tap.
  const next: Mode =
    theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
  const showDark = mounted ? resolvedTheme === 'dark' : false

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Cambia tema (attuale: ${theme ?? 'sistema'})`}
      className={cn(
        'tap-shrink relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-card/80 text-foreground backdrop-blur transition-colors hover:bg-muted',
        className,
      )}
    >
      <SunIcon
        size={16}
        className={cn(
          'absolute transition-all duration-500',
          showDark
            ? 'rotate-90 scale-0 opacity-0'
            : 'rotate-0 scale-100 opacity-100',
        )}
      />
      <MoonIcon
        size={16}
        className={cn(
          'absolute transition-all duration-500',
          showDark
            ? 'rotate-0 scale-100 opacity-100'
            : '-rotate-90 scale-0 opacity-0',
        )}
      />
    </button>
  )
}
