import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * SectionHeader — sub-section title inside a dashboard page or member screen.
 * Smaller scale than PageHeader; pairs with eyebrow + optional action.
 */
function SectionHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="section-header"
      className={cn(
        "flex flex-col gap-3 pb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4",
        className
      )}
      {...props}
    />
  )
}

function SectionHeaderHeading({
  className,
  as: Tag = "h2",
  ...props
}: React.ComponentProps<"h2"> & { as?: "h2" | "h3" }) {
  return (
    <Tag
      data-slot="section-header-heading"
      className={cn(
        "text-balance text-lg font-semibold tracking-tight sm:text-xl",
        className
      )}
      {...props}
    />
  )
}

function SectionHeaderDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="section-header-description"
      className={cn("max-w-xl text-pretty text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function SectionHeaderContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="section-header-content"
      className={cn("flex min-w-0 flex-col gap-1", className)}
      {...props}
    />
  )
}

function SectionHeaderActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="section-header-actions"
      className={cn("flex shrink-0 flex-wrap items-center gap-2", className)}
      {...props}
    />
  )
}

export {
  SectionHeader,
  SectionHeaderHeading,
  SectionHeaderDescription,
  SectionHeaderContent,
  SectionHeaderActions,
}
