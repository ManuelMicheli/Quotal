/**
 * PDF receipt template — Italian "ricevuta non fiscale" / "fattura".
 *
 * Server-side React-PDF document. Uses the renderer's built-in Helvetica font
 * to keep the bundle slim (no remote font fetch at PDF time, no system font
 * dependency). The visual style is intentionally austere so the document
 * prints cleanly on any printer and in B/W.
 *
 * Branding: gym name + (optional) VAT/fiscal code in the header, plus the
 * mandatory "Powered by Quotal" footer in 8pt grey.
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'

import { formatCurrency, formatDate } from '@/lib/format'

export type ReceiptKind = 'receipt' | 'invoice'

export type ReceiptGym = {
  name: string
  address?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  email?: string | null
  phone?: string | null
  vat_number?: string | null
  fiscal_code?: string | null
}

export type ReceiptMember = {
  full_name: string
  email?: string | null
  phone?: string | null
  fiscal_code?: string | null
  address?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
}

export type ReceiptPlan = {
  name: string
  duration_days: number
}

export type ReceiptPayment = {
  receipt_number: string | null
  invoice_number: string | null
  amount_cents: number
  payment_method: string
  paid_at: string | null
  notes?: string | null
}

export type ReceiptSubscriptionPeriod = {
  start: string | Date
  end: string | Date
}

export type ReceiptDocumentProps = {
  kind: ReceiptKind
  gym: ReceiptGym
  member: ReceiptMember
  plan: ReceiptPlan
  payment: ReceiptPayment
  subscriptionPeriod: ReceiptSubscriptionPeriod
  /**
   * Marca da bollo flag — set true for fattura > €77.47 in regime forfettario.
   * Owner can override via gym.settings; for now the action passes a boolean.
   */
  withVirtualStamp?: boolean
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 48,
    paddingVertical: 56,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#0A0A0A',
    backgroundColor: '#FFFFFF',
    lineHeight: 1.4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 16,
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E5E4',
  },
  gymName: { fontFamily: 'Helvetica-Bold', fontSize: 16, marginBottom: 4 },
  gymMeta: { fontSize: 9, color: '#57534E' },
  docTitleBlock: { textAlign: 'right' },
  docKind: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 22,
    letterSpacing: 1,
    color: '#0A0A0A',
  },
  docNumber: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    color: '#0A0A0A',
    marginTop: 4,
  },
  docDate: { fontSize: 9, color: '#57534E', marginTop: 2 },

  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#78716C',
    marginBottom: 6,
  },
  customerBlock: { marginBottom: 24 },
  customerName: { fontFamily: 'Helvetica-Bold', fontSize: 12, marginBottom: 2 },
  customerMeta: { fontSize: 9, color: '#44403C', marginTop: 1 },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F4',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderCell: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#44403C',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E5E4',
  },
  cellDescription: { width: '46%' },
  cellPeriod: { width: '32%' },
  cellQty: { width: '8%', textAlign: 'right' },
  cellAmount: { width: '14%', textAlign: 'right' },

  totalsBlock: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  totalsTable: { width: '50%' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: { fontSize: 10, color: '#44403C' },
  totalValue: { fontSize: 10, color: '#0A0A0A' },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#0A0A0A',
  },
  grandTotalLabel: { fontFamily: 'Helvetica-Bold', fontSize: 12 },
  grandTotalValue: { fontFamily: 'Helvetica-Bold', fontSize: 14 },

  paymentBlock: {
    marginTop: 32,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E7E5E4',
  },
  paymentRow: { flexDirection: 'row', marginBottom: 4 },
  paymentLabel: { fontSize: 9, color: '#78716C', width: 110 },
  paymentValue: { fontSize: 9, color: '#0A0A0A' },

  legalNote: {
    marginTop: 18,
    fontSize: 8,
    color: '#78716C',
    fontStyle: 'italic',
  },

  footer: {
    position: 'absolute',
    bottom: 28,
    left: 48,
    right: 48,
    textAlign: 'center',
    fontSize: 8,
    color: '#A8A29E',
  },
})

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Contanti',
  bank_transfer: 'Bonifico bancario',
  card: 'Carta di credito',
  sepa: 'Addebito SEPA',
}

function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method
}

function joinAddress(parts: Array<string | null | undefined>): string {
  return parts.filter((p): p is string => Boolean(p && p.trim())).join(', ')
}

function toDate(d: string | Date): Date {
  return typeof d === 'string' ? new Date(d) : d
}

