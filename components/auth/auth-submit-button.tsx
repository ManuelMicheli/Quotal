'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { spring } from '@/lib/motion'

export function AuthSubmitButton({
  children,
  pending,
}: {
  children: ReactNode
  pending?: boolean
}) {
  return (
    <motion.div
      whileHover={!pending ? { scale: 1.005 } : undefined}
      whileTap={!pending ? { scale: 0.985 } : undefined}
      transition={spring.press}
    >
      <Button
        type="submit"
        disabled={pending}
        variant="accent"
        size="lg"
        className="elev-2 h-11 w-full font-semibold"
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
      </Button>
    </motion.div>
  )
}
