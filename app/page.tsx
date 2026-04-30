'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

import { LegalFooter } from '@/components/shared/legal-footer'
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
            <Button
              asChild
              size="lg"
              className="w-full transition-transform active:scale-[0.97] sm:w-auto"
            >
              <Link href="/login?role=owner">Accedi come titolare</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full transition-transform active:scale-[0.97] sm:w-auto"
            >
              <Link href="/login?role=member">Accedi come membro</Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.6 }}
            className="mt-16 grid w-full grid-cols-1 gap-6 text-left sm:grid-cols-3"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">
                Pagamenti automatici
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                SEPA, carta o contanti — tutto in un&apos;unica vista.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Accessi senza badge
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                QR personale dal telefono, controllo in tempo reale.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                100% conforme GDPR
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Dati cifrati, conservati in UE, esportabili in autonomia.
              </p>
            </div>
          </motion.div>
        </div>
      </main>

      <LegalFooter />
    </div>
  )
}
