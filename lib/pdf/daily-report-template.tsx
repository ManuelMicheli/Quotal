/**
 * Daily cash close report — PDF template.
 *
 * Owner-facing summary printed at the end of each day before depositing the
 * cash. Layout: header date + gym, totals card, transactions table with
 * one row per payment, signature line at the bottom.
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'

import { formatCurrency, formatDate } from '@/lib/format'

export type DailyReportPayment = {
  id: string
  paid_at: string
  member_name: string
  amount_cents: number
  payment_method: string
  receipt_number: string | null
}

export type DailyReportProps = {
  gym: {
    name: string
    vat_number?: string | null
    address?: string | null
    city?: string | null
    province?: string | null
    postal_code?: string | null
  }
  closeDate: string | Date
  closedAt: string | Date
  closedBy: string
  payments: DailyReportPayment[]
  totals: {
    total_cents: number
    cash_cents: number
    card_cents: number
    sepa_cents: number
    bank_transfer_cents: number
    transactions_count: number
  }
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 48,
    paddingVertical: 56,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#0A0A0A',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 16,
    marginBottom: 22,
    borderBottomWidth: 1,
    borderBottomColor: '#E7E5E4',
  },
  gymName: { fontFamily: 'Helvetica-Bold', fontSize: 14 },
  docTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 20,
    letterSpacing: 0.6,
    textAlign: 'right',
  },
  docSub: { fontSize: 10, color: '#57534E', marginTop: 4, textAlign: 'right' },

  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#78716C',
    marginBottom: 8,
    marginTop: 12,
  },

  totalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  totalsCard: {
    width: '23.5%',
    padding: 10,
    backgroundColor: '#FAFAF9',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 4,
  },
  totalsCardLabel: {
    fontSize: 8,
    textTransform: 'uppercase',
    color: '#78716C',
    letterSpacing: 0.6,
  },
  totalsCardValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    marginTop: 4,
  },

  grandTotalCard: {
    backgroundColor: '#0A0A0A',
    color: '#FFFFFF',
    padding: 14,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  grandTotalLabel: { color: '#FFFFFF', fontSize: 10, letterSpacing: 0.6 },
  grandTotalValue: { color: '#FFFFFF', fontFamily: 'Helvetica-Bold', fontSize: 18 },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F4',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderCell: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#44403C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E7E5E4',
  },
  cellTime: { width: '12%' },
  cellMember: { width: '36%' },
  cellMethod: { width: '18%' },
  cellReceipt: { width: '18%' },
  cellAmount: { width: '16%', textAlign: 'right' },

  signatureBlock: { marginTop: 36 },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#0A0A0A',
    width: 220,
    marginTop: 36,
    paddingTop: 4,
    fontSize: 9,
    color: '#57534E',
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
  bank_transfer: 'Bonifico',
  card: 'Carta',
  sepa: 'SEPA',
}

function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method
}

function timeOf(iso: string): string {
  const d = new Date(iso)
  return `${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}`
}

export function DailyReportDocument({
  gym,
  closeDate,
  closedAt,
  closedBy,
  payments,
  totals,
}: DailyReportProps) {
  const closeDateObj =
    typeof closeDate === 'string' ? new Date(closeDate) : closeDate
  const closedAtObj =
    typeof closedAt === 'string' ? new Date(closedAt) : closedAt

  return (
    <Document
      title={`Cassa ${formatDate(closeDateObj, 'short')} — ${gym.name}`}
      author={gym.name}
      creator="Quotal"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.gymName}>{gym.name}</Text>
            {gym.vat_number ? (
              <Text style={{ fontSize: 9, color: '#57534E', marginTop: 2 }}>
                P.IVA {gym.vat_number}
              </Text>
            ) : null}
          </View>
          <View>
            <Text style={styles.docTitle}>CHIUSURA CASSA</Text>
            <Text style={styles.docSub}>{formatDate(closeDateObj, 'full')}</Text>
            <Text style={styles.docSub}>
              Chiuso da: {closedBy} ·{' '}
              {closedAtObj.toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>

        {/* Grand total */}
        <View style={styles.grandTotalCard}>
          <Text style={styles.grandTotalLabel}>INCASSO TOTALE GIORNATA</Text>
          <Text style={styles.grandTotalValue}>
            {formatCurrency(totals.total_cents)}
          </Text>
        </View>

        {/* Totals breakdown */}
        <Text style={styles.sectionTitle}>Suddivisione per metodo</Text>
        <View style={styles.totalsGrid}>
          <View style={styles.totalsCard}>
            <Text style={styles.totalsCardLabel}>Contanti</Text>
            <Text style={styles.totalsCardValue}>
              {formatCurrency(totals.cash_cents)}
            </Text>
          </View>
          <View style={styles.totalsCard}>
            <Text style={styles.totalsCardLabel}>Carta</Text>
            <Text style={styles.totalsCardValue}>
              {formatCurrency(totals.card_cents)}
            </Text>
          </View>
          <View style={styles.totalsCard}>
            <Text style={styles.totalsCardLabel}>SEPA</Text>
            <Text style={styles.totalsCardValue}>
              {formatCurrency(totals.sepa_cents)}
            </Text>
          </View>
          <View style={styles.totalsCard}>
            <Text style={styles.totalsCardLabel}>Bonifico</Text>
            <Text style={styles.totalsCardValue}>
              {formatCurrency(totals.bank_transfer_cents)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Transazioni — {totals.transactions_count}{' '}
          {totals.transactions_count === 1 ? 'movimento' : 'movimenti'}
        </Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.cellTime]}>Ora</Text>
          <Text style={[styles.tableHeaderCell, styles.cellMember]}>Membro</Text>
          <Text style={[styles.tableHeaderCell, styles.cellMethod]}>Metodo</Text>
          <Text style={[styles.tableHeaderCell, styles.cellReceipt]}>
            Ricevuta
          </Text>
          <Text style={[styles.tableHeaderCell, styles.cellAmount]}>
            Importo
          </Text>
        </View>
        {payments.length === 0 ? (
          <View style={styles.tableRow}>
            <Text style={{ color: '#78716C', fontSize: 9 }}>
              Nessuna transazione registrata.
            </Text>
          </View>
        ) : (
          payments.map((p) => (
            <View key={p.id} style={styles.tableRow} wrap={false}>
              <Text style={styles.cellTime}>{timeOf(p.paid_at)}</Text>
              <Text style={styles.cellMember}>{p.member_name}</Text>
              <Text style={styles.cellMethod}>
                {paymentMethodLabel(p.payment_method)}
              </Text>
              <Text style={styles.cellReceipt}>{p.receipt_number ?? '—'}</Text>
              <Text style={styles.cellAmount}>
                {formatCurrency(p.amount_cents)}
              </Text>
            </View>
          ))
        )}

        {/* Signature */}
        <View style={styles.signatureBlock}>
          <Text style={styles.sectionTitle}>Firma del titolare</Text>
          <Text style={styles.signatureLine}>Per accettazione e verifica</Text>
        </View>

        <Text style={styles.footer} fixed>
          Powered by Quotal — gestione abbonamenti per palestre · quotal.app
        </Text>
      </Page>
    </Document>
  )
}
