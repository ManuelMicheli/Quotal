/**
 * Access-control adapter contract.
 *
 * The adapter owns *physical* hardware actions only — opening a turnstile,
 * showing a message on a vendor display. The "thinking" (verifying QR
 * signature, looking up subscription, applying grace period) lives in
 * `lib/access/evaluate.ts` so swapping vendors never requires rewriting
 * business logic.
 *
 * Adapters are server-side only — they hold credentials for vendor APIs.
 *
 * Two implementations ship with the MVP:
 *   - `MockAdapter` — no-op, logs to console. Default.
 *   - `RestAdapter` — generic HTTP client that POSTs to a configurable
 *     vendor endpoint after a successful evaluation.
 *
 * Future vendor-specific adapters (Wiegand, OSDP, etc.) implement the same
 * interface and slot in via `lib/access/adapter-factory.ts`.
 */
import 'server-only'

/**
 * Decision returned by `evaluateAccess` / surfaced by `/api/access/verify`.
 *
 * `allow` is the only field a tornello strictly needs; the rest is for the
 * tablet UI ("Bentornato Mario!") and audit logging.
 */
export type EntryDecision = {
  allow: boolean
  reason?: DenyReason
  member_id?: string
  member_name?: string
  subscription_id?: string
  /** User-facing message in Italian — safe to render as-is on a display. */
  message: string
}

/**
 * Closed set of denial codes. Every DENY decision logged into
 * `access_logs.denial_reason` MUST be one of these so dashboards and
 * filters stay honest. Adding a new reason means updating this union and
 * the corresponding switch in `evaluate.ts` + the UI label table.
 */
export type DenyReason =
  | 'unknown_badge'
  | 'no_subscription'
  | 'expired'
  | 'suspended'
  | 'cancelled'
  | 'invalid_token'
  | 'wrong_gym'
  | 'problematic_member'

export type AdapterConfig = {
  baseUrl?: string
  apiKey?: string
}

/**
 * Outcome of a hardware action — `ok=true` even when the action is a no-op
 * (mock adapter). `error` carries the first user-readable failure for the
 * audit trail.
 */
export type HardwareResult = { ok: true } | { ok: false; error: string }

export interface AccessControlAdapter {
  /** Human label of the adapter — used in logs and the settings UI. */
  readonly name: string

  /**
   * Open the physical varco for `durationMs`. The adapter is free to ignore
   * the duration if the hardware self-times. Resolves once the command was
   * accepted by the hardware (or no-op for mock).
   */
  grantAccess(opts: {
    deviceId: string
    decision: EntryDecision
    durationMs?: number
  }): Promise<HardwareResult>

  /**
   * Show a short message on the vendor display, if any. No-op for headless
   * setups. Always resolves — failures are reported via `HardwareResult`,
   * not thrown, so callers can keep logging.
   */
  displayMessage(opts: {
    deviceId: string
    message: string
    durationMs?: number
  }): Promise<HardwareResult>
}
