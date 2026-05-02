'use client'

import { motion } from 'framer-motion'
import { MailCheck } from 'lucide-react'

import { fadeUp, listStagger, spring } from '@/lib/motion'

export function VerifyEmailHero({ email }: { email?: string }) {
  return (
    <motion.div
      variants={listStagger}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center gap-5 text-center"
    >
      <motion.div variants={fadeUp} className="relative">
        <div
          aria-hidden="true"
          className="bg-accent/30 absolute inset-0 -z-10 rounded-full blur-2xl"
        />
        <div className="bg-accent-soft ring-accent/20 relative flex size-20 items-center justify-center rounded-full ring-1">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...spring.bouncy, delay: 0.15 }}
            className="bg-accent text-accent-foreground pulse-glow flex size-14 items-center justify-center rounded-full"
          >
            <MailCheck className="size-7" aria-hidden="true" strokeWidth={2.25} />
          </motion.div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="space-y-3">
        <p className="eyebrow">Verifica email</p>
        <h1 className="heading-display text-foreground text-balance text-4xl md:text-[2.5rem]">
          Controlla la tua casella
        </h1>
      </motion.div>

      <motion.p
        variants={fadeUp}
        className="text-muted-foreground text-pretty max-w-sm text-sm leading-relaxed"
      >
        {email ? (
          <>
            Abbiamo inviato un link di verifica a{' '}
            <span className="text-foreground bg-card/80 border-border/70 inline-block rounded-sm border px-1.5 py-0.5 font-mono text-[12.5px]">
              {email}
            </span>
            . Clicca sul link per attivare il tuo account.
          </>
        ) : (
          'Abbiamo inviato un link di verifica al tuo indirizzo email. Clicca sul link per attivare il tuo account.'
        )}
      </motion.p>
    </motion.div>
  )
}
