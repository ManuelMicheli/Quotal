'use client'

import { motion } from 'framer-motion'
import { ArrowUpRightIcon } from 'lucide-react'
import Link from 'next/link'

import { LegalFooter } from '@/components/shared/legal-footer'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { Button } from '@/components/ui/button'
import { APP_NAME, APP_TAGLINE } from '@/lib/constants'

const FEATURES = [
  {
    title: 'Pagamenti automatici',
    body: 'SEPA, carta o contanti — tutto in un’unica vista.',
  },
  {
    title: 'Accessi senza badge',
    body: 'QR personale dal telefono, controllo in tempo reale.',
  },
  {
    title: 'GDPR by design',
    body: 'Dati cifrati, conservati in UE, esportabili in autonomia.',
  },
  {
    title: 'Cassa giornaliera',
    body: 'Chiusura cassa, ricevute PDF, export commercialista.',
  },
]

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
      <div
        aria-hidden="true"
        className="bg-aurora pointer-events-none fixed inset-x-0 top-0 h-[80vh]"
      />
      <div
        aria-hidden="true"
        className="bg-grain pointer-events-none fixed inset-0 opacity-30 mix-blend-multiply"
      />

      <header className="relative flex w-full items-center justify-between px-6 py-5 md:px-12 lg:px-20 xl:px-32">
        <Link href="/" aria-label="Quotal" className="font-display text-2xl">
          {APP_NAME}
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button asChild size="sm" className="rounded-full">
            <Link href="/login">
              Accedi
              <ArrowUpRightIcon size={14} />
            </Link>
          </Button>
        </div>
      </header>

      <main className="relative flex flex-1 flex-col px-6 pb-24 md:px-12 lg:px-20 xl:px-32">
        <section className="flex flex-1 flex-col items-center justify-center py-16 text-center md:py-24 lg:py-32">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground md:text-xs"
          >
            Gestione palestra · Italia
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
            className="mt-5 font-display text-6xl tracking-tight text-balance sm:text-7xl md:text-8xl lg:text-[10rem] xl:text-[12rem]"
          >
            {APP_NAME}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.25 }}
            className="mt-6 max-w-2xl text-balance text-lg text-muted-foreground md:mt-8 md:text-xl lg:text-2xl"
          >
            {APP_TAGLINE}.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.4 }}
            className="mt-10 flex w-full flex-col items-center justify-center gap-3 sm:flex-row md:mt-14"
          >
            <Button
              asChild
              size="lg"
              className="tap-shrink w-full rounded-full sm:w-auto"
            >
              <Link href="/onboarding-titolare">
                Registra la tua palestra
                <ArrowUpRightIcon size={16} />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="tap-shrink w-full rounded-full sm:w-auto"
            >
              <Link href="/login">Accedi</Link>
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.55 }}
            className="mt-4 text-xs text-muted-foreground md:text-sm"
          >
            Sei un iscritto? Chiedi al titolare il link di iscrizione della tua palestra.
          </motion.p>
        </section>

        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.55 }}
          className="grid w-full gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4 lg:gap-8"
        >
          {FEATURES.map((f) => (
            <article
              key={f.title}
              className="ring-soft rounded-3xl bg-card/85 p-6 backdrop-blur-sm md:p-8"
            >
              <p className="font-display text-xl tracking-tight md:text-2xl">
                {f.title}
              </p>
              <p className="mt-2 text-sm text-muted-foreground md:text-base">
                {f.body}
              </p>
            </article>
          ))}
        </motion.section>
      </main>

      <LegalFooter />
    </div>
  )
}
