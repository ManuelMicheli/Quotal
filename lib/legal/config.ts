/**
 * Centralised legal configuration for Quotal.
 *
 * The MVP is single-tenant — each Quotal install belongs to one gym (and to
 * the SaaS owner that operates Quotal itself). The placeholders below MUST
 * be replaced with the real values of the company that runs the SaaS, and
 * with the gym-specific data, before the app goes live.
 *
 * The values here drive:
 *   - Privacy policy and Terms of service rendering (`/privacy`, `/termini`)
 *   - The legal footer (`components/shared/legal-footer.tsx`)
 *   - Email "from" / sender identification footers
 *
 * Anything marked `XXX` or `'IT00000000000'` is a placeholder that the
 * titolare must update before publishing.
 */

export type LegalAddress = {
  address: string
  city: string
  province: string
  postal_code: string
  country: string
}

export type LegalConfig = {
  company: {
    /** Ragione sociale (e.g. "Quotal di Manuel Micheli"). */
    name: string
    /** Forma giuridica ("Ditta individuale", "S.r.l.", ...). */
    legal_form: string
    /** Partita IVA italiana (formato: "ITxxxxxxxxxxx"). */
    vat_number: string
    /** Codice fiscale (per ditta individuale = c.f. del titolare). */
    fiscal_code: string
    /** Numero REA, opzionale fino a iscrizione CCIAA. */
    rea_number: string | null
    /** Camera di Commercio competente. */
    chamber_of_commerce: string
    headquarters: LegalAddress
    email: string
    /** Indirizzo PEC (consigliato per business). */
    pec: string | null
    phone: string | null
  }
  data_controller: {
    name: string
    email: string
    role: string
  }
  /** Data Protection Officer, se nominato. */
  dpo: { name: string; email: string } | null
  app: {
    url: string
    support_email: string
    privacy_email: string
  }
  /** Link facoltativi al provider iubenda — quando popolati il footer mostra anche i link Iubenda. */
  iubenda: {
    privacy_policy_id: string | null
    cookie_policy_id: string | null
    terms_id: string | null
  }
}

export const LEGAL_CONFIG: LegalConfig = {
  company: {
    name: 'Quotal di Manuel Micheli',
    legal_form: 'Ditta individuale',
    vat_number: 'IT00000000000',
    fiscal_code: 'XXXXXXXXXXXXXXXX',
    rea_number: null,
    chamber_of_commerce: 'Milano',
    headquarters: {
      address: 'Via XXX, 1',
      city: 'Ossona',
      province: 'MI',
      postal_code: '20010',
      country: 'IT',
    },
    email: 'info@quotal.it',
    pec: null,
    phone: null,
  },
  data_controller: {
    name: 'Manuel Micheli',
    email: 'privacy@quotal.it',
    role: 'Titolare del trattamento',
  },
  dpo: null,
  app: {
    url: 'https://quotal.it',
    support_email: 'support@quotal.it',
    privacy_email: 'privacy@quotal.it',
  },
  iubenda: {
    privacy_policy_id: null,
    cookie_policy_id: null,
    terms_id: null,
  },
}

/**
 * Compact one-line representation, used by the email footer and the
 * `<LegalFooter />` component on auth screens.
 */
export function legalEntityLine(): string {
  const c = LEGAL_CONFIG.company
  const parts = [
    c.name,
    `P.IVA ${c.vat_number}`,
    c.rea_number ? `REA ${c.chamber_of_commerce}-${c.rea_number}` : null,
    `${c.headquarters.address}`,
    `${c.headquarters.postal_code} ${c.headquarters.city} (${c.headquarters.province})`,
  ].filter(Boolean)
  return parts.join(' · ')
}
