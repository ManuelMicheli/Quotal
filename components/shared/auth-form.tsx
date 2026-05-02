/**
 * Card wrapper used by the owner onboarding flow.
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
    <section className={cn('flex flex-col gap-8', className)}>
      <header className="space-y-3 text-center">
        <h1 className="heading-display text-foreground text-balance text-4xl md:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground text-pretty mx-auto max-w-md text-base leading-relaxed">
            {description}
          </p>
        ) : null}
      </header>
      <div className="flex flex-col gap-6">
        {children}
        {footer ? (
          <div className="text-muted-foreground text-sm">{footer}</div>
        ) : null}
      </div>
    </section>
  )
}
