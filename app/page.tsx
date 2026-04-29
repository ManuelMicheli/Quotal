'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { APP_NAME, APP_TAGLINE } from '@/lib/constants'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-2xl flex-col items-center text-center">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="font-display text-7xl tracking-tight text-foreground sm:text-8xl"
          >
            {APP_NAME}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.18 }}
            className="mt-6 text-lg text-muted-foreground sm:text-xl"
          >
            {APP_TAGLINE}.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.36 }}
            className="mt-10 flex w-full flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/login?role=owner">Accedi come titolare</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href="/login?role=member">Accedi come membro</Link>
            </Button>
          </motion.div>
        </div>
      </main>

      <footer className="border-t border-border/60 px-6 py-6 text-center text-sm text-muted-foreground">
        <span>&copy; 2026 {APP_NAME}</span>
      </footer>
    </div>
  )
}
