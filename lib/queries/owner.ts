/**
 * Server-only queries for the owner dashboard.
 *
 * Every function uses the SSR Supabase client so RLS scopes results to the
 * caller's gym automatically. Functions never throw — they return safe
 * defaults (empty arrays, null, zeros) and log errors for the developer.
 *
 * KPI strategy: live SQL queries on every render. Volume is small (a single
 * gym with hundreds of members) and Postgres is fast for these aggregations.
 * If we ever need caching, the right place is Next's `cache()` here, not a
 * materialized view — we want freshness over scale for the MVP.
 */
import 'server-only'

import { PAYMENT_STATUS, SUBSCRIPTION_STATUS } from '@/lib/constants'
import type {
  AccessLog,
  MemberWithSubscription,
  Payment,
  Profile,
  Subscription,
  SubscriptionPlan,
  SubscriptionWithPlan,
} from '@/lib/domain-types'
import { createClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** ISO date string `YYYY-MM-DD` for date-typed columns. */
function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** First day of the current month, at 00:00 UTC. */
function startOfMonth(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
}

/** First day of the previous month. */
function startOfLastMonth(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1))
}

/** Today at 00:00 UTC. */
function startOfToday(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

/** Add `days` to `d` and return a new Date. */
function addDays(d: Date, days: number): Date {
  const next = new Date(d)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

// ---------------------------------------------------------------------------
// Dashboard KPIs
// ---------------------------------------------------------------------------

export type SparklinePoint = { date: string; value: number }
export type HourlyBucket = { hour: number; count: number }

export type DashboardKPIs = {
  monthRevenueCents: number
  lastMonthRevenueCents: number
  /** -1, 0, 1 for trend direction. Null when last month had zero. */
  revenueTrend: number | null
  /** Percentage delta (-100..+∞). Null when last month had zero. */
  revenueDeltaPct: number | null
  monthSparkline: SparklinePoint[]
  activeMembers: number
  expiringMembers: number
  suspendedMembers: number
  /** Unique members with at least one subscription (any status). */
  totalMembers: number
  todayEntries: number
  peakHour: number | null
  hourlyEntries: HourlyBucket[]
}

/**
 * Compute every KPI shown on the Home dashboard.
 *
 * Issued as a handful of parallel SELECTs and aggregated in JS — simpler than
 * a custom SQL function and fast enough for MVP volumes.
 */
export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  const supabase = await createClient()
  const today = startOfToday()
  const monthStart = startOfMonth()
  const lastMonthStart = startOfLastMonth()
  const last30Start = addDays(today, -29)
  const tomorrow = addDays(today, 1)
  const in7Days = addDays(today, 7)

  const [
    monthPaymentsRes,
    lastMonthPaymentsRes,
    last30PaymentsRes,
    activeRes,
    expiringRes,
    suspendedRes,
    totalRes,
    todayLogsRes,
  ] = await Promise.all([
    supabase
      .from('payments')
      .select('amount_cents, paid_at')
      .eq('status', PAYMENT_STATUS.SUCCEEDED)
      .gte('paid_at', monthStart.toISOString()),
    supabase
      .from('payments')
      .select('amount_cents')
      .eq('status', PAYMENT_STATUS.SUCCEEDED)
      .gte('paid_at', lastMonthStart.toISOString())
      .lt('paid_at', monthStart.toISOString()),
    supabase
      .from('payments')
      .select('amount_cents, paid_at')
      .eq('status', PAYMENT_STATUS.SUCCEEDED)
      .gte('paid_at', last30Start.toISOString()),
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', SUBSCRIPTION_STATUS.ACTIVE),
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', SUBSCRIPTION_STATUS.ACTIVE)
      .gte('end_date', toIsoDate(today))
      .lt('end_date', toIsoDate(in7Days)),
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', SUBSCRIPTION_STATUS.SUSPENDED),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'member'),
    supabase
      .from('access_logs')
      .select('accessed_at')
      .gte('accessed_at', today.toISOString())
      .lt('accessed_at', tomorrow.toISOString())
      .eq('granted', true),
  ])

  const monthRevenueCents =
    monthPaymentsRes.data?.reduce((s, p) => s + (p.amount_cents ?? 0), 0) ?? 0
  const lastMonthRevenueCents =
    lastMonthPaymentsRes.data?.reduce((s, p) => s + (p.amount_cents ?? 0), 0) ?? 0

  let revenueDeltaPct: number | null = null
  let revenueTrend: number | null = null
  if (lastMonthRevenueCents > 0) {
    const delta = monthRevenueCents - lastMonthRevenueCents
    revenueDeltaPct = (delta / lastMonthRevenueCents) * 100
    revenueTrend = delta === 0 ? 0 : delta > 0 ? 1 : -1
  } else if (monthRevenueCents > 0) {
    revenueTrend = 1
  }

  // Sparkline = daily revenue over the last 30 days
  const sparklineMap = new Map<string, number>()
  for (let i = 0; i < 30; i++) {
    const d = addDays(last30Start, i)
    sparklineMap.set(toIsoDate(d), 0)
  }
  for (const row of last30PaymentsRes.data ?? []) {
    if (!row.paid_at) continue
    const day = row.paid_at.slice(0, 10)
    sparklineMap.set(day, (sparklineMap.get(day) ?? 0) + (row.amount_cents ?? 0))
  }
  const monthSparkline: SparklinePoint[] = Array.from(sparklineMap.entries()).map(
    ([date, value]) => ({ date, value }),
  )

  // Hourly buckets for today's entries
  const hourlyMap = new Map<number, number>()
  for (let h = 0; h < 24; h++) hourlyMap.set(h, 0)
  for (const log of todayLogsRes.data ?? []) {
    const h = new Date(log.accessed_at).getHours()
    hourlyMap.set(h, (hourlyMap.get(h) ?? 0) + 1)
  }
  const hourlyEntries: HourlyBucket[] = Array.from(hourlyMap.entries()).map(
    ([hour, count]) => ({ hour, count }),
  )
  let peakHour: number | null = null
  let peakCount = 0
  for (const { hour, count } of hourlyEntries) {
    if (count > peakCount) {
      peakCount = count
      peakHour = hour
    }
  }
  const todayEntries = hourlyEntries.reduce((s, x) => s + x.count, 0)

  return {
    monthRevenueCents,
    lastMonthRevenueCents,
    revenueTrend,
    revenueDeltaPct,
    monthSparkline,
    activeMembers: activeRes.count ?? 0,
    expiringMembers: expiringRes.count ?? 0,
    suspendedMembers: suspendedRes.count ?? 0,
    totalMembers: totalRes.count ?? 0,
    todayEntries,
    peakHour,
    hourlyEntries,
  }
}

// ---------------------------------------------------------------------------
// Members list / detail
// ---------------------------------------------------------------------------

export type MemberFilter =
  | 'all'
  | 'active'
  | 'expiring'
  | 'expired'
  | 'suspended'
  | 'no_subscription'

export type MembersListParams = {
  filter?: MemberFilter
  search?: string
  page?: number
  pageSize?: number
}

export type MembersListResult = {
  members: MemberWithSubscription[]
  total: number
  page: number
  pageSize: number
}

const DEFAULT_PAGE_SIZE = 50

export async function getMembersList(
  params: MembersListParams = {},
): Promise<MembersListResult> {
  const supabase = await createClient()
  const filter = params.filter ?? 'all'
  const page = Math.max(1, params.page ?? 1)
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('role', 'member')
    .order('full_name', { ascending: true })

  if (params.search && params.search.trim()) {
    const term = params.search.trim().replace(/[%_]/g, '')
    query = query.or(
      `full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`,
    )
  }

  query = query.range(from, to)

  const { data: profiles, count, error } = await query

  if (error) {
    console.error('[queries/owner] getMembersList failed:', error.message)
    return { members: [], total: 0, page, pageSize }
  }
  if (!profiles || profiles.length === 0) {
    return { members: [], total: count ?? 0, page, pageSize }
  }

  // Fetch subscriptions in a second query (Supabase requires explicit FK names
  // with multiple FKs to profiles, so we keep it simple: 1 query per page).
  const memberIds = profiles.map((p) => p.id)
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*, plan:subscription_plans(*)')
    .in('member_id', memberIds)
    .order('end_date', { ascending: false })

  // For each member, pick the most relevant subscription:
  //   active > suspended > expired > cancelled, then most recent end_date
  const STATUS_RANK: Record<string, number> = {
    active: 4,
    suspended: 3,
    expired: 2,
    cancelled: 1,
  }
  const subsByMember = new Map<string, SubscriptionWithPlan[]>()
  for (const sub of (subscriptions as SubscriptionWithPlan[] | null) ?? []) {
    const list = subsByMember.get(sub.member_id) ?? []
    list.push(sub)
    subsByMember.set(sub.member_id, list)
  }
  for (const [, list] of subsByMember) {
    list.sort((a, b) => {
      const r = (STATUS_RANK[b.status] ?? 0) - (STATUS_RANK[a.status] ?? 0)
      if (r !== 0) return r
      return b.end_date.localeCompare(a.end_date)
    })
  }

  const today = toIsoDate(startOfToday())
  const in7DaysStr = toIsoDate(addDays(startOfToday(), 7))

  let members: MemberWithSubscription[] = profiles.map((p) => ({
    ...p,
    active_subscription: subsByMember.get(p.id)?.[0] ?? null,
  }))

  if (filter !== 'all') {
    members = members.filter((m) => {
      const sub = m.active_subscription
      switch (filter) {
        case 'active':
          return sub?.status === SUBSCRIPTION_STATUS.ACTIVE
        case 'suspended':
          return sub?.status === SUBSCRIPTION_STATUS.SUSPENDED
        case 'expired':
          return sub?.status === SUBSCRIPTION_STATUS.EXPIRED
        case 'expiring':
          return (
            sub?.status === SUBSCRIPTION_STATUS.ACTIVE &&
            sub.end_date >= today &&
            sub.end_date < in7DaysStr
          )
        case 'no_subscription':
          return sub === null
        default:
          return true
      }
    })
  }

  return {
    members,
    total: filter === 'all' ? count ?? members.length : members.length,
    page,
    pageSize,
  }
}

export type MemberDetail = {
  profile: Profile
  active_subscription: SubscriptionWithPlan | null
  subscriptions: SubscriptionWithPlan[]
  payments: Payment[]
  access_logs: AccessLog[]
}

export async function getMemberDetail(
  memberId: string,
): Promise<MemberDetail | null> {
  const supabase = await createClient()
  const [profileRes, subsRes, paymentsRes, logsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', memberId).maybeSingle(),
    supabase
      .from('subscriptions')
      .select('*, plan:subscription_plans(*)')
      .eq('member_id', memberId)
      .order('start_date', { ascending: false }),
    supabase
      .from('payments')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false }),
    supabase
      .from('access_logs')
      .select('*')
      .eq('member_id', memberId)
      .order('accessed_at', { ascending: false })
      .limit(30),
  ])

  if (profileRes.error || !profileRes.data) {
    return null
  }

  const subscriptions = (subsRes.data as SubscriptionWithPlan[] | null) ?? []
  const STATUS_RANK: Record<string, number> = {
    active: 4,
    suspended: 3,
    expired: 2,
    cancelled: 1,
  }
  const sortedForActive = [...subscriptions].sort((a, b) => {
    const r = (STATUS_RANK[b.status] ?? 0) - (STATUS_RANK[a.status] ?? 0)
    if (r !== 0) return r
    return b.end_date.localeCompare(a.end_date)
  })

  return {
    profile: profileRes.data,
    active_subscription: sortedForActive[0] ?? null,
    subscriptions,
    payments: paymentsRes.data ?? [],
    access_logs: logsRes.data ?? [],
  }
}

