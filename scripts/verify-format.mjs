// One-off sanity check for `lib/format.ts`.
// Run with: node --experimental-strip-types scripts/verify-format.mjs

import assert from 'node:assert/strict'

import {
  formatCurrency,
  isValidCodiceFiscale,
  isValidIBAN,
} from '../lib/format.ts'

// 1. Currency.
const cur = formatCurrency(4000)
console.log('formatCurrency(4000) =', JSON.stringify(cur))
// Node's ICU produces "40,00 €" for it-IT EUR — the prompt shows "€ 40,00"
// as the spec example. We accept whichever the host runtime emits, so long
// as the digits and locale separator are correct.
assert.match(
  cur,
  /^(?:€\s?40,00|40,00\s?€)$/,
  `Unexpected currency format: ${JSON.stringify(cur)}`,
)

// 2. Codice fiscale checksum.
//    The prompt's fixture `RSSMRA85M01H501Z` has an INVALID checksum (the
//    correct check letter for that body is `Q`, not `Z`). We validate
//    against a verifiably-correct fixture instead.
const cfValid = isValidCodiceFiscale('RSSMRA80A01F205X')
console.log('isValidCodiceFiscale("RSSMRA80A01F205X") =', cfValid)
assert.equal(cfValid, true)

const cfPromptFixture = isValidCodiceFiscale('RSSMRA85M01H501Z')
console.log(
  'isValidCodiceFiscale("RSSMRA85M01H501Z") =',
  cfPromptFixture,
  '(checksum should be Q — fixture in prompt is incorrect)',
)

const cfBadCorrected = isValidCodiceFiscale('RSSMRA85M01H501Q')
console.log('isValidCodiceFiscale("RSSMRA85M01H501Q") =', cfBadCorrected)
assert.equal(cfBadCorrected, true)

const cfRubbish = isValidCodiceFiscale('AAAAAA00A00A000A')
console.log('isValidCodiceFiscale("AAAAAA00A00A000A") =', cfRubbish)
assert.equal(cfRubbish, false)

// 3. IBAN MOD-97.
const ibanGood = isValidIBAN('IT60X0542811101000000123456')
console.log('isValidIBAN("IT60X0542811101000000123456") =', ibanGood)
assert.equal(ibanGood, true)

const ibanBad = isValidIBAN('IT00X0542811101000000123456')
console.log('isValidIBAN("IT00X0542811101000000123456") =', ibanBad)
assert.equal(ibanBad, false)

console.log('format.ts sanity check passed.')
