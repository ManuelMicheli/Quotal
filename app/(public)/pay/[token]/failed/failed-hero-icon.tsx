'use client'

import { motion } from 'framer-motion'
import * as React from 'react'

import { spring } from '@/lib/motion'

export function FailedHeroIcon({ icon }: { icon: React.ReactNode }) {
  return (
    <div className="relative flex items-center justify-center">
      <span
        aria-hidden
        className="pointer-events-none absolute size-32 rounded-full bg-destructive/25 blur-2xl pulse-glow"
      />
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={spring.bouncy}
        className="relative flex size-24 items-center justify-center rounded-full bg-destructive-soft text-destructive ring-1 ring-inset ring-destructive/20"
      >
        <motion.div
          initial={{ rotate: -8, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ ...spring.bouncy, delay: 0.12 }}
          className="[&_svg]:size-12"
        >
          {icon}
        </motion.div>
      </motion.div>
    </div>
  )
}
