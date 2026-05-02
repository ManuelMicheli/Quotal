"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type Step = {
  id: string
  title: React.ReactNode
  description?: React.ReactNode
}

type StepperProps = {
  steps: Step[]
  /** 0-based index of the current step. Past steps render as completed. */
  current: number
  className?: string
  orientation?: "horizontal" | "vertical"
}

function Stepper({
  steps,
  current,
  className,
  orientation = "horizontal",
}: StepperProps) {
  return (
    <ol
      data-slot="stepper"
      data-orientation={orientation}
      className={cn(
        "flex w-full",
        orientation === "horizontal"
          ? "flex-row items-start gap-3"
          : "flex-col gap-4",
        className
      )}
    >
      {steps.map((step, index) => {
        const status =
          index < current ? "complete" : index === current ? "current" : "upcoming"
        const isLast = index === steps.length - 1

        return (
          <li
            key={step.id}
            data-status={status}
            className={cn(
              "group/step flex min-w-0 gap-3",
              orientation === "horizontal"
                ? "flex-1 flex-col items-start"
                : "flex-row items-start"
            )}
          >
            <div
              className={cn(
                "flex items-center",
                orientation === "horizontal" ? "w-full" : ""
              )}
            >
              <span
                aria-current={status === "current" ? "step" : undefined}
                className={cn(
                  "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-all duration-300",
                  status === "complete" && "bg-accent text-accent-foreground",
                  status === "current" &&
                    "border-2 border-accent bg-card text-accent shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent)_18%,transparent)]",
                  status === "upcoming" &&
                    "border border-border bg-muted text-muted-foreground"
                )}
              >
                {status === "complete" ? (
                  <CheckIcon className="size-3.5" />
                ) : (
                  index + 1
                )}
              </span>
              {!isLast && orientation === "horizontal" && (
                <span
                  aria-hidden
                  className={cn(
                    "ml-2 mr-1 h-px flex-1 transition-colors duration-300",
                    index < current ? "bg-accent" : "bg-border"
                  )}
                />
              )}
              {!isLast && orientation === "vertical" && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-px",
                    index < current ? "bg-accent" : "bg-border"
                  )}
                />
              )}
            </div>
            <div
              className={cn(
                "flex min-w-0 flex-col gap-0.5",
                orientation === "horizontal" ? "" : "flex-1 pb-2"
              )}
            >
              <span
                className={cn(
                  "truncate text-sm font-medium tracking-tight transition-colors duration-200",
                  status === "complete" || status === "current"
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {step.title}
              </span>
              {step.description && (
                <span className="truncate text-xs text-muted-foreground">
                  {step.description}
                </span>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export { Stepper }
export type { Step, StepperProps }
