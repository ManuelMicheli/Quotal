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
            className="text-foreground/85 block text-sm font-medium"
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
              'border-border/80 bg-card/50 text-foreground placeholder:text-muted-foreground/60',
              'block h-11 w-full rounded-md border px-3.5 text-sm',
              'shadow-[inset_0_1px_2px_rgb(0_0_0/0.04)] backdrop-blur-md',
              'transition-[color,border-color,box-shadow,background-color] duration-200',
              'hover:border-border-strong',
              'focus:bg-card/80 focus:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30',
              'dark:bg-card/40 dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.02)]',
              error &&
                'border-destructive/60 focus-visible:border-destructive focus-visible:ring-destructive/25',
              isPassword && 'pr-11',
              className,
            )}
            {...props}
          />

          {isPassword ? (
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              tabIndex={-1}
              className="text-muted-foreground hover:text-foreground focus-visible:text-foreground absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-sm transition-colors focus:outline-none"
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
            className="text-destructive flex items-center gap-1.5 text-xs"
            role="alert"
          >
            <span className="bg-destructive inline-block size-1 rounded-full" />
            {error}
          </p>
        ) : null}

        {hint && !error ? (
          <p className="text-muted-foreground text-xs">{hint}</p>
        ) : null}
      </div>
    )
  },
)
