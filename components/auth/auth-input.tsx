'use client'

import { Eye, EyeOff } from 'lucide-react'
import { forwardRef, useState, type InputHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  hideLabel?: boolean
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  function AuthInput(
    { label, error, hint, hideLabel, type = 'text', className, id, ...props },
    ref,
  ) {
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type
    const inputId =
      id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="space-y-1.5">
        {label && !hideLabel ? (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-zinc-300"
          >
            {label}
          </label>
        ) : null}

        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            aria-label={hideLabel ? label : undefined}
            aria-invalid={error ? true : undefined}
            className={cn(
              'block h-11 w-full rounded-xl bg-zinc-900/50 px-4',
              'text-sm text-zinc-50 placeholder:text-zinc-600',
              'ring-1 ring-white/[0.08] backdrop-blur-sm transition-all duration-200',
              'hover:ring-white/[0.16]',
              'focus:bg-zinc-900/70 focus:outline-none focus:ring-2 focus:ring-teal-400/60',
              error && 'ring-red-500/60 focus:ring-red-500/80',
              isPassword && 'pr-11',
              type === 'email' && 'font-mono text-[13px]',
              className,
            )}
            {...props}
          />

          {isPassword ? (
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300 focus:outline-none focus-visible:text-zinc-100"
              aria-label={
                showPassword ? 'Nascondi password' : 'Mostra password'
              }
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          ) : null}
        </div>

        {error ? (
          <p
            className="flex items-center gap-1.5 text-xs text-red-400"
            role="alert"
          >
            <span className="inline-block size-1 rounded-full bg-red-400" />
            {error}
          </p>
        ) : null}

        {hint && !error ? (
          <p className="text-xs text-zinc-500">{hint}</p>
        ) : null}
      </div>
    )
  },
)
