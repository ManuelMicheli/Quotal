'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

export function AuthSubmitButton({
  children,
  pending,
}: {
  children: ReactNode
  pending?: boolean
}) {
  return (
    <motion.button
      type="submit"
      disabled={pending}
      whileHover={!pending ? { scale: 1.01 } : undefined}
      whileTap={!pending ? { scale: 0.99 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="relative flex h-11 w-full items-center justify-center rounded-xl bg-zinc-100 text-sm font-semibold text-zinc-900 ring-1 ring-zinc-200 transition-all duration-200 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
    >
      {pending ? (
        <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeOpacity="0.25"
            strokeWidth="2"
          />
          <path
            d="M22 12a10 10 0 0 0-10-10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        children
      )}
    </motion.button>
  )
}
