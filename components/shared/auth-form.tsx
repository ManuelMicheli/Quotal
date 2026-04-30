/**
 * Card wrapper used by every auth screen (login, signup, reset-password,
 * update-password, owner onboarding).
 *
 * Server component. The form itself is supplied by the caller as a client
 * component child — keeps the heavy `useForm` machinery out of this scope.
 */
import { cn } from '@/lib/utils'

export function AuthForm({
  title,
  description,
  children,
  footer,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'ring-elevated rounded-[28px] bg-card/95 p-6 backdrop-blur-sm md:p-8',
        className,
      )}
    >
      <header className="space-y-2">
        <h1 className="font-display text-3xl tracking-tight md:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </header>
      <div className="mt-6 flex flex-col gap-6">
        {children}
        {footer ? (
          <div className="text-sm text-muted-foreground">{footer}</div>
        ) : null}
      </div>
    </section>
  )
}
