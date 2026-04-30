/**
 * The decision pipeline.
 *
 * Order of checks (each layer short-circuits with a DENY):
 *   1. Token signature (caller already verified or surfaced raw badge)
 *   2. Member exists in the gym (badge_uid match scoped to gym_id)
 *   3. Member not flagged `is_problematic`
 *   4. Subscription exists at all (else `no_subscription`)
 *   5. Subscription not in `cancelled` / `suspended` terminal states
 *   6. Subscription `end_date` covers today, OR within `gracePeriodDays`
 *
 * Everything else (hours-of-day, capacity, etc.) is intentionally out of
 * scope for the MVP. Adding them is a single new step in this pipeline.
 *
 * Returns an `EntryDecision` ready to log + render. Never throws.
 */
import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import {
  DEFAULT_GYM_SETTINGS,
  SUBSCRIPTION_STATUS,
} from '@/lib/constants'
import type { GymSettings } from '@/lib/domain-types'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/supabase/types'

import type { EntryDecision } from './adapters/types'

type AdminClient = SupabaseClient<Database>

export type EvaluateInput = {
  /** Member badge UID — `Q-<uuid>` from QR or raw RFID UID. */
  badgeUid: string
  /** Gym scope — taken from the device row, never the request body. */
  gymId: string
}

const STATUS_RANK: Record<string, number> = {
  [SUBSCRIPTION_STATUS.ACTIVE]: 4,
  [SUBSCRIPTION_STATUS.SUSPENDED]: 3,
  [SUBSCRIPTION_STATUS.EXPIRED]: 2,
  [SUBSCRIPTION_STATUS.CANCELLED]: 1,
}

/** Today as `YYYY-MM-DD` in the *server*'s local timezone. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Add `days` to an ISO date and return the new ISO date. */
function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName
}

export async function evaluateAccess(
  input: EvaluateInput,
  supabase: AdminClient = createAdminClient(),
): Promise<EntryDecision> {
  // Step 2: locate member.
  const { data: member, error: memberError } = await supabase
    .from('profiles')
    .select('id, full_name, gym_id, role, is_problematic, problematic_reason')
    .eq('badge_uid', input.badgeUid)
    .eq('gym_id', input.gymId)
    .maybeSingle()

  if (memberError) {
    console.warn('[access] profile lookup failed:', memberError.message)
  }

  if (!member) {
    return {
      allow: false,
      reason: 'unknown_badge',
      message: 'Badge non riconosciuto',
    }
  }

  // Step 3: problematic flag — owner-set kill switch.
  if (member.is_problematic) {
    return {
      allow: false,
      reason: 'problematic_member',
      member_id: member.id,
      member_name: member.full_name,
      message:
        member.problematic_reason
          ? `Accesso bloccato: ${member.problematic_reason}`
          : 'Accesso bloccato. Parla col titolare.',
    }
  }

  // Step 4 + 5: most relevant subscription (active > suspended > expired > cancelled).
  const { data: subs, error: subsError } = await supabase
    .from('subscriptions')
    .select(
      'id, status, end_date, original_end_date, plan:subscription_plans(name)',
    )
    .eq('member_id', member.id)
    .order('end_date', { ascending: false })

  if (subsError) {
    console.warn('[access] subscription lookup failed:', subsError.message)
  }

  const ranked = (subs ?? []).slice().sort((a, b) => {
    const rankDiff = (STATUS_RANK[b.status] ?? 0) - (STATUS_RANK[a.status] ?? 0)
    if (rankDiff !== 0) return rankDiff
    return b.end_date.localeCompare(a.end_date)
  })
  const sub = ranked[0]

  if (!sub) {
    return {
      allow: false,
      reason: 'no_subscription',
      member_id: member.id,
      member_name: member.full_name,
      message: `Ciao ${firstName(member.full_name)}, non hai un abbonamento attivo`,
    }
  }

  if (sub.status === SUBSCRIPTION_STATUS.SUSPENDED) {
    return {
      allow: false,
      reason: 'suspended',
      member_id: member.id,
      member_name: member.full_name,
      subscription_id: sub.id,
      message: 'Abbonamento sospeso. Parla col titolare.',
    }
  }

  if (sub.status === SUBSCRIPTION_STATUS.CANCELLED) {
    return {
      allow: false,
      reason: 'cancelled',
      member_id: member.id,
      member_name: member.full_name,
      subscription_id: sub.id,
      message: 'Abbonamento disdetto. Rivolgersi alla reception.',
    }
  }

  // Step 6: still inside end_date?
  const today = todayIso()
  if (sub.end_date >= today) {
    return {
      allow: true,
      member_id: member.id,
      member_name: member.full_name,
      subscription_id: sub.id,
      message: `Bentornato/a, ${firstName(member.full_name)}!`,
    }
  }

  // Outside end_date — check grace period from gym settings.
  const { data: gym } = await supabase
    .from('gyms')
    .select('settings')
    .eq('id', input.gymId)
    .maybeSingle()
  const settings = (gym?.settings ?? {}) as Partial<GymSettings>
  const graceDays =
    settings.gracePeriodDays ?? DEFAULT_GYM_SETTINGS.gracePeriodDays

  const graceEnd = addDays(sub.end_date, graceDays)
  if (today <= graceEnd) {
    return {
      allow: true,
      member_id: member.id,
      member_name: member.full_name,
      subscription_id: sub.id,
      message: `${firstName(member.full_name)}, abbonamento scaduto. Rinnova entro ${graceDays}gg`,
    }
  }

  return {
    allow: false,
    reason: 'expired',
    member_id: member.id,
    member_name: member.full_name,
    subscription_id: sub.id,
    message: 'Abbonamento scaduto. Rinnova per accedere.',
  }
}
