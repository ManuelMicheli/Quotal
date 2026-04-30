/**
 * Resend SDK wrapper.
 *
 * Lazy-creates the client so the rest of the app can build/run with
 * placeholder env values; the first call site that actually wants to send
 * mail throws a clear error if the key is missing. The dispatcher handles
 * that case gracefully — no Resend call ever happens during build.
 *
 * Server-only. Never import from a client component.
 */
import 'server-only'

import { Resend } from 'resend'

import { env } from '@/lib/env'

let cached: Resend | null = null

export class ResendNotConfiguredError extends Error {
  constructor() {
    super(
      'Resend non configurato: imposta RESEND_API_KEY e RESEND_FROM_EMAIL in .env.local.',
    )
    this.name = 'ResendNotConfiguredError'
  }
}

export function isResendConfigured(): boolean {
  return Boolean(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL)
}

/**
 * Lazy-resolves the Resend client. Throws `ResendNotConfiguredError` if
 * the API key is missing — call sites should catch and degrade (the
 * dispatcher logs and skips the send).
 */
export function getResend(): Resend {
  if (!env.RESEND_API_KEY) {
    throw new ResendNotConfiguredError()
  }
  if (!cached) {
    cached = new Resend(env.RESEND_API_KEY)
  }
  return cached
}

/** Verified sender address. Format: `"Display Name <addr@domain>"` or bare addr. */
export function getFromAddress(): string {
  if (!env.RESEND_FROM_EMAIL) {
    throw new ResendNotConfiguredError()
  }
  return env.RESEND_FROM_EMAIL
}

/** Optional reply-to header — falls back to the from address. */
export function getReplyToAddress(): string | undefined {
  return env.RESEND_REPLY_TO
}
