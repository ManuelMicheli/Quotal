'use client'

import { motion } from 'framer-motion'

import { spring } from '@/lib/motion'

/**
 * 56x56 squared logo card. Q monogram in Instrument Serif over a glass
 * surface with a subtle accent halo. Theme-aware via tokens.
 */
export function QuotalLogoCard() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={spring.gentle}
      className="mx-auto mb-8 flex justify-center"
    >
      <div className="glass relative flex size-14 items-center justify-center rounded-xl">
        <div
          aria-hidden="true"
          className="absolute -inset-3 -z-10 rounded-2xl opacity-70 blur-xl"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, color-mix(in oklab, var(--accent) 32%, transparent), transparent 70%)',
          }}
        />
        <span className="heading-display text-foreground relative text-2xl">
          Q
        </span>
      </div>
    </motion.div>
  )
}
