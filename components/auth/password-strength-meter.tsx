'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

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
  const colors = [
    'bg-zinc-700',
    'bg-red-500/70',
    'bg-orange-500/70',
    'bg-yellow-500/70',
    'bg-teal-400/70',
    'bg-teal-400',
  ]

  if (!password) return null

  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            initial={false}
            animate={{ opacity: i <= visibleScore ? 1 : 0.3 }}
            className={`h-1 rounded-full ${
              i <= visibleScore ? colors[score] : 'bg-zinc-800'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-zinc-500">
        Sicurezza:{' '}
        <span className="text-zinc-300">{labels[visibleScore] || '—'}</span>
      </p>
    </div>
  )
}
