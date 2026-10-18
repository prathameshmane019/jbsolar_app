import * as Print from 'expo-print';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { Invoice, Policy } from '@/types';

const COLORS = {
  brand: '#163b2d',
  primary: '#285c3b',
  accent: '#c5e86c',
  accentLight: '#f2f8e7',
  surface: '#f7faf5',
  border: '#dce6d9',
  muted: '#668263',
  white: '#ffffff',
} as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(value?: string): string {
  if (!value) return '—';
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);

  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoney(value: number): string {
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function valueOrDash(value?: string | number | null): string {
  return value === undefined || value === null || value === '' ? '—' : String(value);
}

export async function createInvoicePdf(invoice: Invoice, policy: Policy): Promise<File> {
  const farmerName = invoice.farmerName || policy.farmerName;
  const planName = invoice.planName || policy.planName;
  const policyNumber = invoice.policyNumber || policy.policyNumber;
  const farmerAddress = invoice.farmerAddress || '';
  const coverageStart = invoice.startDate || policy.startDate;
  const coverageEnd = invoice.endDate || policy.endDate;
  const paymentReference = invoice.paymentNumber || invoice.paymentId;
  const sellerName = invoice.vendorName || 'JB Solar';
  const gstLabel =
    typeof invoice.gstPercentage === 'number'
      ? `GST (${invoice.gstPercentage}%)`
      : 'GST';

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          @page { size: A4; margin: 18mm 16mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            color: ${COLORS.brand};
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            line-height: 1.5;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .top-accent { height: 8px; background: ${COLORS.accent}; }
          .page { padding: 24px 28px; }
          .header, .invoice-meta, .parties, .summary, .payment {
            display: flex;
            justify-content: space-between;
            gap: 24px;
          }
          .header { align-items: flex-start; padding-bottom: 22px; border-bottom: 2px solid ${COLORS.brand}; }
          .brand { color: ${COLORS.brand}; font-size: 20px; font-weight: 800; letter-spacing: 1px; }
          .brand-subtitle { color: ${COLORS.muted}; font-size: 10px; margin-top: 3px; }
          .document-title { text-align: right; }
          h1 { color: ${COLORS.brand}; font-size: 23px; line-height: 1.2; margin: 0 0 5px; }
          .tax-label { color: ${COLORS.primary}; font-size: 10px; font-weight: 700; letter-spacing: 1px; }
          .invoice-meta { padding: 15px 0 18px; }
          .meta-item { flex: 1; }
          .label, .section-title { color: ${COLORS.muted}; font-size: 9px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; }
          .value { color: ${COLORS.brand}; font-size: 11px; font-weight: 700; margin-top: 3px; overflow-wrap: anywhere; }
          .parties { margin: 0 0 20px; }
          .party { flex: 1; min-width: 0; padding: 13px 15px; background: ${COLORS.surface}; border: 1px solid ${COLORS.border}; border-radius: 8px; }
          .section-title { color: ${COLORS.primary}; margin: 0 0 8px; }
          .party-name { color: ${COLORS.brand}; font-size: 13px; font-weight: 700; margin-bottom: 4px; }
          .party-line { color: ${COLORS.muted}; font-size: 10px; overflow-wrap: anywhere; }
          .coverage { border: 1px solid ${COLORS.border}; border-radius: 8px; margin-bottom: 20px; padding: 14px 15px; }
          .coverage-grid { display: flex; flex-wrap: wrap; gap: 12px 20px; margin-top: 10px; }
          .coverage-item { flex: 1 1 28%; min-width: 100px; }
          table { width: 100%; border-collapse: collapse; margin: 0 0 16px; }
          th { padding: 10px 12px; background: ${COLORS.brand}; color: ${COLORS.white}; font-size: 9px; letter-spacing: .5px; text-align: left; text-transform: uppercase; }
          th:last-child, td:last-child { text-align: right; }
          td { padding: 12px; border-bottom: 1px solid ${COLORS.border}; vertical-align: top; }
          .description { font-weight: 700; }
          .sub-description { color: ${COLORS.muted}; font-size: 9px; margin-top: 3px; }
          .amount { white-space: nowrap; }
          .summary { justify-content: flex-end; margin: 0 0 20px; }
          .totals { width: 230px; }
          .total-row { display: flex; justify-content: space-between; gap: 12px; padding: 5px 0; color: ${COLORS.muted}; }
          .grand-total { margin-top: 5px; padding: 11px 12px; color: ${COLORS.brand}; background: ${COLORS.accentLight}; border-radius: 6px; font-size: 14px; font-weight: 800; }
          .payment { align-items: flex-start; padding: 13px 15px; background: ${COLORS.surface}; border: 1px solid ${COLORS.border}; border-radius: 8px; }
          .payment-column { flex: 1; min-width: 0; }
          .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid ${COLORS.border}; color: ${COLORS.muted}; font-size: 9px; text-align: center; }
          .footer strong { display: block; color: ${COLORS.primary}; font-size: 10px; margin-bottom: 3px; }
          @media print {
            .page { padding: 0; }
            .party, .coverage, .payment, .grand-total { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="top-accent"></div>
        <main class="page">
          <header class="header">
            <div>
              <div class="brand">JB SOLAR</div>
              <div class="brand-subtitle">Solar Pump Policy &amp; Service</div>
            </div>
            <div class="document-title">
              <h1>TAX INVOICE</h1>
              <div class="tax-label">PAYMENT VERIFIED</div>
            </div>
          </header>

          <section class="invoice-meta">
            <div class="meta-item">
              <div class="label">Invoice number</div>
              <div class="value">${escapeHtml(invoice.invoiceNumber)}</div>
            </div>
            <div class="meta-item">
              <div class="label">Invoice date</div>
              <div class="value">${escapeHtml(formatDate(invoice.invoiceDate))}</div>
            </div>
            <div class="meta-item">
              <div class="label">Policy number</div>
              <div class="value">${escapeHtml(policyNumber)}</div>
            </div>
          </section>

          <section class="parties">
            <div class="party">
              <h2 class="section-title">Billed to</h2>
              <div class="party-name">${escapeHtml(farmerName)}</div>
              <div class="party-line">Customer ID: ${escapeHtml(valueOrDash(invoice.customerCode || policy.customerCode))}</div>
              <div class="party-line">Mobile: ${escapeHtml(valueOrDash(invoice.farmerMobile))}</div>
              ${farmerAddress ? `<div class="party-line">${escapeHtml(farmerAddress)}</div>` : ''}
            </div>
            <div class="party">
              <h2 class="section-title">Issued by</h2>
              <div class="party-name">${escapeHtml(sellerName)}</div>
              <div class="party-line">Vendor code: ${escapeHtml(valueOrDash(invoice.vendorCode))}</div>
              <div class="party-line">Mobile: ${escapeHtml(valueOrDash(invoice.vendorMobile))}</div>
              <div class="party-line">Email: ${escapeHtml(valueOrDash(invoice.vendorEmail))}</div>
            </div>
          </section>

          <section class="coverage">
            <h2 class="section-title">Policy &amp; system coverage</h2>
            <div class="coverage-grid">
              <div class="coverage-item"><div class="label">Plan</div><div class="value">${escapeHtml(planName)}</div></div>
              <div class="coverage-item"><div class="label">Plan code</div><div class="value">${escapeHtml(valueOrDash(invoice.planCode))}</div></div>
              <div class="coverage-item"><div class="label">Coverage period</div><div class="value">${escapeHtml(formatDate(coverageStart))} – ${escapeHtml(formatDate(coverageEnd))}</div></div>
              <div class="coverage-item"><div class="label">Duration</div><div class="value">${escapeHtml(valueOrDash(invoice.durationMonths ? `${invoice.durationMonths} months` : undefined))}</div></div>
              <div class="coverage-item"><div class="label">Pump capacity</div><div class="value">${escapeHtml(valueOrDash(invoice.pumpPowerHp ?? policy.pumpPowerHp))} HP</div></div>
              <div class="coverage-item"><div class="label">Motor head</div><div class="value">${escapeHtml(valueOrDash(invoice.motorHeadMeters ?? policy.motorHeadMeters))} m</div></div>
            </div>
          </section>

          <table>
            <thead>
              <tr><th>Description</th><th>Amount</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div class="description">${escapeHtml(planName)} — Policy premium</div>
                  <div class="sub-description">Policy ${escapeHtml(policyNumber)}</div>
                </td>
                <td class="amount">${formatMoney(invoice.amount)}</td>
              </tr>
              <tr>
                <td>${escapeHtml(gstLabel)}</td>
                <td class="amount">${formatMoney(invoice.gstAmount)}</td>
              </tr>
            </tbody>
          </table>

          <section class="summary">
            <div class="totals">
              <div class="total-row"><span>Taxable amount</span><strong>${formatMoney(invoice.amount)}</strong></div>
              <div class="total-row"><span>${escapeHtml(gstLabel)}</span><strong>${formatMoney(invoice.gstAmount)}</strong></div>
              <div class="total-row grand-total"><span>Total paid</span><span>${formatMoney(invoice.totalAmount)}</span></div>
            </div>
          </section>

          <section class="payment">
            <div class="payment-column">
              <h2 class="section-title">Payment details</h2>
              <div class="label">Payment reference</div>
              <div class="value">${escapeHtml(paymentReference)}</div>
            </div>
            <div class="payment-column">
              <div class="label">Method / gateway</div>
              <div class="value">${escapeHtml(valueOrDash(invoice.paymentMethod || invoice.gateway))}</div>
              <div class="label" style="margin-top:8px">Transaction reference</div>
              <div class="value">${escapeHtml(valueOrDash(invoice.gatewayPaymentId))}</div>
              <div class="label" style="margin-top:8px">Paid on</div>
              <div class="value">${escapeHtml(formatDateTime(invoice.paidAt))}</div>
            </div>
          </section>

          <footer class="footer">
            <strong>Thank you for choosing JB Solar.</strong>
            This invoice is generated from the verified payment and policy records.
          </footer>
        </main>
      </body>
    </html>
  `;

  const { base64 } = await Print.printToFileAsync({ html, base64: true });
  if (!base64) {
    throw new Error('The generated invoice PDF could not be read. Please try again.');
  }

  const safeInvoiceId = invoice.id.replace(/[^a-zA-Z0-9_-]/g, '_') || 'invoice';
  const pdfFile = new File(Paths.document, `invoice-${safeInvoiceId}-${Date.now()}.pdf`);
  pdfFile.create();
  pdfFile.write(base64, { encoding: 'base64' });
  return pdfFile;
}

export async function shareInvoicePdf(pdfFile: File, invoiceNumber: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('PDF sharing is unavailable on this device.');
  }
  await Sharing.shareAsync(pdfFile.uri, {
    mimeType: 'application/pdf',
    UTI: '.pdf',
    dialogTitle: `Invoice ${invoiceNumber}`,
  });
}

export async function downloadInvoicePdf(pdfFile: File, invoiceNumber: string): Promise<boolean> {
  let destination: Directory;
  try {
    destination = await Directory.pickDirectoryAsync();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('file picker was cancelled by the user')
    ) {
      return false;
    }
    throw error;
  }

  const safeInvoiceNumber = invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_') || 'invoice';
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const filename = `invoice-${safeInvoiceNumber}-${uniqueSuffix}.pdf`;
  const destinationFile = destination.createFile(filename, 'application/pdf');
  destinationFile.write(await pdfFile.base64(), { encoding: 'base64' });
  return true;
}
