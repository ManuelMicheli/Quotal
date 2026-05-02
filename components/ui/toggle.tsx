"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Toggle as TogglePrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

const toggleVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium",
    "transition-[color,background-color,border-color,box-shadow,transform] duration-150 outline-none",
    "hover:bg-secondary hover:text-foreground",
    "focus-visible:ring-[3px] focus-visible:ring-ring/30",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.97]",
    "data-[state=on]:bg-accent-soft data-[state=on]:text-accent",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    "whitespace-nowrap",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-border bg-transparent shadow-[var(--shadow-1)] hover:bg-secondary",
      },
      size: {
        default: "h-9 px-2.5 min-w-9",
        sm: "h-8 px-2 min-w-8",
        lg: "h-10 px-3 min-w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
