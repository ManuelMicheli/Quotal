import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  [
    "relative grid w-full grid-cols-[0_1fr] items-start gap-y-1 rounded-lg border px-4 py-3.5 text-sm",
    "has-[>svg]:grid-cols-[calc(var(--spacing)*5)_1fr] has-[>svg]:gap-x-3",
    "[&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-card border-border text-foreground",
        accent: "bg-accent-soft border-accent/20 text-accent *:data-[slot=alert-description]:text-accent/80",
        success: "bg-success-soft border-success/20 text-success *:data-[slot=alert-description]:text-success/80",
        warning: "bg-warning-soft border-warning/30 text-warning *:data-[slot=alert-description]:text-warning/85",
        info: "bg-info-soft border-info/20 text-info *:data-[slot=alert-description]:text-info/80",
        destructive: "bg-destructive-soft border-destructive/20 text-destructive *:data-[slot=alert-description]:text-destructive/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-semibold tracking-tight",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 grid justify-items-start gap-1 text-sm text-muted-foreground [&_p]:leading-relaxed",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
