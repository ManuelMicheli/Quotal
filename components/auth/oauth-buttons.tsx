'use client'

import { motion } from 'framer-motion'
import { useState, useTransition, type ReactNode } from 'react'

import { signInWithProviderAction } from '@/app/actions/auth'
import { AppleIcon, GoogleIcon } from '@/components/auth/brand-icons'
import {
  enabledOAuthProviders,
  type OAuthProvider,
} from '@/lib/auth/providers'

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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
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
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!enabled || loading}
      whileHover={enabled && !loading ? { scale: 1.01 } : undefined}
      whileTap={enabled && !loading ? { scale: 0.99 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="group relative flex h-11 items-center justify-center gap-2.5 rounded-xl bg-zinc-900/60 px-4 ring-1 ring-white/[0.08] backdrop-blur-sm transition-all duration-200 hover:bg-zinc-800/80 hover:ring-white/[0.16] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-zinc-900/60 disabled:hover:ring-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
    >
      {loading ? (
        <Spinner className="size-4 text-zinc-100" />
      ) : (
        <>
          {icon}
          <span className="text-sm font-medium text-zinc-100">{label}</span>
          {!enabled ? (
            <span className="ml-1 rounded-md bg-zinc-700/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-300">
              Presto
            </span>
          ) : null}
        </>
      )}
    </motion.button>
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
