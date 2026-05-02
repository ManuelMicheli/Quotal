import * as React from "react"
import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type Trend = "up" | "down" | "neutral"

type StatCardProps = React.ComponentProps<"div"> & {
  label: React.ReactNode
  value: React.ReactNode
  /** Optional sub-line — e.g. previous period comparison. */
  hint?: React.ReactNode
  /** Optional delta string — e.g. "+12.4%". */
  delta?: React.ReactNode
  /** Drives delta color + icon. */
  trend?: Trend
  /** Optional leading icon rendered in a soft chip. */
  icon?: React.ReactNode
  /** Optional small chart / sparkline rendered to the right of the value. */
  chart?: React.ReactNode
  /** Optional accent color for emphasis. */
  tone?: "default" | "accent" | "success" | "warning" | "destructive"
}

const trendIcon: Record<Trend, React.ReactNode> = {
  up: <ArrowUpRightIcon className="size-3" />,
  down: <ArrowDownRightIcon className="size-3" />,
  neutral: <MinusIcon className="size-3" />,
}

const trendColor: Record<Trend, string> = {
  up: "bg-success-soft text-success",
  down: "bg-destructive-soft text-destructive",
  neutral: "bg-muted text-muted-foreground",
}

function StatCard({
  className,
  label,
  value,
  hint,
  delta,
  trend = "neutral",
  icon,
  chart,
  tone = "default",
  ...props
}: StatCardProps) {
  return (
    <Card
      data-slot="stat-card"
      data-tone={tone}
      className={cn(
        "group/stat relative gap-0 overflow-hidden py-5 transition-colors duration-200 hover:border-border-strong",
        tone === "accent" && "border-accent/20",
        tone === "success" && "border-success/20",
        tone === "warning" && "border-warning/30",
        tone === "destructive" && "border-destructive/20",
        className
      )}
      {...props}
    >
      <CardContent className="flex flex-col gap-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {icon && (
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4",
                  tone === "accent" && "bg-accent-soft text-accent",
                  tone === "success" && "bg-success-soft text-success",
                  tone === "warning" && "bg-warning-soft text-warning",
                  tone === "destructive" && "bg-destructive-soft text-destructive"
                )}
              >
                {icon}
              </div>
            )}
            <span className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
          </div>
          {delta && (
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.6875rem] font-semibold leading-none",
                trendColor[trend]
              )}
            >
              {trendIcon[trend]}
              {delta}
            </span>
          )}
        </div>
        <div className="flex items-end justify-between gap-3">
          <p className="number text-3xl font-semibold leading-none tracking-tight text-foreground">
            {value}
          </p>
          {chart && <div className="shrink-0">{chart}</div>}
        </div>
        {hint && (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}
      </CardContent>
    </Card>
  )
}

export { StatCard }
export type { StatCardProps }
