/**
 * Centralized notification dispatcher.
 *
 * Single entry point used by every business event:
 *   - Stripe webhook handlers (payment_intent.succeeded, .failed, etc.)
 *   - Cron jobs (expiry reminders, post-expiry, monthly digest, etc.)
 *   - Server actions (welcome on signup, suspend/resume, etc.)
 *
 * Responsibilities:
 *   1. Idempotency — drop duplicates via `notifications_sent` unique idx.
 *   2. Recipient resolution — load member + gym from Supabase admin.
 *   3. Channel fan-out — email (Resend) + push (web-push) per the
 *      member's preferences.
 *   4. Logging — insert one row per dispatched notification (even when
 *      Resend isn't configured, so we can audit what would have been
 *      sent).
 *
 * Never throws on email/push failure; callers (especially the Stripe
 * webhook) treat notification dispatch as best-effort. Errors are
 * logged and surfaced in the return value.
 *
 * Server-only.
 */
import 'server-only'

import { render } from '@react-email/components'
import * as React from 'react'

import {
  EMAIL_FROM_FALLBACK,
  isResendConfigured,
  ResendNotConfiguredError,
  getFromAddress,
  getReplyToAddress,
  getResend,
} from './internals'
import { sendPushNotification, isPushConfigured } from './push'
import { buildSubject, type SubjectContext } from './subjects'
import {
  ALL_NOTIFICATION_TYPES,
  NOTIFICATION_PREFERENCE_MAP,
  type DispatchResult,
  type NotificationAttachment,
  type NotificationChannel,
  type NotificationType,
} from './types'
import { templates, type TemplateKey } from '@/emails'
import { env } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  Gym,
  NotificationPreferences,
  Profile,
} from '@/lib/domain-types'

export type DispatchInput = {
  /** Notification type (see `notifications_sent.type` CHECK).  */
  type: NotificationType
  /** Profile id of the recipient (member, owner, or staff). */
  recipient_id: string
  /** Subscription scoping for member-side reminders. Drives idempotency. */
  subscription_id?: string | null
  /** Additional template data (merged into the React Email props). */
  data?: Record<string, unknown>
  /** Channels to attempt. Defaults to `['email']`. */
  channels?: readonly NotificationChannel[]
  /** Resend attachments — passed through verbatim to the API. */
  attachments?: NotificationAttachment[]
  /**
   * If true, skip the idempotency check (still inserts the row). Use
   * sparingly — receipts that re-issue, manual resends from the UI.
   */
  force?: boolean
}

type DispatcherTemplate = (props: Record<string, unknown>) => React.ReactElement

export async function dispatchNotification(
  input: DispatchInput,
): Promise<DispatchResult> {
  if (!ALL_NOTIFICATION_TYPES.includes(input.type)) {
    return { error: true, message: `Unknown notification type ${input.type}` }
  }

  const admin = createAdminClient()
  const channels = input.channels ?? (['email'] as const)

  // 1. Recipient resolution
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('*, gym:gyms(*)')
    .eq('id', input.recipient_id)
    .maybeSingle<Profile & { gym: Gym }>()

  if (profileError || !profile || !profile.gym) {
    return { skipped: true, reason: 'no_recipient' }
  }
  const member: Profile = profile
  const gym: Gym = profile.gym

  // 2. Idempotency on (subscription_id, type) when subscription is set
  if (!input.force && input.subscription_id) {
    const { data: existing } = await admin
      .from('notifications_sent')
      .select('id')
      .eq('subscription_id', input.subscription_id)
      .eq('type', input.type)
      .maybeSingle()
    if (existing) {
      return { skipped: true, reason: 'already_sent' }
    }
  }

  // 3. Preference loading (missing row = defaults all-on except new_member_alert)
  const { data: prefs } = await admin
    .from('notification_preferences')
    .select('*')
    .eq('member_id', member.id)
    .maybeSingle<NotificationPreferences>()

  // 4. Channel fan-out
  const sentChannels: NonNullable<
    Extract<DispatchResult, { sent: true }>['channels']
  > = {}

  if (channels.includes('email')) {
    sentChannels.email = await sendEmailChannel(
      input,
      member,
      gym,
      prefs,
    )
  }

  if (channels.includes('push')) {
    sentChannels.push = await sendPushChannel(input, member, prefs)
  }

  // 5. Log to notifications_sent (always, so we have an audit trail)
  const channelLabel = channels.join(',')
  const emailResult = sentChannels.email
  const resendId =
    emailResult && 'id' in emailResult ? emailResult.id : null

  // The unique index on (subscription_id, type) is the safety net:
  // a concurrent dispatch will fail with 23505 and we treat that as
  // "already sent".
  // Cast through unknown → Json: the metadata payload is JSON-serializable
  // (we only feed it primitive props + dispatcher results) but TypeScript
  // can't statically prove that of `Record<string, unknown>`.
  const metadata = JSON.parse(
    JSON.stringify({
      data: input.data ?? null,
      results: sentChannels,
    }),
  ) as Record<string, never>
  const { error: logError } = await admin
    .from('notifications_sent')
    .insert({
      gym_id: gym.id,
      member_id: member.id,
      subscription_id: input.subscription_id ?? null,
      type: input.type,
      channel: channelLabel,
      resend_message_id: resendId,
      metadata,
    })

  if (logError) {
    // 23505 = unique violation: a concurrent insert beat us. Treat as success.
    if (
      typeof logError.code === 'string' &&
      (logError.code === '23505' || logError.message.includes('duplicate'))
    ) {
      return { skipped: true, reason: 'already_sent' }
    }
    console.error('[notifications] failed to log notifications_sent', logError)
  }

  return { sent: true, channels: sentChannels }
}

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

