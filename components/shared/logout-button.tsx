'use client'

/**
 * Logout button — calls the `logoutAction` Server Action.
 *
 * Client component because we need a `useTransition` to keep the button
 * responsive while the request is in flight.
 */
import { LogOutIcon } from 'lucide-react'
import { useTransition } from 'react'

import { logoutAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'outline' | 'ghost'
type Size = 'default' | 'sm' | 'lg'

export function LogoutButton({
  variant = 'outline',
  size = 'default',
  showIcon = true,
  className,
  children,
}: {
  variant?: Variant
  size?: Size
  showIcon?: boolean
  className?: string
  children?: React.ReactNode
}) {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={pending}
      className={cn(className)}
      onClick={() => startTransition(() => logoutAction())}
    >
      {showIcon ? <LogOutIcon /> : null}
      {children ?? (pending ? 'Uscita…' : 'Esci')}
    </Button>
  )
}
