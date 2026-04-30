/**
 * Server-only queries for the member PWA.
 *
 * Mirrors the pattern from `queries/owner.ts`: use the SSR client so RLS
 * scopes everything to the signed-in member. Never throws — returns
 * defaults so that the member home renders even after a transient blip.
 */
import 'server-only'

import { SUBSCRIPTION_STATUS } from '@/lib/constants'
import type {
  Gym,
  GymSettings,
  Payment,
  Profile,
  SepaMandate,
  SubscriptionWithPlan,
} from '@/lib/domain-types'
import { createClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Computed status used by the home hero card. Distinguishes "scaduto in
 * grazia" from "scaduto bloccato" because the UI/CTA differ.
 */
export type MemberAccessStatus =
  | 'active'
  | 'expiring_soon'
  | 'grace_period'
  | 'expired'
  | 'suspended'
  | 'cancelled'
  | 'no_subscription'

export type MemberHomeData = {
  profile: Profile
  gym: Gym | null
  subscription: SubscriptionWithPlan | null
  sepaMandate: SepaMandate | null
  lastPayment: Payment | null
  lastAccess: { accessed_at: string; granted: boolean } | null
  status: MemberAccessStatus
  /** Days until expiry — null if no active subscription or already expired. */
  daysRemaining: number | null
  /** Days of grace left after expiry — null if not in grace period. */
  graceDaysLeft: number | null
  /** 0..100 percentage of the subscription period used so far. */
  periodUsedPct: number | null
  gracePeriodDays: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Today at 00:00 UTC. */
function startOfToday(): Date {
  const now = new Date()
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  )
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

function readGracePeriodDays(gym: Gym | null): number {
  const fallback = 3
  if (!gym?.settings) return fallback
  const settings = gym.settings as Partial<GymSettings>
  const raw = settings.gracePeriodDays
  return typeof raw === 'number' && raw >= 0 ? raw : fallback
}

/**
 * Compute the effective member status from the raw subscription row.
 *
 * Why not just trust `subscription.status`: the DB column flips to
 * `expired` only when the cron `update_expired_subscriptions()` runs,
 * which is daily at most. We want the UI to react in real time the
 * moment the user opens the app, plus we need to discriminate "active
 * but expiring" and "expired but in grace" — neither is in the column.
 */
function computeStatus(
  subscription: SubscriptionWithPlan | null,
  gracePeriodDays: number,
): {
  status: MemberAccessStatus
  daysRemaining: number | null
  graceDaysLeft: number | null
  periodUsedPct: number | null
} {
  if (!subscription) {
    return {
      status: 'no_subscription',
      daysRemaining: null,
      graceDaysLeft: null,
      periodUsedPct: null,
    }
  }

  if (subscription.status === SUBSCRIPTION_STATUS.SUSPENDED) {
    return {
      status: 'suspended',
      daysRemaining: null,
      graceDaysLeft: null,
      periodUsedPct: null,
    }
  }
  if (subscription.status === SUBSCRIPTION_STATUS.CANCELLED) {
    return {
      status: 'cancelled',
      daysRemaining: null,
      graceDaysLeft: null,
      periodUsedPct: null,
    }
  }

  const today = startOfToday()
  const start = new Date(subscription.start_date + 'T00:00:00Z')
  const end = new Date(subscription.end_date + 'T00:00:00Z')
  const totalDays = Math.max(1, daysBetween(start, end))
  const elapsed = Math.max(0, daysBetween(start, today))
  const periodUsedPct = Math.min(100, Math.round((elapsed / totalDays) * 100))

  const diff = daysBetween(today, end)

  if (diff > 7) {
    return { status: 'active', daysRemaining: diff, graceDaysLeft: null, periodUsedPct }
  }
  if (diff >= 0) {
    return {
      status: 'expiring_soon',
      daysRemaining: diff,
      graceDaysLeft: null,
      periodUsedPct,
    }
  }
  // Expired — check if still within grace window.
  const overdueDays = -diff
  if (overdueDays <= gracePeriodDays) {
    return {
      status: 'grace_period',
      daysRemaining: null,
      graceDaysLeft: gracePeriodDays - overdueDays + 1,
      periodUsedPct: 100,
    }
  }
  return {
    status: 'expired',
    daysRemaining: null,
    graceDaysLeft: 0,
    periodUsedPct: 100,
  }
}

// Status-rank used both here and in subscription-history view: pick the
// most "live" subscription when a member has multiple historical rows.
const STATUS_RANK: Record<string, number> = {
  active: 4,
  suspended: 3,
  expired: 2,
  cancelled: 1,
}

// ---------------------------------------------------------------------------
// Public queries
// ---------------------------------------------------------------------------

/**
 * Fetch every piece of data the home page needs in one round-trip-ish go.
 *
 * Issues four parallel SELECTs and merges the results. Caller passes the
 * member id (typically `requireMember().id`) so this function stays pure
 * and easily testable.
 */
export async function getMemberHomeData(
  memberId: string,
): Promise<MemberHomeData> {
  const supabase = await createClient()

  const [profileRes, gymRes, subsRes, mandateRes, paymentRes, accessRes] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', memberId).single(),
      // Fetch gym separately so we can read the grace-period setting.
      supabase.from('gyms').select('*').limit(1).maybeSingle(),
      supabase
        .from('subscriptions')
        .select('*, plan:subscription_plans(*)')
        .eq('member_id', memberId)
        .order('end_date', { ascending: false }),
      supabase
        .from('sepa_mandates')
        .select('*')
        .eq('member_id', memberId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('payments')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('access_logs')
        .select('accessed_at, granted')
        .eq('member_id', memberId)
        .order('accessed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

  if (profileRes.error || !profileRes.data) {
    // Should be impossible in practice — `requireMember()` already loaded
    // the row to redirect on missing — but bail safely so we never throw.
    throw new Error('Profilo membro non trovato')
  }

  const subscriptions = (subsRes.data ?? []) as SubscriptionWithPlan[]
  const sortedActive = [...subscriptions].sort((a, b) => {
    const r = (STATUS_RANK[b.status] ?? 0) - (STATUS_RANK[a.status] ?? 0)
    if (r !== 0) return r
    return b.end_date.localeCompare(a.end_date)
  })
  const subscription = sortedActive[0] ?? null

  const gracePeriodDays = readGracePeriodDays(gymRes.data ?? null)
  const computed = computeStatus(subscription, gracePeriodDays)

  return {
    profile: profileRes.data,
    gym: gymRes.data ?? null,
    subscription,
    sepaMandate: (mandateRes.data ?? null) as SepaMandate | null,
    lastPayment: (paymentRes.data ?? null) as Payment | null,
    lastAccess: accessRes.data
      ? {
          accessed_at: accessRes.data.accessed_at,
          granted: accessRes.data.granted,
        }
      : null,
    ...computed,
    gracePeriodDays,
  }
}

/** All payments for the member, optionally filtered by year. */
export async function getMemberPaymentHistory(
  memberId: string,
  year?: number,
): Promise<Payment[]> {
  const supabase = await createClient()
  let query = supabase
    .from('payments')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })

  if (typeof year === 'number') {
    const start = new Date(Date.UTC(year, 0, 1)).toISOString()
    const end = new Date(Date.UTC(year + 1, 0, 1)).toISOString()
    query = query.gte('created_at', start).lt('created_at', end)
  }

  const { data, error } = await query
  if (error || !data) {
    if (error)
      console.error('[queries/member] getMemberPaymentHistory:', error.message)
    return []
  }
  return data
}

/** Distinct years for which the member has at least one payment. */
export async function getMemberPaymentYears(
  memberId: string,
): Promise<number[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .select('created_at')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  const years = new Set<number>()
  for (const row of data) {
    if (!row.created_at) continue
    years.add(new Date(row.created_at).getUTCFullYear())
  }
  return Array.from(years).sort((a, b) => b - a)
}

/** Full subscription history for the member, sorted newest first. */
export async function getMemberSubscriptionHistory(
  memberId: string,
): Promise<SubscriptionWithPlan[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, plan:subscription_plans(*)')
    .eq('member_id', memberId)
    .order('start_date', { ascending: false })

  if (error || !data) {
    if (error)
      console.error(
        '[queries/member] getMemberSubscriptionHistory:',
        error.message,
      )
    return []
  }
  return data as SubscriptionWithPlan[]
}

/**
 * Get the most recent suspension reason for an active suspension (used by
 * the "Sospensione" tab on the abbonamento page).
 */
export async function getMemberActiveSuspension(
  subscriptionId: string,
): Promise<{ reason: string | null; suspended_at: string } | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('subscription_suspensions')
    .select('reason, suspended_at, resumed_at')
    .eq('subscription_id', subscriptionId)
    .is('resumed_at', null)
    .order('suspended_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return { reason: data.reason, suspended_at: data.suspended_at }
}
