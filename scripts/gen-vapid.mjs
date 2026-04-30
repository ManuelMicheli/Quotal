#!/usr/bin/env node
/**
 * Generate a fresh VAPID keypair for web-push.
 *
 * Usage: `node scripts/gen-vapid.mjs`
 *
 * Prints the keys + paste-ready .env.local snippet. The VAPID public
 * key is exposed to the browser (NEXT_PUBLIC_VAPID_PUBLIC_KEY) so the
 * SW can subscribe; the private key MUST stay server-side.
 *
 * Re-run this only when rotating keys (existing browser subscriptions
 * become invalid — every member will need to re-enable notifications).
 */
import webpush from 'web-push'

const keys = webpush.generateVAPIDKeys()

const banner =
  '[36m================================================================[0m'

console.log(banner)
console.log('  Quotal — VAPID keys generated successfully')
console.log(banner)
console.log('')
console.log('Public key  :', keys.publicKey)
console.log('Private key :', keys.privateKey)
console.log('')
console.log('--- Paste these into .env.local ---')
console.log('')
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`)
console.log('')
console.log(banner)
console.log('Notes:')
console.log(
  '  - Public key MUST also be exposed to the client as NEXT_PUBLIC_VAPID_PUBLIC_KEY.',
)
console.log(
  '  - NEVER commit the private key — keep it in .env.local / your secret manager.',
)
console.log(
  '  - Rotating keys invalidates every existing push subscription. Members will',
)
console.log(
  '    need to re-enable notifications from /app/profilo.',
)
console.log(banner)