// ---------------------------------------------------------------------------
// Dashboard helpers
// ---------------------------------------------------------------------------

export type ExpiringMember = {
  member: Profile
  subscription: SubscriptionWithPlan
  daysRemaining: number
}

export async function getExpiringSoon(days = 7): Promise<ExpiringMember[]> {
  const supabase = await createClient()
  const today = startOfToday()
  const cutoff = addDays(today, days)

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, plan:subscription_plans(*), member:profiles!subscriptions_member_id_fkey(*)')
    .eq('status', SUBSCRIPTION_STATUS.ACTIVE)
    .gte('end_date', toIsoDate(today))
    .lt('end_date', toIsoDate(cutoff))
    .order('end_date', { ascending: true })
    .limit(20)

  if (error || !data) {
    if (error) console.error('[queries/owner] getExpiringSoon failed:', error.message)
    return []
  }

  return (data as Array<SubscriptionWithPlan & { member: Profile }>).map(
    (row) => {
      const end = new Date(row.end_date)
      const ms = end.getTime() - today.getTime()
      const daysRemaining = Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)))
      const { member, ...subscription } = row
      return { member, subscription: subscription as SubscriptionWithPlan, daysRemaining }
    },
  )
}

export type RecentPayment = Payment & { member: Profile }

export async function getRecentPayments(limit = 5): Promise<RecentPayment[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .select('*, member:profiles!payments_member_id_fkey(*)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) {
    if (error)
      console.error('[queries/owner] getRecentPayments failed:', error.message)
    return []
  }
  return data as RecentPayment[]
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

export type SubscriptionsFilter = {
  status?: 'all' | 'active' | 'expired' | 'suspended' | 'cancelled'
  planId?: string
  startsAfter?: string
  endsBefore?: string
  page?: number
  pageSize?: number
}

export type SubscriptionRow = SubscriptionWithPlan & { member: Profile }

export type SubscriptionsListResult = {
  subscriptions: SubscriptionRow[]
  total: number
  page: number
  pageSize: number
}

export async function getSubscriptionsList(
  filters: SubscriptionsFilter = {},
): Promise<SubscriptionsListResult> {
  const supabase = await createClient()
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('subscriptions')
    .select(
      '*, plan:subscription_plans(*), member:profiles!subscriptions_member_id_fkey(*)',
      { count: 'exact' },
    )
    .order('end_date', { ascending: false })

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }
  if (filters.planId) {
    query = query.eq('plan_id', filters.planId)
  }
  if (filters.startsAfter) {
    query = query.gte('start_date', filters.startsAfter)
  }
  if (filters.endsBefore) {
    query = query.lte('end_date', filters.endsBefore)
  }

  query = query.range(from, to)

  const { data, count, error } = await query
  if (error || !data) {
    if (error)
      console.error('[queries/owner] getSubscriptionsList failed:', error.message)
    return { subscriptions: [], total: 0, page, pageSize }
  }
  return {
    subscriptions: data as SubscriptionRow[],
    total: count ?? 0,
    page,
    pageSize,
  }
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export type PaymentsFilter = {
  startDate?: string
  endDate?: string
  method?: 'all' | 'card' | 'sepa' | 'cash' | 'bank_transfer'
  status?: 'all' | 'pending' | 'succeeded' | 'failed' | 'refunded'
  page?: number
  pageSize?: number
}

export type PaymentRow = Payment & { member: Profile }

export type PaymentsListResult = {
  payments: PaymentRow[]
  total: number
  totalAmountCents: number
  cashAmountCents: number
  digitalAmountCents: number
  pendingAmountCents: number
  page: number
  pageSize: number
}

export async function getPaymentsList(
  filters: PaymentsFilter = {},
): Promise<PaymentsListResult> {
  const supabase = await createClient()
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('payments')
    .select('*, member:profiles!payments_member_id_fkey(*)', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate)
  }
  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate)
  }
  if (filters.method && filters.method !== 'all') {
    query = query.eq('payment_method', filters.method)
  }
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  // KPIs for the *current month*, independent of the page filters above.
  const monthStart = startOfMonth()
  const kpiQuery = supabase
    .from('payments')
    .select('amount_cents, payment_method, status')
    .gte('created_at', monthStart.toISOString())

  query = query.range(from, to)

  const [listRes, kpiRes] = await Promise.all([query, kpiQuery])

  if (listRes.error || !listRes.data) {
    if (listRes.error)
      console.error('[queries/owner] getPaymentsList failed:', listRes.error.message)
    return {
      payments: [],
      total: 0,
      totalAmountCents: 0,
      cashAmountCents: 0,
      digitalAmountCents: 0,
      pendingAmountCents: 0,
      page,
      pageSize,
    }
  }

  let totalAmountCents = 0
  let cashAmountCents = 0
  let digitalAmountCents = 0
  let pendingAmountCents = 0
  for (const p of kpiRes.data ?? []) {
    const cents = p.amount_cents ?? 0
    if (p.status === PAYMENT_STATUS.SUCCEEDED) {
      totalAmountCents += cents
      if (p.payment_method === 'cash') cashAmountCents += cents
      else digitalAmountCents += cents
    } else if (p.status === PAYMENT_STATUS.PENDING) {
      pendingAmountCents += cents
    }
  }

  return {
    payments: listRes.data as PaymentRow[],
    total: listRes.count ?? 0,
    totalAmountCents,
    cashAmountCents,
    digitalAmountCents,
    pendingAmountCents,
    page,
    pageSize,
  }
}

