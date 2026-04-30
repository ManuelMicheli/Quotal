'use client'

import { motion } from 'framer-motion'

/**
 * 56×56 squared logo card. Q monogram in Instrument Serif with a faint
 * teal glow — works as a placeholder until a real SVG mark replaces it.
 */
export function QuotalLogoCard() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto mb-10"
    >
      <div className="relative flex size-14 items-center justify-center rounded-[14px] bg-zinc-900/80 ring-1 ring-white/10 backdrop-blur-sm">
        <div className="absolute inset-0 rounded-[14px] bg-gradient-to-br from-white/[0.08] to-transparent" />
        <span
          className="relative font-display text-2xl font-medium leading-none text-white"
          style={{ textShadow: '0 0 20px rgba(20, 184, 166, 0.3)' }}
        >
          Q
        </span>
      </div>
    </motion.div>
  )
}
