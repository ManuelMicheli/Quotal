/**
 * Mock access-control adapter.
 *
 * The default for the QR + tablet MVP: there is no physical varco to
 * command, the tablet itself displays the verdict. We log to the server
 * console so dev-time integration is observable, but every operation is
 * a no-op that always succeeds.
 *
 * Use this when:
 *   - The site has no networked turnstile (manual door, staff opens).
 *   - You're developing locally without hardware on the bench.
 *   - The tablet IS the gate (member-facing PWA scan-and-show flow).
 */
import 'server-only'

import type {
  AccessControlAdapter,
  EntryDecision,
  HardwareResult,
} from './types'

export class MockAdapter implements AccessControlAdapter {
  readonly name = 'mock'

  async grantAccess(opts: {
    deviceId: string
    decision: EntryDecision
    durationMs?: number
  }): Promise<HardwareResult> {
    console.info(
      `[access:mock] grantAccess device=${opts.deviceId} member=${opts.decision.member_id ?? '?'} duration=${opts.durationMs ?? 3000}ms`,
    )
    return { ok: true }
  }

  async displayMessage(opts: {
    deviceId: string
    message: string
    durationMs?: number
  }): Promise<HardwareResult> {
    console.info(
      `[access:mock] displayMessage device=${opts.deviceId} "${opts.message}" duration=${opts.durationMs ?? 3000}ms`,
    )
    return { ok: true }
  }
}
