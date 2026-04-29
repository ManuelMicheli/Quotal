'use client'

/**
 * Hero KPI card for the dashboard home.
 *
 * Client component: hosts Framer Motion entry animation and Recharts mini
 * sparkline / bar chart. Numbers are rendered server-side (passed as props)
 * so we never client-fetch.
 */
import { motion } from 'framer-motion'
import { ArrowDownIcon, ArrowRightIcon, ArrowUpIcon } from 'lucide-react'
import * as React from 'react'
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer } from 'recharts'

import { Card, CardContent } from '@/components/ui/card'
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
        ? ArrowUpIcon
        : trend < 0
          ? ArrowDownIcon
          : ArrowRightIcon
  const trendColor =
    trend === null || trend === undefined
      ? 'text-muted-foreground'
      : trend > 0
        ? 'text-success'
        : trend < 0
          ? 'text-destructive'
          : 'text-muted-foreground'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
    >
      <Card
        className={cn(
          'h-full overflow-hidden',
          emphasize ? 'border-accent/30 bg-card' : 'bg-card',
        )}
      >
        <CardContent className="flex h-full flex-col gap-3 p-6">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl tracking-tight text-foreground sm:text-5xl">
              {value}
            </span>
            {TrendIcon ? (
              <span className={cn('flex items-center', trendColor)}>
                <TrendIcon className="size-4" />
              </span>
            ) : null}
          </div>
          {subtitle ? (
            <div className="text-sm text-muted-foreground">{subtitle}</div>
          ) : null}
          {sparkline && sparkline.length > 0 ? (
            <div className="mt-auto h-12">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={sparkline}
                  margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="kpi-spark" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--color-accent)"
                    strokeWidth={2}
                    fill="url(#kpi-spark)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : null}
          {bars && bars.length > 0 ? (
            <div className="mt-auto h-12">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={bars}
                  margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
                >
                  <Bar
                    dataKey="count"
                    fill="var(--color-accent)"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  )
}
