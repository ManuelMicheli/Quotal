/**
 * Generic REST access-control adapter.
 *
 * Sends grant/display commands as `POST <baseUrl>/<endpoint>` with a
 * bearer token. The exact endpoint paths are conventional — vendors that
 * disagree should subclass and override. Returns a HardwareResult that
 * never throws so the verify route can keep going and log the audit row.
 *
 * Request contract:
 *   POST {baseUrl}/open
 *     headers: { Authorization: "Bearer {apiKey}", Content-Type: "application/json" }
 *     body:    { device_id, member_id?, member_name?, duration_ms }
 *     reply:   { ok: true } or { ok: false, error: "..." } (200 status either way)
 *
 *   POST {baseUrl}/display
 *     headers: same
 *     body:    { device_id, message, duration_ms }
 *     reply:   same shape
 *
 * The 5-second hard timeout protects the verify request from a hung
 * vendor — better to log a hardware failure than block the member at the
 * door for 30+ seconds.
 */
import 'server-only'

import type {
  AccessControlAdapter,
  AdapterConfig,
  EntryDecision,
  HardwareResult,
} from './types'

const DEFAULT_TIMEOUT_MS = 5_000

export class RestAdapter implements AccessControlAdapter {
  readonly name = 'rest'

  private readonly baseUrl: string
  private readonly apiKey: string

  constructor(config: AdapterConfig) {
    if (!config.baseUrl) {
      throw new Error(
        'RestAdapter requires ACCESS_CONTROL_BASE_URL to be set.',
      )
    }
    if (!config.apiKey) {
      throw new Error(
        'RestAdapter requires ACCESS_CONTROL_API_KEY to be set.',
      )
    }
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
    this.apiKey = config.apiKey
  }

  async grantAccess(opts: {
    deviceId: string
    decision: EntryDecision
    durationMs?: number
  }): Promise<HardwareResult> {
    return this.post('/open', {
      device_id: opts.deviceId,
      member_id: opts.decision.member_id ?? null,
      member_name: opts.decision.member_name ?? null,
      duration_ms: opts.durationMs ?? 3000,
    })
  }

  async displayMessage(opts: {
    deviceId: string
    message: string
    durationMs?: number
  }): Promise<HardwareResult> {
    return this.post('/display', {
      device_id: opts.deviceId,
      message: opts.message,
      duration_ms: opts.durationMs ?? 3000,
    })
  }

  private async post(
    path: string,
    body: Record<string, unknown>,
  ): Promise<HardwareResult> {
    const url = `${this.baseUrl}${path}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      if (!res.ok) {
        return {
          ok: false,
          error: `vendor responded ${res.status} ${res.statusText}`,
        }
      }
      // Vendors are inconsistent about returning JSON — be lenient.
      const text = await res.text()
      if (!text) return { ok: true }
      try {
        const parsed = JSON.parse(text) as { ok?: boolean; error?: string }
        if (parsed.ok === false) {
          return { ok: false, error: parsed.error ?? 'vendor reported failure' }
        }
        return { ok: true }
      } catch {
        // Non-JSON 200 — assume success.
        return { ok: true }
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.name === 'AbortError'
            ? 'vendor timeout'
            : err.message
          : String(err)
      return { ok: false, error: message }
    } finally {
      clearTimeout(timer)
    }
  }
}
