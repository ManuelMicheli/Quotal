#!/usr/bin/env node
/**
 * Sync Stripe Products + Prices from `subscription_plans`.
 *
 * Run after creating or editing plans in the dashboard:
 *
 *     STRIPE_SECRET_KEY=sk_test_... \
 *     SUPABASE_SERVICE_ROLE_KEY=... \
 *     NEXT_PUBLIC_SUPABASE_URL=https://....supabase.co \
 *     node scripts/sync-stripe-prices.mjs
 *
 * For each plan:
 *   - if `stripe_price_id` is null → create a Product + Price (one-time, EUR),
 *     persist `stripe_price_id`.
 *   - if it exists → log + skip. Stripe Prices are immutable; if the price
 *     changed in our DB, this script does NOT update Stripe automatically.
 *     Drop the `stripe_price_id` column manually before re-running, then it
 *     will create a new Price.
 *
 * Pure ESM, zero dependencies beyond the SDKs already installed in the
 * project.
 */
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const STRIPE_API_VERSION = '2026-04-22.dahlia'

function envOrDie(name) {
  const v = process.env[name]
  if (!v) {
    console.error(`Missing required env var: ${name}`)
    process.exit(1)
  }
  return v
}

async function main() {
  const stripe = new Stripe(envOrDie('STRIPE_SECRET_KEY'), {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
    appInfo: { name: 'Quotal', version: '0.1.0' },
  })

  const supabase = createClient(
    envOrDie('NEXT_PUBLIC_SUPABASE_URL'),
    envOrDie('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data: plans, error } = await supabase
    .from('subscription_plans')
    .select('id, gym_id, name, description, price_cents, is_active, stripe_price_id')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to load plans:', error.message)
    process.exit(1)
  }

  let created = 0
  let skipped = 0
  for (const plan of plans ?? []) {
    if (!plan.is_active) {
      skipped++
      console.log(`- skip ${plan.name} (inactive)`)
      continue
    }
    if (plan.stripe_price_id) {
      skipped++
      console.log(`- skip ${plan.name} (already synced as ${plan.stripe_price_id})`)
      continue
    }

    const product = await stripe.products.create({
      name: `Abbonamento ${plan.name}`,
      description: plan.description ?? undefined,
      metadata: { plan_id: plan.id, gym_id: plan.gym_id },
    })
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.price_cents,
      currency: 'eur',
      metadata: { plan_id: plan.id },
    })
    const { error: upErr } = await supabase
      .from('subscription_plans')
      .update({ stripe_price_id: price.id })
      .eq('id', plan.id)
    if (upErr) {
      console.error(`! failed to persist Stripe Price for ${plan.name}: ${upErr.message}`)
      continue
    }
    created++
    console.log(`+ ${plan.name}: product ${product.id}, price ${price.id}`)
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped}.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
