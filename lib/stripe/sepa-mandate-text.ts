/**
 * SEPA Direct Debit mandate text.
 *
 * Stripe requires the merchant to display approved mandate text to the
 * customer at SetupIntent / PaymentIntent confirmation time. We use Stripe's
 * own canonical Italian phrasing (per the SEPA scheme rulebook) so we don't
 * roll our own legal text.
 *
 * The `{creditorName}` placeholder is filled with `gym.name` at render time.
 * Stripe also shows their own confirmation banner above the IBAN element —
 * this text is the explicit on-page consent that the user clicks.
 */
export function sepaMandateText(creditorName: string, locale: 'it' | 'en' = 'it'): string {
  if (locale === 'en') {
    return [
      `By providing your IBAN and confirming this payment, you authorize`,
      `${creditorName} and Stripe, our payment service provider, to send`,
      `instructions to your bank to debit your account, and your bank to`,
      `debit your account in accordance with those instructions.`,
      ``,
      `You are entitled to a refund from your bank under the terms and`,
      `conditions of your agreement with your bank. A refund must be`,
      `claimed within 8 weeks starting from the date on which your account`,
      `was debited.`,
    ].join(' ')
  }
  return [
    `Fornendo il tuo IBAN e confermando questo pagamento, autorizzi`,
    `${creditorName} e Stripe (il nostro fornitore di servizi di pagamento)`,
    `a inviare istruzioni alla tua banca per addebitare il tuo conto, e la`,
    `tua banca ad addebitare il conto secondo tali istruzioni.`,
    ``,
    `Hai diritto al rimborso da parte della tua banca secondo i termini`,
    `del contratto stipulato con essa. Un eventuale rimborso deve essere`,
    `richiesto entro 8 settimane dalla data dell'addebito sul tuo conto.`,
  ].join(' ')
}
