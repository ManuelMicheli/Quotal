import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * PageHeader — Apple-grade titling block for dashboard pages.
 *
 * Layout: optional eyebrow + title + description on the left, action slot
 * on the right. Collapses to single column on mobile.
 */
function PageHeader({
  className,
  ...props
}: React.ComponentProps<"header">) {
  return (
    <header
      data-slot="page-header"
      className={cn(
        "flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-6",
        className
      )}
      {...props}
    />
  )
}

function PageHeaderHeading({
  className,
  as: Tag = "h1",
  ...props
}: React.ComponentProps<"h1"> & { as?: "h1" | "h2" }) {
  return (
    <Tag
      data-slot="page-header-heading"
      className={cn(
        "text-balance text-2xl font-semibold tracking-tight sm:text-3xl",
        className
      )}
      {...props}
    />
  )
}

function PageHeaderEyebrow({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-header-eyebrow"
      className={cn("eyebrow", className)}
      {...props}
    />
  )
}

function PageHeaderDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="page-header-description"
      className={cn(
        "max-w-2xl text-pretty text-sm text-muted-foreground sm:text-[0.9375rem]",
        className
      )}
      {...props}
    />
  )
}

function PageHeaderContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-header-content"
      className={cn("flex min-w-0 flex-col gap-1.5", className)}
      {...props}
    />
  )
}

function PageHeaderActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-header-actions"
      className={cn(
        "flex shrink-0 flex-wrap items-center gap-2",
        className
      )}
      {...props}
    />
  )
}

export {
  PageHeader,
  PageHeaderHeading,
  PageHeaderEyebrow,
  PageHeaderDescription,
  PageHeaderContent,
  PageHeaderActions,
}
