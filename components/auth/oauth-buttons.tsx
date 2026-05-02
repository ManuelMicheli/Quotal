'use client'

import { motion } from 'framer-motion'
import { useState, useTransition, type ReactNode } from 'react'

import { signInWithProviderAction } from '@/app/actions/auth'
import { AppleIcon, GoogleIcon } from '@/components/auth/brand-icons'
import { Button } from '@/components/ui/button'
import {
  enabledOAuthProviders,
  type OAuthProvider,
} from '@/lib/auth/providers'
import { fadeUp, listStagger, spring } from '@/lib/motion'

export function OAuthButtons({
  next,
  gymSlug,
}: {
  next?: string
  gymSlug?: string
}) {
  const [pending, startTransition] = useTransition()
  const [activeProvider, setActiveProvider] = useState<OAuthProvider | null>(
    null,
  )

  const handleClick = (provider: OAuthProvider) => {
    if (!enabledOAuthProviders[provider]) return
    setActiveProvider(provider)
    startTransition(async () => {
      await signInWithProviderAction(provider, next, gymSlug)
    })
  }

  return (
    <motion.div
      variants={listStagger}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      <OAuthButton
        icon={<GoogleIcon className="size-4" />}
        label="Continua con Google"
        enabled={enabledOAuthProviders.google}
        loading={pending && activeProvider === 'google'}
        onClick={() => handleClick('google')}
      />
      <OAuthButton
        icon={<AppleIcon className="size-4" />}
        label="Continua con Apple"
        enabled={enabledOAuthProviders.apple}
        loading={pending && activeProvider === 'apple'}
        onClick={() => handleClick('apple')}
      />
    </motion.div>
  )
}

function OAuthButton({
  icon,
  label,
  enabled,
  loading,
  onClick,
}: {
  icon: ReactNode
  label: string
  enabled: boolean
  loading: boolean
  onClick: () => void
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={enabled && !loading ? { y: -1 } : undefined}
      whileTap={enabled && !loading ? { scale: 0.985 } : undefined}
      transition={spring.press}
    >
      <Button
        type="button"
        onClick={onClick}
        disabled={!enabled || loading}
        variant="outline"
        size="lg"
        className="bg-card/40 hover:bg-card/80 dark:bg-card/30 dark:hover:bg-card/60 h-11 w-full gap-2.5 backdrop-blur-md"
      >
        {loading ? (
          <Spinner className="text-foreground size-4" />
        ) : (
          <>
            {icon}
            <span className="text-foreground text-sm font-medium">{label}</span>
            {!enabled ? (
              <span className="bg-muted text-muted-foreground ml-1 rounded-sm px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">
                Presto
              </span>
            ) : null}
          </>
        )}
      </Button>
    </motion.div>
  )
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
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
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 12 12"
          to="360 12 12"
          dur="0.8s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  )
}
