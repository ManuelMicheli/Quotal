/**
 * Read-side helpers for the notifications surfaces (owner inbox + member
 * preferences). Uses the SSR client + RLS so each query is automatically
 * scoped to the signed-in user's gym/role.
 */
import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { OwnerNotification, NotificationPreferences } from '@/lib/domain-types'

export type OwnerNotificationsResult = {
  notifications: OwnerNotification[]
  unread: number
}

export async function getOwnerNotifications(
  recipientId: string,
  limit = 20,
): Promise<OwnerNotificationsResult> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('owner_notifications')
    .select('*')
    .eq('recipient_id', recipientId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('[queries/notifications] list failed', error)
    return { notifications: [], unread: 0 }
  }
  const list = (data ?? []) as OwnerNotification[]
  const unread = list.filter((n) => n.read_at === null).length
  return { notifications: list, unread }
}

export async function getOwnerUnreadCount(recipientId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('owner_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', recipientId)
    .is('read_at', null)
  return count ?? 0
}

export async function getNotificationPreferences(
  memberId: string,
): Promise<NotificationPreferences | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('member_id', memberId)
    .maybeSingle()
  return (data as NotificationPreferences | null) ?? null
}
