/**
 * Verify Phase 09 email templates by rendering each one to disk under
 * `tmp/email-previews/`. Open the HTML files in a browser to inspect.
 *
 * Run via: `node scripts/verify-email.mjs` (the .mjs is a tsx bootstrap
 * shim that calls into this file).
 *
 * Does NOT call Resend — purely static HTML render via @react-email.
 * Confirms each template renders > 1 KB and contains the gym name and
 * "Powered by Quotal" footer.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { render } from '@react-email/components'
import * as React from 'react'

import { previewProps } from '../emails/preview-data'
import WelcomeEmail from '../emails/welcome'
import Expiry7dEmail from '../emails/expiry-7d'
import Expiry3dEmail from '../emails/expiry-3d'
import ExpiryTodayEmail from '../emails/expiry-today'
import PostExpiry3dEmail from '../emails/post-expiry-3d'
import SepaFailedEmail from '../emails/sepa-failed'
import SepaSucceededEmail from '../emails/sepa-succeeded'
import ReceiptEmail from '../emails/receipt'
import SubscriptionRenewedEmail from '../emails/subscription-renewed'
import SubscriptionSuspendedEmail from '../emails/subscription-suspended'
import SubscriptionResumedEmail from '../emails/subscription-resumed'
import DailyDigestOwnerEmail from '../emails/daily-digest-owner'
import PaymentFailedOwnerEmail from '../emails/payment-failed-owner'
import NewMemberOwnerEmail from '../emails/new-member-owner'
import MonthlyOwnerReportEmail from '../emails/monthly-owner-report'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = resolve(__dirname, '..')

type AnyTemplate = React.FC<Record<string, unknown>>

const templates: Record<string, AnyTemplate> = {
  welcome: WelcomeEmail as AnyTemplate,
  expiry_7d: Expiry7dEmail as AnyTemplate,
  expiry_3d: Expiry3dEmail as AnyTemplate,
  expiry_today: ExpiryTodayEmail as AnyTemplate,
  post_expiry_3d: PostExpiry3dEmail as AnyTemplate,
  sepa_failed: SepaFailedEmail as AnyTemplate,
  sepa_succeeded: SepaSucceededEmail as AnyTemplate,
  receipt: ReceiptEmail as AnyTemplate,
  subscription_renewed: SubscriptionRenewedEmail as AnyTemplate,
  subscription_suspended: SubscriptionSuspendedEmail as AnyTemplate,
  subscription_resumed: SubscriptionResumedEmail as AnyTemplate,
  daily_digest_owner: DailyDigestOwnerEmail as AnyTemplate,
  payment_failed_owner: PaymentFailedOwnerEmail as AnyTemplate,
  new_member_owner: NewMemberOwnerEmail as AnyTemplate,
  monthly_owner_report: MonthlyOwnerReportEmail as AnyTemplate,
}

const outDir = resolve(projectRoot, 'tmp', 'email-previews')
mkdirSync(outDir, { recursive: true })

let failed = 0
let succeeded = 0

async function main() {
  for (const [key, Template] of Object.entries(templates)) {
    const props = (previewProps as Record<string, Record<string, unknown> | undefined>)[key]
    if (!props) {
      console.error(`  [SKIP] ${key} — no preview props in emails/preview-data.ts`)
      failed++
      continue
    }
    try {
      const html = await render(React.createElement(Template, props))
      const path = resolve(outDir, `${key.replace(/_/g, '-')}.html`)
      writeFileSync(path, html, 'utf8')

      const sizeOk = html.length > 1024
      const gymProp = (props as { gym?: { name?: string } }).gym
      const gymOk = gymProp?.name ? html.includes(gymProp.name) : false
      const footerOk = html.includes('Powered by') && html.includes('Quotal')

      const status = sizeOk && gymOk && footerOk ? 'OK' : 'WARN'
      if (status === 'WARN') failed++
      else succeeded++

      const rel = path.replace(projectRoot, '.').replace(/\\/g, '/')
      console.log(
        `  [${status}] ${key.padEnd(24)}  ${html.length.toString().padStart(6)} bytes  ->  ${rel}`,
      )
    } catch (err) {
      failed++
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  [FAIL] ${key} — ${msg}`)
    }
  }

  console.log('')
  console.log('---------------------------------------------------------')
  console.log(`  Templates: ${succeeded} ok, ${failed} warn/fail`)
  console.log(`  Output:    ${outDir}`)
  console.log('---------------------------------------------------------')

  if (failed > 0) process.exit(1)
}

void main()
