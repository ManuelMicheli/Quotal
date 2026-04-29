/**
 * Italian-locale formatting and validation utilities.
 *
 * Currency, dates, phone numbers, codice fiscale, and IBAN — all the
 * everyday primitives the rest of the app needs. Pure, no side effects.
 */
import { format as formatFn, formatDistanceToNow, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

const currencyFormatter = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Format an integer cent amount as a localized euro string.
 *
 * @param cents Integer amount in cents (e.g. `4000` → 40,00 €).
 * @returns Localized currency string, e.g. `"40,00 €"` (the exact glyph and
 *   spacing are produced by `Intl.NumberFormat` for locale `it-IT`).
 *
 * @example
 *   formatCurrency(4000) // "40,00 €"
 *   formatCurrency(0)    // "0,00 €"
 */
export function formatCurrency(cents: number): string {
  return currencyFormatter.format(cents / 100)
}

function toDate(input: Date | string): Date {
  return typeof input === 'string' ? parseISO(input) : input
}

/**
 * Format a date in Italian locale.
 *
 * @param date Date instance or ISO string.
 * @param format Output style:
 *   - `'short'` → `15/03/2026`
 *   - `'long'`  → `15 marzo 2026`
 *   - `'full'`  → `sabato 15 marzo 2026`
 * @returns Formatted date string.
 */
export function formatDate(
  date: Date | string,
  format: 'short' | 'long' | 'full' = 'short',
): string {
  const d = toDate(date)
  switch (format) {
    case 'short':
      return formatFn(d, 'dd/MM/yyyy', { locale: it })
    case 'long':
      return formatFn(d, 'd MMMM yyyy', { locale: it })
    case 'full':
      return formatFn(d, 'EEEE d MMMM yyyy', { locale: it })
  }
}

/**
 * Format a date as a human-friendly relative string in Italian.
 *
 * @example
 *   formatRelativeDate(new Date()) // "oggi"
 *   formatRelativeDate(tomorrow)   // "domani"
 *   formatRelativeDate(yesterday)  // "ieri"
 *   formatRelativeDate(in3Days)    // "tra 3 giorni"
 *   formatRelativeDate(5DaysAgo)   // "5 giorni fa"
 */
export function formatRelativeDate(date: Date | string): string {
  const d = toDate(date)
  if (isToday(d)) return 'oggi'
  if (isTomorrow(d)) return 'domani'
  if (isYesterday(d)) return 'ieri'
  return formatDistanceToNow(d, { locale: it, addSuffix: true })
}

/**
 * Normalize an Italian phone number to the canonical `+39 XXX XXXXXXX` form.
 *
 * Best-effort: strips spaces, dots, dashes and parens, ensures the `+39`
 * country prefix, and inserts a single space between prefix, area code, and
 * subscriber number. Falls back to the trimmed input when the digit count is
 * unexpected.
 *
 * @example
 *   formatPhone('3331234567')        // "+39 333 1234567"
 *   formatPhone('+39 333 1234567')   // "+39 333 1234567"
 *   formatPhone('0039-333-1234567')  // "+39 333 1234567"
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/[\s().-]/g, '')
  let digits = cleaned
  if (digits.startsWith('+')) {
    digits = digits.slice(1)
  }
  if (digits.startsWith('0039')) {
    digits = digits.slice(4)
  } else if (digits.startsWith('39') && digits.length >= 11) {
    digits = digits.slice(2)
  }
  if (digits.length < 9 || digits.length > 11 || !/^\d+$/.test(digits)) {
    return phone.trim()
  }
  // Italian mobile/landline: split first 3 digits as area/operator code.
  const head = digits.slice(0, 3)
  const tail = digits.slice(3)
  return `+39 ${head} ${tail}`
}

// ---------------------------------------------------------------------------
// Codice fiscale validation (16 char alphanumeric + checksum).
// Algorithm reference: D.M. 23 dicembre 1976 — Tabella di calcolo del codice
// di controllo del codice fiscale.
// ---------------------------------------------------------------------------

const CF_REGEX = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/

const CF_ODD_VALUES: Record<string, number> = {
  '0': 1,
  '1': 0,
  '2': 5,
  '3': 7,
  '4': 9,
  '5': 13,
  '6': 15,
  '7': 17,
  '8': 19,
  '9': 21,
  A: 1,
  B: 0,
  C: 5,
  D: 7,
  E: 9,
  F: 13,
  G: 15,
  H: 17,
  I: 19,
  J: 21,
  K: 2,
  L: 4,
  M: 18,
  N: 20,
  O: 11,
  P: 3,
  Q: 6,
  R: 8,
  S: 12,
  T: 14,
  U: 16,
  V: 10,
  W: 22,
  X: 25,
  Y: 24,
  Z: 23,
}

const CF_EVEN_VALUES: Record<string, number> = {
  '0': 0,
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
  F: 5,
  G: 6,
  H: 7,
  I: 8,
  J: 9,
  K: 10,
  L: 11,
  M: 12,
  N: 13,
  O: 14,
  P: 15,
  Q: 16,
  R: 17,
  S: 18,
  T: 19,
  U: 20,
  V: 21,
  W: 22,
  X: 23,
  Y: 24,
  Z: 25,
}

const CF_CHECK_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/**
 * Validate an Italian codice fiscale (CF) for individuals.
 *
 * Performs full structural and checksum validation per D.M. 23/12/1976:
 *  1. 16 alphanumeric chars, with the documented `letter`/`omocodia` pattern.
 *  2. Compute checksum: positions 1–15 (1-indexed) are mapped through odd or
 *     even tables, summed, taken mod 26, and matched to the 16th character
 *     `A`-`Z`.
 *
 * Does NOT verify that the embedded municipal code (Belfiore) and date of
 * birth correspond to a real person — only that the codice itself is well-
 * formed.
 *
 * @example
 *   isValidCodiceFiscale('RSSMRA85M01H501Z') // true
 *   isValidCodiceFiscale('rssmra85m01h501z') // true (case-insensitive)
 *   isValidCodiceFiscale('AAAAAA00A00A000A') // false (bad checksum)
 */
export function isValidCodiceFiscale(cf: string): boolean {
  if (typeof cf !== 'string') return false
  const normalized = cf.trim().toUpperCase()
  if (normalized.length !== 16) return false
  if (!CF_REGEX.test(normalized)) return false

  let sum = 0
  for (let i = 0; i < 15; i++) {
    const ch = normalized[i]!
    // Positions are 1-indexed in the spec: odd positions 1,3,5... → index 0,2,4...
    const isOdd = i % 2 === 0
    const value = isOdd ? CF_ODD_VALUES[ch] : CF_EVEN_VALUES[ch]
    if (value === undefined) return false
    sum += value
  }
  const expected = CF_CHECK_CHARS[sum % 26]
  return expected === normalized[15]
}

// ---------------------------------------------------------------------------
// IBAN validation (Italian format + ISO 13616 MOD-97 check).
// ---------------------------------------------------------------------------

const IT_IBAN_REGEX = /^IT\d{2}[A-Z]\d{10}[0-9A-Z]{12}$/

/**
 * Validate an Italian IBAN.
 *
 * Structure: `IT` + 2 check digits + 1 CIN letter + 5 ABI digits + 5 CAB
 * digits + 12 alphanumeric account characters → 27 chars total.
 *
 * Verifies both the structural shape and the ISO 13616 MOD-97 checksum:
 *  1. Move the first 4 chars to the end.
 *  2. Replace each letter with its position in the alphabet + 9 (A=10, B=11,
 *     …, Z=35), producing a long numeric string.
 *  3. The integer mod 97 must equal 1.
 *
 * @example
 *   isValidIBAN('IT60X0542811101000000123456') // true
 *   isValidIBAN('IT60 X054 2811 1010 0000 0123 456') // true (spaces ok)
 *   isValidIBAN('IT00X0542811101000000123456') // false (bad check digits)
 */
export function isValidIBAN(iban: string): boolean {
  if (typeof iban !== 'string') return false
  const normalized = iban.replace(/\s+/g, '').toUpperCase()
  if (normalized.length !== 27) return false
  if (!IT_IBAN_REGEX.test(normalized)) return false

  // Move first 4 chars to the end and convert letters to digits (A=10..Z=35).
  const rearranged = normalized.slice(4) + normalized.slice(0, 4)
  let numeric = ''
  for (const ch of rearranged) {
    if (ch >= '0' && ch <= '9') {
      numeric += ch
    } else if (ch >= 'A' && ch <= 'Z') {
      numeric += (ch.charCodeAt(0) - 55).toString()
    } else {
      return false
    }
  }

  // MOD-97 on a string of arbitrary length, processed in chunks to stay
  // within Number.MAX_SAFE_INTEGER.
  let remainder = 0
  for (let i = 0; i < numeric.length; i += 7) {
    const chunk = remainder.toString() + numeric.slice(i, i + 7)
    remainder = Number(chunk) % 97
  }
  return remainder === 1
}
