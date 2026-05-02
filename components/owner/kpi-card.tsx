'use client'

/**
 * Hero KPI card for the dashboard home.
 *
 * Client component: hosts Framer Motion entry animation and Recharts mini
 * sparkline / bar chart. Numbers are rendered server-side (passed as props)
 * so we never client-fetch.
 */
import { motion } from 'framer-motion'
import { ArrowDownRightIcon, ArrowRightIcon, ArrowUpRightIcon } from 'lucide-react'
import * as React from 'react'
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer } from 'recharts'

import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'

type SparklineDatum = { date: string; value: number }
type BarDatum = { hour: number; count: number }

export type KpiCardProps = {
  title: string
  value: string
  subtitle?: React.ReactNode
  trend?: number | null
  delay?: number
  sparkline?: SparklineDatum[]
  bars?: BarDatum[]
  emphasize?: boolean
}

export function KpiCard({
  title,
  value,
  subtitle,
  trend,
  delay = 0,
  sparkline,
  bars,
  emphasize = false,
}: KpiCardProps) {
  const TrendIcon =
    trend === null || trend === undefined
      ? null
      : trend > 0
        ? ArrowUpRightIcon
        : trend < 0
          ? ArrowDownRightIcon
          : ArrowRightIcon
  const trendTone =
    trend === null || trend === undefined
      ? 'neutral'
      : trend > 0
        ? 'up'
        : trend < 0
          ? 'down'
          : 'neutral'

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring.gentle, delay }}
      className="h-full"
    >
      <div
        className={cn(
          'group/kpi relative h-full overflow-hidden rounded-2xl p-6 transition-[transform,box-shadow,border-color] duration-300 lg:p-7',
          emphasize
            ? 'bg-foreground text-background shadow-[var(--shadow-3)]'
            : 'border border-border bg-card shadow-[var(--shadow-1)] hover:border-border-strong hover:shadow-[var(--shadow-2)]',
        )}
      >
        {emphasize ? (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-80"
              style={{
                background:
                  'radial-gradient(closest-side, color-mix(in oklab, var(--accent) 70%, transparent), transparent)',
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-background/30 to-transparent"
            />
          </>
        ) : null}

        <div className="relative flex h-full flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <p
              className={cn(
                'text-[11px] font-semibold uppercase tracking-[0.14em]',
                emphasize ? 'text-background/70' : 'text-muted-foreground',
              )}
            >
              {title}
            </p>
            {TrendIcon && trend !== null && trend !== undefined ? (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.6875rem] font-semibold leading-none',
                  emphasize
                    ? 'bg-background/15 text-background'
                    : trendTone === 'up'
                      ? 'bg-success-soft text-success'
                      : trendTone === 'down'
                        ? 'bg-destructive-soft text-destructive'
                        : 'bg-muted text-muted-foreground',
                )}
              >
                <TrendIcon className="size-3" />
                {trend > 0 ? '+' : ''}
                {Math.round(trend)}%
              </span>
            ) : null}
          </div>

          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                'number font-display text-[2.75rem] leading-[1] tracking-tight md:text-5xl lg:text-[3.5rem]',
                emphasize ? 'text-background' : 'text-foreground',
              )}
            >
              {value}
            </span>
          </div>

          {subtitle ? (
            <div
              className={cn(
                'text-sm leading-snug',
                emphasize ? 'text-background/70' : 'text-muted-foreground',
              )}
            >
              {subtitle}
            </div>
          ) : null}

          {sparkline && sparkline.length > 0 ? (
            <div className="mt-auto h-14 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={sparkline}
                  margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="kpi-spark" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={
                          emphasize ? 'var(--background)' : 'var(--color-accent)'
                        }
                        stopOpacity={emphasize ? 0.55 : 0.35}
                      />
                      <stop
                        offset="100%"
                        stopColor={
                          emphasize ? 'var(--background)' : 'var(--color-accent)'
                        }
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={
                      emphasize ? 'var(--background)' : 'var(--color-accent)'
                    }
                    strokeWidth={2}
                    fill="url(#kpi-spark)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : null}
          {bars && bars.length > 0 ? (
            <div className="mt-auto h-14 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={bars}
                  margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
                >
                  <Bar
                    dataKey="count"
                    fill={
                      emphasize ? 'var(--background)' : 'var(--color-accent)'
                    }
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}