async function sendEmailChannel(
  input: DispatchInput,
  member: Profile,
  gym: Gym,
  prefs: NotificationPreferences | null,
): Promise<
  | { id: string | null }
  | { skipped: 'not_configured' | 'opted_out' }
> {
  // Channel + per-event opt-out
  if (prefs?.email_enabled === false) return { skipped: 'opted_out' }
  const eventFlag = NOTIFICATION_PREFERENCE_MAP[input.type].email
  if (eventFlag && prefs && prefs[eventFlag] === false) {
    return { skipped: 'opted_out' }
  }

  if (!isResendConfigured()) {
    console.warn(
      `[notifications] Resend not configured; would send ${input.type} to ${member.email}`,
    )
    return { skipped: 'not_configured' }
  }

  // Render the template
  const Template = templates[input.type as TemplateKey] as DispatcherTemplate
  if (!Template) {
    console.warn(`[notifications] no template for type ${input.type}`)
    return { skipped: 'not_configured' }
  }

  const props: Record<string, unknown> = {
    member,
    gym,
    app_url: env.APP_URL,
    ...(input.data ?? {}),
  }

  let html: string
  let text: string
  try {
    html = await render(Template(props))
    text = await render(Template(props), { plainText: true })
  } catch (err) {
    console.error('[notifications] template render failed', err)
    return { skipped: 'not_configured' }
  }

  const subject = buildSubject(input.type, {
    ...(input.data as SubjectContext),
    gym_name: gym.name,
    member_name: member.full_name,
  })

  try {
    const resend = getResend()
    const replyTo = getReplyToAddress()
    const result = await resend.emails.send({
      from: getFromAddress(),
      to: member.email,
      replyTo: replyTo,
      subject,
      html,
      text,
      attachments: (input.attachments ?? []).map((a) => ({
        filename: a.filename,
        content:
          typeof a.content === 'string'
            ? a.content
            : Buffer.isBuffer(a.content)
              ? a.content
              : Buffer.from(a.content),
      })),
    })
    if (result.error) {
      console.error('[notifications] resend send error', result.error)
      return { id: null }
    }
    return { id: result.data?.id ?? null }
  } catch (err) {
    if (err instanceof ResendNotConfiguredError) {
      return { skipped: 'not_configured' }
    }
    console.error('[notifications] resend send threw', err)
    return { id: null }
  }

  // EMAIL_FROM_FALLBACK is used only by the lazy import shim to avoid
  // unused-import warnings in dev. (Imported for potential debug use.)
  void EMAIL_FROM_FALLBACK
}

// ---------------------------------------------------------------------------
// Push
// ---------------------------------------------------------------------------

async function sendPushChannel(
  input: DispatchInput,
  member: Profile,
  prefs: NotificationPreferences | null,
): Promise<
  | { sent: number; failed: number }
  | { skipped: 'not_configured' | 'opted_out' | 'no_subscriptions' }
> {
  if (prefs?.push_enabled === false) return { skipped: 'opted_out' }
  const eventFlag = NOTIFICATION_PREFERENCE_MAP[input.type].push
  if (eventFlag && prefs && prefs[eventFlag] === false) {
    return { skipped: 'opted_out' }
  }
  if (!isPushConfigured()) return { skipped: 'not_configured' }

  const result = await sendPushNotification(member.id, input.type)
  if (result.sent === 0 && result.failed === 0) {
    return { skipped: 'no_subscriptions' }
  }
  return { sent: result.sent, failed: result.failed }
}
