'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

import { ease, duration, spring } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * Lazy-loads zxcvbn so the ~400KB dictionary stays out of the initial
 * bundle and only ships once the user starts typing a password.
 */
export function PasswordStrengthMeter({ password }: { password: string }) {
  const [score, setScore] = useState(0)

  useEffect(() => {
    if (!password) return

    let cancelled = false
    import('zxcvbn').then(({ default: zxcvbn }) => {
      if (cancelled) return
      const result = zxcvbn(password)
      setScore(result.score)
    })

    return () => {
      cancelled = true
    }
  }, [password])

  const visibleScore = password ? score : 0
  const labels = ['', 'Debole', 'Bassa', 'Media', 'Forte', 'Robusta']
  const tones = [
    'text-muted-foreground',
    'text-destructive',
    'text-warning',
    'text-warning',
    'text-success',
    'text-success',
  ]
  const fills = [
    'bg-border',
    'bg-destructive',
    'bg-warning',
    'bg-warning',
    'bg-success',
    'bg-success',
  ]

  return (
    <AnimatePresence>
      {password ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: duration.fast, ease: ease.soft }}
          className="space-y-2 overflow-hidden pt-1"
          aria-live="polite"
        >
          <div
            className="grid grid-cols-4 gap-1.5"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={4}
            aria-valuenow={visibleScore}
            aria-label="Sicurezza password"
          >
            {[1, 2, 3, 4].map((i) => (
              <motion.span
                key={i}
                initial={false}
                animate={{
                  opacity: i <= visibleScore ? 1 : 0.35,
                  scaleX: i <= visibleScore ? 1 : 0.95,
                }}
                transition={spring.snappy}
                className={cn(
                  'h-1 origin-left rounded-full',
                  i <= visibleScore ? fills[visibleScore] : 'bg-border/60',
                )}
              />
            ))}
          </div>
          <div className="text-xs">
            <span className="text-muted-foreground">Sicurezza:</span>{' '}
            <span className={cn('font-medium', tones[visibleScore])}>
              {labels[visibleScore] || '—'}
            </span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