// ---------------------------------------------------------------------------
// Access logs
// ---------------------------------------------------------------------------

export type AccessLogsFilter = {
  startDate?: string
  endDate?: string
  memberId?: string
  granted?: 'all' | 'granted' | 'denied'
  page?: number
  pageSize?: number
}

export type AccessLogRow = AccessLog & { member: Profile | null }

export type AccessLogsListResult = {
  logs: AccessLogRow[]
  total: number
  page: number
  pageSize: number
}

export async function getAccessLogsList(
  filters: AccessLogsFilter = {},
): Promise<AccessLogsListResult> {
  const supabase = await createClient()
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('access_logs')
    .select('*, member:profiles!access_logs_member_id_fkey(*)', {
      count: 'exact',
    })
    .order('accessed_at', { ascending: false })

  if (filters.startDate) {
    query = query.gte('accessed_at', filters.startDate)
  }
  if (filters.endDate) {
    query = query.lte('accessed_at', filters.endDate)
  }
  if (filters.memberId) {
    query = query.eq('member_id', filters.memberId)
  }
  if (filters.granted === 'granted') {
    query = query.eq('granted', true)
  } else if (filters.granted === 'denied') {
    query = query.eq('granted', false)
  }

  query = query.range(from, to)

  const { data, count, error } = await query
  if (error || !data) {
    if (error)
      console.error('[queries/owner] getAccessLogsList failed:', error.message)
    return { logs: [], total: 0, page, pageSize }
  }
  return {
    logs: data as AccessLogRow[],
    total: count ?? 0,
    page,
    pageSize,
  }
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error || !data) {
    if (error)
      console.error('[queries/owner] getSubscriptionPlans failed:', error.message)
    return []
  }
  return data
}

export async function getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const all = await getSubscriptionPlans()
  return all.filter((p) => p.is_active)
}

// ---------------------------------------------------------------------------
// Phase 05 — failed payments dashboard widget
// ---------------------------------------------------------------------------

export type FailedPaymentRow = Payment & { member: Profile | null }

/**
 * Recent payments with `status = 'failed'`. Used by the dashboard
 * "Da gestire" card and the /pagamenti page Falliti tab.
 */
export async function getRecentFailedPayments(
  options: { days?: number; limit?: number } = {},
): Promise<FailedPaymentRow[]> {
  const supabase = await createClient()
  const days = options.days ?? 30
  const limit = options.limit ?? 25
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('payments')
    .select('*, member:profiles!payments_member_id_fkey(*)')
    .eq('status', PAYMENT_STATUS.FAILED)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) {
    if (error)
      console.error(
        '[queries/owner] getRecentFailedPayments failed:',
        error.message,
      )
    return []
  }
  return data as FailedPaymentRow[]
}

// Re-export type for caller convenience.
export type { Subscription, SubscriptionWithPlan }
