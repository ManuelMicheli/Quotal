#!/usr/bin/env node
/**
 * Bootstrap shim for verify-email — re-execs through `npx tsx` so the
 * dynamic .ts/.tsx imports of the templates work without a separate
 * build step. The actual logic lives in `verify-email.mts`.
 *
 * Usage: `node scripts/verify-email.mjs`
 */
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const target = resolve(__dirname, 'verify-email.ts')

const isWindows = process.platform === 'win32'
const result = spawnSync(
  isWindows ? 'npx.cmd' : 'npx',
  ['tsx', target],
  // shell: true on Windows so npx.cmd resolves correctly under bash.
  { stdio: 'inherit', shell: isWindows },
)
process.exit(result.status ?? 1)
