/**
 * In-app notifications surfaced via the dashboard bell-icon.
 *
 * Server-only insert helper used by cron jobs and business events.
 * Reads (for the bell-icon) live in `lib/queries/notifications.ts` and
 * use the SSR client + RLS so they automatically scope to the signed-in
 * owner/staff.
 */
import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

export type OwnerNotificationType =
  | 'member_subscription_expiring'
  | 'payment_failed'
  | 'new_member_signup'
  | 'monthly_report_ready'
  | 'sepa_mandate_revoked'
  | 'cash_close_pending'

export type CreateOwnerNotificationInput = {
  gym_id: string
  recipient_id: string
  type: OwnerNotificationType
  title: string
  body: string
  link?: string | null
}

export async function createOwnerNotification(
  input: CreateOwnerNotificationInput,
): Promise<{ id: string } | { error: string }> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('owner_notifications')
    .insert({
      gym_id: input.gym_id,
      recipient_id: input.recipient_id,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link ?? null,
    })
    .select('id')
    .single()
  if (error) {
    console.error('[notifications] createOwnerNotification failed', error)
    return { error: error.message }
  }
  return { id: data.id }
}

/**
 * Bulk-create notifications for every owner/staff in a gym. Useful for
 * cron-driven digests where each role-bearer in the gym should see the
 * same alert.
 */
export async function fanoutOwnerNotification(
  gym_id: string,
  payload: Omit<CreateOwnerNotificationInput, 'gym_id' | 'recipient_id'>,
): Promise<{ inserted: number }> {
  const admin = createAdminClient()
  const { data: recipients, error } = await admin
    .from('profiles')
    .select('id')
    .eq('gym_id', gym_id)
    .in('role', ['owner', 'staff'])
  if (error || !recipients || recipients.length === 0) return { inserted: 0 }

  const rows = recipients.map((r) => ({
    gym_id,
    recipient_id: r.id,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    link: payload.link ?? null,
  }))
  const { error: insertError, count } = await admin
    .from('owner_notifications')
    .insert(rows, { count: 'exact' })
  if (insertError) {
    console.error('[notifications] fanoutOwnerNotification failed', insertError)
    return { inserted: 0 }
  }
  return { inserted: count ?? rows.length }
}
