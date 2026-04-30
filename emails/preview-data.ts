/**
 * Mock data used by `scripts/verify-email.mjs` and (optionally) the
 * React Email dev server. Kept here so the templates can be inspected
 * out-of-the-box without touching a live database.
 */
import type { GymBrand } from './_components/email-layout'

export const previewGym: GymBrand = {
  name: 'Palestra Fitness Roma',
  logo_url: null,
  brand_color: '#0F766E',
  address: 'Via dello Sport 12, 00100 Roma',
  email: 'info@palestrafitness.it',
}

export const previewMember = {
  full_name: 'Mario Rossi',
  email: 'mario.rossi@example.com',
}

export const previewOwner = {
  full_name: 'Anna Bianchi',
  email: 'anna@palestrafitness.it',
}

export const previewPlan = {
  name: 'Mensile Full',
  price_cents: 4500,
}

export const APP_URL = 'http://localhost:3000'

/**
 * Per-template prop bundles. Keys MUST match the template barrel keys in
 * `emails/index.ts`. Each value is the props the template needs to
 * render correctly.
 */
export const previewProps = {
  welcome: {
    member: previewMember,
    gym: previewGym,
    plan: previewPlan,
    end_date: '2026-05-29',
    app_url: APP_URL,
  },
  expiry_7d: {
    member: previewMember,
    gym: previewGym,
    end_date: '2026-05-06',
    plan: previewPlan,
    app_url: APP_URL,
  },
  expiry_3d: {
    member: previewMember,
    gym: previewGym,
    end_date: '2026-05-02',
    plan: previewPlan,
    app_url: APP_URL,
  },
  expiry_today: {
    member: previewMember,
    gym: previewGym,
    end_date: '2026-04-29',
    plan: previewPlan,
    app_url: APP_URL,
  },
  post_expiry_3d: {
    member: previewMember,
    gym: previewGym,
    end_date: '2026-04-26',
    plan: previewPlan,
    app_url: APP_URL,
  },
  sepa_failed: {
    member: previewMember,
    gym: previewGym,
    amount_cents: 4500,
    failure_reason: 'Fondi insufficienti sul conto',
    app_url: APP_URL,
  },
  sepa_succeeded: {
    member: previewMember,
    gym: previewGym,
    amount_cents: 4500,
    end_date: '2026-05-29',
    receipt_number: 'R/2026/0042',
    app_url: APP_URL,
  },
  receipt: {
    member: previewMember,
    gym: previewGym,
    receipt_number: 'R/2026/0042',
    amount_cents: 4500,
    paid_at: '2026-04-29',
    payment_method: 'card',
    app_url: APP_URL,
  },
  subscription_renewed: {
    member: previewMember,
    gym: previewGym,
    end_date: '2026-05-29',
    plan: previewPlan,
    app_url: APP_URL,
  },
  subscription_suspended: {
    member: previewMember,
    gym: previewGym,
    reason: 'Certificato medico',
    app_url: APP_URL,
  },
  subscription_resumed: {
    member: previewMember,
    gym: previewGym,
    end_date: '2026-06-15',
    days_added: 17,
    app_url: APP_URL,
  },
  daily_digest_owner: {
    member: previewOwner,
    gym: previewGym,
    for_date: '2026-04-29',
    expiring_today: 2,
    expiring_7d: 7,
    failed_payments: 1,
    pending_cash_close: true,
    app_url: APP_URL,
  },
  payment_failed_owner: {
    member: previewOwner,
    gym: previewGym,
    failed_member_name: 'Giulia Verdi',
    amount_cents: 4500,
    failure_reason: 'insufficient_funds',
    payment_id: '00000000-0000-0000-0000-000000000000',
    app_url: APP_URL,
  },
  new_member_owner: {
    member: previewOwner,
    gym: previewGym,
    new_member: { full_name: 'Luca Esposito', email: 'luca@example.com' },
    app_url: APP_URL,
  },
  monthly_owner_report: {
    member: previewOwner,
    gym: previewGym,
    month_label: 'Marzo 2026',
    total_revenue_cents: 458000,
    new_members: 12,
    active_members: 184,
    expired_members: 7,
    app_url: APP_URL,
  },
} as const
