import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap select-none",
    "outline-none transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-150",
    "focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "active:scale-[0.97] active:transition-[transform] active:duration-75",
    "disabled:pointer-events-none disabled:opacity-50",
    "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[var(--shadow-1)] hover:bg-primary/90 hover:shadow-[var(--shadow-2)]",
        destructive:
          "bg-destructive text-white shadow-[var(--shadow-1)] hover:bg-destructive/92 hover:shadow-[var(--shadow-2)] focus-visible:ring-destructive/30 dark:bg-destructive/85",
        outline:
          "border border-border bg-background shadow-[var(--shadow-1)] hover:bg-secondary hover:border-border-strong hover:text-foreground dark:bg-card/40 dark:hover:bg-card/70",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "text-foreground/80 hover:bg-secondary hover:text-foreground dark:hover:bg-card/60",
        link:
          "text-primary underline-offset-4 hover:underline focus-visible:ring-0 focus-visible:ring-offset-0 active:scale-100",
        accent:
          "bg-accent text-accent-foreground shadow-[var(--shadow-1)] hover:bg-accent/92 hover:shadow-[var(--shadow-2)]",
        soft:
          "bg-accent-soft text-accent hover:bg-accent-muted dark:text-accent-foreground",
        glass:
          "glass text-foreground hover:bg-card/90",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3.5",
        xs: "h-7 gap-1 rounded-sm px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5 text-[0.8125rem]",
        lg: "h-11 rounded-lg px-6 text-[0.9375rem] has-[>svg]:px-5",
        xl: "h-12 rounded-lg px-7 text-base has-[>svg]:px-6",
        pill: "h-9 rounded-full px-4",
        icon: "size-10",
        "icon-xs": "size-7 rounded-sm [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
