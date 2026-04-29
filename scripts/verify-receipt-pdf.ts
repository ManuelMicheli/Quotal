#!/usr/bin/env node
/**
 * Receipt PDF verification script (no DB / Storage round-trip).
 *
 * Renders the React-PDF receipt template against fake data and writes the
 * result to `tmp/sample-receipt.pdf`. Asserts the resulting buffer starts
 * with the `%PDF-` magic bytes.
 *
 * Run with: `npx tsx scripts/verify-receipt-pdf.ts`
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { renderToBuffer } from '@react-pdf/renderer'

import { DailyReportDocument } from '../lib/pdf/daily-report-template'
import { ReceiptDocument } from '../lib/pdf/receipt-template'

async function main(): Promise<void> {
  const fakeReceipt = ReceiptDocument({
    kind: 'receipt',
    gym: {
      name: 'Palestra Demo SRL',
      address: 'Via Roma 12',
      city: 'Milano',
      province: 'MI',
      postal_code: '20121',
      email: 'info@palestra-demo.it',
      phone: '+39 02 12345678',
      vat_number: '12345678901',
      fiscal_code: null,
    },
    member: {
      full_name: 'Mario Rossi',
      email: 'mario.rossi@example.com',
      phone: '+39 333 1234567',
      fiscal_code: 'RSSMRA85M01H501Z',
      address: 'Via Verdi 5',
      city: 'Milano',
      province: 'MI',
      postal_code: '20121',
    },
    plan: { name: 'Mensile', duration_days: 30 },
    payment: {
      receipt_number: '2026-0001',
      invoice_number: null,
      amount_cents: 4900,
      payment_method: 'cash',
      paid_at: new Date().toISOString(),
      notes: null,
    },
    subscriptionPeriod: {
      start: new Date(),
      end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  const buffer = await renderToBuffer(fakeReceipt)

  if (!buffer || buffer.length < 100) {
    throw new Error(`PDF buffer too small: ${buffer?.length ?? 0} bytes`)
  }
  const magic = buffer.subarray(0, 5).toString('ascii')
  if (magic !== '%PDF-') {
    throw new Error(`Invalid PDF magic bytes: "${magic}"`)
  }
  const haystack = buffer.toString('latin1')
  if (!haystack.includes('Quotal')) {
    throw new Error('Missing "Quotal" producer marker in PDF stream')
  }

  const tmpDir = resolve(process.cwd(), 'tmp')
  await mkdir(tmpDir, { recursive: true })
  const outPath = resolve(tmpDir, 'sample-receipt.pdf')
  await writeFile(outPath, buffer)

  const dailyBuffer = await renderToBuffer(
    DailyReportDocument({
      gym: {
        name: 'Palestra Demo SRL',
        vat_number: '12345678901',
        address: 'Via Roma 12',
        city: 'Milano',
        province: 'MI',
        postal_code: '20121',
      },
      closeDate: new Date().toISOString().slice(0, 10),
      closedAt: new Date(),
      closedBy: 'Manuel Micheli',
      payments: [
        {
          id: '1',
          paid_at: new Date().toISOString(),
          member_name: 'Mario Rossi',
          amount_cents: 4900,
          payment_method: 'cash',
          receipt_number: '2026-0001',
        },
        {
          id: '2',
          paid_at: new Date().toISOString(),
          member_name: 'Anna Bianchi',
          amount_cents: 7900,
          payment_method: 'bank_transfer',
          receipt_number: '2026-0002',
        },
      ],
      totals: {
        total_cents: 12800,
        cash_cents: 4900,
        card_cents: 0,
        sepa_cents: 0,
        bank_transfer_cents: 7900,
        transactions_count: 2,
      },
    }),
  )
  const dailyOut = resolve(tmpDir, 'sample-daily-report.pdf')
  await writeFile(dailyOut, dailyBuffer)

  console.log(
    [
      'OK',
      `- ${outPath} (${buffer.length} bytes)`,
      `- ${dailyOut} (${dailyBuffer.length} bytes)`,
      'PDF magic bytes: %PDF- found',
      'Quotal producer marker present',
    ].join('\n'),
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
