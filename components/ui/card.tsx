import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Variants:
 *   default     — resting card, hairline border, soft shadow.
 *   elevated    — higher shadow, more depth (analytics, hero stat cards).
 *   glass       — frosted, used over imagery or aurora backdrops.
 *   outline     — flat, border-only (sub-cards inside a parent card).
 *   interactive — adds hover lift + cursor pointer for clickable cards.
 *   hero        — full-bleed gradient hero, used on featured surfaces.
 */
const cardVariants = cva(
  "flex flex-col gap-6 text-card-foreground py-6 transition-[transform,box-shadow,border-color] duration-300",
  {
    variants: {
      variant: {
        default: "rounded-xl border border-border bg-card shadow-[var(--shadow-1)]",
        elevated: "rounded-xl border border-border bg-card shadow-[var(--shadow-2)]",
        glass: "rounded-xl glass",
        outline: "rounded-xl border border-border bg-transparent shadow-none",
        interactive:
          "rounded-xl border border-border bg-card shadow-[var(--shadow-1)] cursor-pointer hover:-translate-y-0.5 hover:shadow-[var(--shadow-3)] hover:border-border-strong active:translate-y-0 active:shadow-[var(--shadow-1)] active:transition-[transform,box-shadow] active:duration-100",
        hero:
          "rounded-2xl border border-border bg-card shadow-[var(--shadow-3)] overflow-hidden",
      },
      tone: {
        none: "",
        accent:
          "border-accent/20 bg-gradient-to-br from-accent-soft to-card",
        success:
          "border-success/20 bg-gradient-to-br from-success-soft to-card",
        warning:
          "border-warning/20 bg-gradient-to-br from-warning-soft to-card",
        destructive:
          "border-destructive/20 bg-gradient-to-br from-destructive-soft to-card",
        info:
          "border-info/20 bg-gradient-to-br from-info-soft to-card",
        contrast:
          "border-foreground/10 bg-foreground text-background dark:bg-card",
      },
    },
    defaultVariants: {
      variant: "default",
      tone: "none",
    },
  }
)

function Card({
  className,
  variant,
  tone,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      data-variant={variant ?? "default"}
      data-tone={tone ?? "none"}
      className={cn(cardVariants({ variant, tone }), className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-base leading-tight font-semibold tracking-tight", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  cardVariants,
}
