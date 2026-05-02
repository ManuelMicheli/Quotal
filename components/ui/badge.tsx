import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  [
    "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent",
    "px-2.5 py-0.5 text-xs font-medium whitespace-nowrap leading-none tracking-tight",
    "transition-[color,background-color,box-shadow] duration-150",
    "focus-visible:ring-[3px] focus-visible:ring-ring/30",
    "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
    "[&>svg]:pointer-events-none [&>svg]:size-3",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground border-border/60 [a&]:hover:bg-secondary/80",
        destructive: "bg-destructive-soft text-destructive border-destructive/20 [a&]:hover:bg-destructive-soft/80",
        success: "bg-success-soft text-success border-success/20 [a&]:hover:bg-success-soft/80",
        warning: "bg-warning-soft text-warning border-warning/30 [a&]:hover:bg-warning-soft/80",
        info: "bg-info-soft text-info border-info/20 [a&]:hover:bg-info-soft/80",
        accent: "bg-accent-soft text-accent border-accent/20 [a&]:hover:bg-accent-soft/80",
        outline: "border-border text-foreground/80 [a&]:hover:bg-secondary [a&]:hover:text-foreground",
        ghost: "[a&]:hover:bg-secondary [a&]:hover:text-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
        solid: "bg-foreground text-background [a&]:hover:bg-foreground/90",
      },
      size: {
        default: "h-5 px-2.5 text-[0.6875rem]",
        sm: "h-4 px-1.5 text-[0.625rem] gap-0.5",
        lg: "h-6 px-3 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      data-size={size}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
