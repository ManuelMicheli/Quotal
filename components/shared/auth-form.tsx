/**
 * Card wrapper used by every auth screen (login, signup, reset-password,
 * update-password, owner onboarding).
 *
 * Server component. The form itself is supplied by the caller as a client
 * component child — keeps the heavy `useForm` machinery out of this scope.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="text-2xl font-display tracking-tight">
          {title}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {children}
        {footer ? (
          <div className="text-sm text-muted-foreground">{footer}</div>
        ) : null}
      </CardContent>
    </Card>
  )
}
