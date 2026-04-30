/**
 * Member access QR — issuance endpoint.
 *
 * GET /api/member/qr
 *   - 200 application/json {
 *       token, expiresAt, ttlSeconds, svg, badgeUid, fullName
 *     }
 *
 * Auth: signed-in member (RLS on profiles + role check via requireMember).
 *
 * Side-effect: if the member has no `badge_uid` yet (most members until
 * the tornello rolls out in Phase 08), one is generated on first call
 * and persisted via the admin client. We do this server-side so the QR
 * is deterministic across devices for the same member.
 *
 * The response also includes the rendered SVG so the client can paint
 * instantly without a second request — saves one round-trip on the
 * critical path the second a member opens the home.
 */
import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'

import { requireMember } from '@/lib/auth'
import { renderQrSvg, signQrToken, QR_TOKEN_TTL_SECONDS } from '@/lib/qr'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const profile = await requireMember()

  // Ensure the member has a badge UID. Phase 02 left this column nullable
  // because it was tornello-specific; Phase 07 promotes it to "every
  // member must have one" by lazy-creating on first QR fetch.
  // Use the SSR (RLS-scoped) client: the existing
  // "Users can update their own profile" policy lets the member set their
  // own badge_uid, and we avoid depending on the service-role key for a
  // first-time provisioning flow that's per-user by definition.
  let badgeUid = profile.badge_uid
  if (!badgeUid) {
    badgeUid = `Q-${randomUUID()}`
    const supabase = await createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ badge_uid: badgeUid })
      .eq('id', profile.id)
    if (error) {
      console.error('[qr] failed to persist badge_uid:', error.message)
      return NextResponse.json(
        { error: 'badge_uid_provision_failed' },
        { status: 500 },
      )
    }
  }

  const { token, expiresAt } = signQrToken({
    buid: badgeUid,
    mid: profile.id,
    gid: profile.gym_id,
  })
  const svg = await renderQrSvg(token)

  return NextResponse.json(
    {
      token,
      expiresAt,
      ttlSeconds: QR_TOKEN_TTL_SECONDS,
      svg,
      badgeUid,
      fullName: profile.full_name,
    },
    {
      headers: {
        // Never let the browser HTTP cache hold onto a personal token —
        // the SW handles offline caching with an explicit allowlist.
        'cache-control': 'no-store, max-age=0',
      },
    },
  )
}
