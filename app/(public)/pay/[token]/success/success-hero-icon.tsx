'use client'

import { motion } from 'framer-motion'
import * as React from 'react'

import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'

type Tone = 'success' | 'warning'

const toneClasses: Record<
  Tone,
  { surface: string; halo: string; icon: string }
> = {
  success: {
    surface: 'bg-success-soft text-success ring-success/20',
    halo: 'bg-success/30',
    icon: 'text-success',
  },
  warning: {
    surface: 'bg-warning-soft text-warning ring-warning/20',
    halo: 'bg-warning/25',
    icon: 'text-warning',
  },
}

export function SuccessHeroIcon({
  tone,
  icon,
}: {
  tone: Tone
  icon: React.ReactNode
}) {
  const t = toneClasses[tone]
  return (
    <div className="relative flex items-center justify-center">
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute size-32 rounded-full blur-2xl pulse-glow',
          t.halo,
        )}
      />
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={spring.bouncy}
        className={cn(
          'relative flex size-24 items-center justify-center rounded-full ring-1 ring-inset',
          t.surface,
        )}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...spring.bouncy, delay: 0.12 }}
          className={cn('[&_svg]:size-12', t.icon)}
        >
          {icon}
        </motion.div>
      </motion.div>
    </div>
  )
}