export function ReceiptDocument(props: ReceiptDocumentProps) {
  const { kind, gym, member, plan, payment, subscriptionPeriod } = props
  const documentNumber =
    kind === 'invoice' ? payment.invoice_number : payment.receipt_number
  const headerLabel = kind === 'invoice' ? 'FATTURA' : 'RICEVUTA'

  const issueDate = payment.paid_at ? toDate(payment.paid_at) : new Date()

  const periodStart = toDate(subscriptionPeriod.start)
  const periodEnd = toDate(subscriptionPeriod.end)

  const gymAddressLine = joinAddress([
    gym.address,
    [gym.postal_code, gym.city].filter(Boolean).join(' '),
    gym.province,
  ])
  const memberAddressLine = joinAddress([
    member.address,
    [member.postal_code, member.city].filter(Boolean).join(' '),
    member.province,
  ])

  const subtotalCents = payment.amount_cents
  const stampCents = props.withVirtualStamp ? 200 : 0
  const totalCents = subtotalCents + stampCents

  return (
    <Document
      title={`${headerLabel} ${documentNumber ?? ''} — ${gym.name}`}
      author={gym.name}
      creator="Quotal"
      producer="Quotal · @react-pdf/renderer"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.gymName}>{gym.name}</Text>
            {gymAddressLine ? (
              <Text style={styles.gymMeta}>{gymAddressLine}</Text>
            ) : null}
            {gym.email ? (
              <Text style={styles.gymMeta}>{gym.email}</Text>
            ) : null}
            {gym.phone ? (
              <Text style={styles.gymMeta}>{gym.phone}</Text>
            ) : null}
            {gym.vat_number ? (
              <Text style={styles.gymMeta}>P.IVA {gym.vat_number}</Text>
            ) : null}
            {gym.fiscal_code ? (
              <Text style={styles.gymMeta}>C.F. {gym.fiscal_code}</Text>
            ) : null}
          </View>
          <View style={styles.docTitleBlock}>
            <Text style={styles.docKind}>{headerLabel}</Text>
            {documentNumber ? (
              <Text style={styles.docNumber}>N° {documentNumber}</Text>
            ) : null}
            <Text style={styles.docDate}>
              Data emissione: {formatDate(issueDate, 'long')}
            </Text>
          </View>
        </View>

        {/* Customer */}
        <View style={styles.customerBlock}>
          <Text style={styles.sectionTitle}>Intestato a</Text>
          <Text style={styles.customerName}>{member.full_name}</Text>
          {memberAddressLine ? (
            <Text style={styles.customerMeta}>{memberAddressLine}</Text>
          ) : null}
          {member.fiscal_code ? (
            <Text style={styles.customerMeta}>C.F. {member.fiscal_code}</Text>
          ) : null}
          {member.email ? (
            <Text style={styles.customerMeta}>{member.email}</Text>
          ) : null}
        </View>

        {/* Detail table */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.cellDescription]}>
            Descrizione
          </Text>
          <Text style={[styles.tableHeaderCell, styles.cellPeriod]}>
            Periodo
          </Text>
          <Text style={[styles.tableHeaderCell, styles.cellQty]}>Q.tà</Text>
          <Text style={[styles.tableHeaderCell, styles.cellAmount]}>
            Importo
          </Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.cellDescription}>
            Abbonamento {plan.name}
            {'\n'}
            <Text style={{ fontSize: 8, color: '#78716C' }}>
              Durata {plan.duration_days} giorni
            </Text>
          </Text>
          <Text style={styles.cellPeriod}>
            {formatDate(periodStart, 'short')} → {formatDate(periodEnd, 'short')}
          </Text>
          <Text style={styles.cellQty}>1</Text>
          <Text style={styles.cellAmount}>
            {formatCurrency(payment.amount_cents)}
          </Text>
        </View>

        {/* Totals */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalsTable}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotale</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(subtotalCents)}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                IVA (esente art. 1 c. 58 L. 190/2014)
              </Text>
              <Text style={styles.totalValue}>{formatCurrency(0)}</Text>
            </View>
            {stampCents > 0 ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  Marca da bollo virtuale
                </Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(stampCents)}
                </Text>
              </View>
            ) : null}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>TOTALE</Text>
              <Text style={styles.grandTotalValue}>
                {formatCurrency(totalCents)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment + legal note */}
        <View style={styles.paymentBlock}>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Metodo pagamento</Text>
            <Text style={styles.paymentValue}>
              {paymentMethodLabel(payment.payment_method)}
            </Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Data pagamento</Text>
            <Text style={styles.paymentValue}>
              {formatDate(issueDate, 'long')}
            </Text>
          </View>
          {payment.notes ? (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Note</Text>
              <Text style={styles.paymentValue}>{payment.notes}</Text>
            </View>
          ) : null}

          {kind === 'receipt' ? (
            <Text style={styles.legalNote}>
              Documento valido come ricevuta non fiscale. Conservare per
              eventuale rimborso. La presente non sostituisce la fattura.
            </Text>
          ) : (
            <Text style={styles.legalNote}>
              Operazione effettuata in regime forfettario ex art. 1 commi 54-89
              L. 190/2014, esente IVA.
              {stampCents > 0
                ? ' Marca da bollo assolta in modo virtuale ai sensi del DM 17/06/2014.'
                : ''}
            </Text>
          )}
        </View>

        {/* Footer */}
        <Text style={styles.footer} fixed>
          Powered by Quotal — gestione abbonamenti per palestre · quotal.app
        </Text>
      </Page>
    </Document>
  )
}
