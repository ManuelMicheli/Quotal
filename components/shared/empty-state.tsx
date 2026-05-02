import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * EmptyState — graceful zero-data placeholder.
 *
 * Variants:
 *   default — soft surface, subtle. Default for inline empty results.
 *   bordered — dashed border, used inside cards.
 *   hero — full-bleed, used as the only content of a screen.
 */
const emptyStateVariants = cva(
  "flex flex-col items-center justify-center text-center gap-4",
  {
    variants: {
      variant: {
        default: "py-12 px-6",
        bordered:
          "py-12 px-6 rounded-xl border border-dashed border-border bg-muted/30",
        hero: "py-20 px-6 rounded-2xl bg-mesh",
      },
      size: {
        sm: "py-8 gap-3",
        default: "py-12 gap-4",
        lg: "py-20 gap-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type EmptyStateProps = Omit<React.ComponentProps<"div">, "title"> &
  VariantProps<typeof emptyStateVariants> & {
    icon?: React.ReactNode
    title: React.ReactNode
    description?: React.ReactNode
    action?: React.ReactNode
  }

function EmptyState({
  className,
  variant,
  size,
  icon,
  title,
  description,
  action,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(emptyStateVariants({ variant, size }), className)}
      {...props}
    >
      {icon && (
        <div
          data-slot="empty-state-icon"
          className="flex size-12 items-center justify-center rounded-xl bg-card text-muted-foreground shadow-[var(--shadow-1)] [&_svg]:size-5"
        >
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <p
          data-slot="empty-state-title"
          className="text-balance text-base font-semibold tracking-tight text-foreground"
        >
          {title}
        </p>
        {description && (
          <p
            data-slot="empty-state-description"
            className="max-w-sm text-pretty text-sm text-muted-foreground"
          >
            {description}
          </p>
        )}
      </div>
      {action && (
        <div data-slot="empty-state-action" className="pt-1">
          {action}
        </div>
      )}
    </div>
  )
}

export { EmptyState, emptyStateVariants }
