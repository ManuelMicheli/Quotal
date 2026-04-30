/**
 * Adapter selection — single source of truth for which `AccessControlAdapter`
 * implementation the verify route uses at runtime.
 *
 * Driven by `ACCESS_CONTROL_ADAPTER` (default `mock`). The instance is
 * memoised because the `RestAdapter` validates env at construction time and
 * we want to fail loudly *once* during the first request rather than on
 * every call.
 */
import 'server-only'

import { env } from '@/lib/env'

import { MockAdapter } from './adapters/mock-adapter'
import { RestAdapter } from './adapters/rest-adapter'
import type { AccessControlAdapter } from './adapters/types'

let cached: AccessControlAdapter | null = null

export function getAccessAdapter(): AccessControlAdapter {
  if (cached) return cached
  switch (env.ACCESS_CONTROL_ADAPTER) {
    case 'rest':
      cached = new RestAdapter({
        baseUrl: env.ACCESS_CONTROL_BASE_URL,
        apiKey: env.ACCESS_CONTROL_API_KEY,
      })
      break
    case 'mock':
    default:
      cached = new MockAdapter()
  }
  return cached
}

/**
 * Test helper — reset the cached adapter so unit tests can switch modes
 * within the same process. NEVER call from app code.
 */
export function __resetAccessAdapter(): void {
  cached = null
}
