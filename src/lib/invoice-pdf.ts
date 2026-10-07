import * as Print from 'expo-print';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { Invoice, Policy } from '@/types';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function createInvoicePdf(invoice: Invoice, policy: Policy): Promise<File> {
  const money = (amount: number) =>
    `INR ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const html = `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body { font-family: Arial, sans-serif; color: #172033; padding: 36px; }
          .brand { color: #1769aa; font-weight: 700; letter-spacing: 2px; }
          h1 { margin: 10px 0 28px; font-size: 26px; }
          .meta { color: #5b6678; line-height: 1.8; }
          table { width: 100%; border-collapse: collapse; margin-top: 34px; }
          th, td { padding: 14px 10px; border-bottom: 1px solid #dce3ec; text-align: left; }
          th:last-child, td:last-child { text-align: right; }
          .total { font-size: 18px; font-weight: 700; }
          .note { margin-top: 40px; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="brand">JB SOLAR</div>
        <h1>Tax Invoice</h1>
        <div class="meta">
          <strong>Invoice:</strong> ${escapeHtml(invoice.invoiceNumber)}<br />
          <strong>Policy:</strong> ${escapeHtml(policy.policyNumber)}<br />
          <strong>Customer:</strong> ${escapeHtml(policy.farmerName)}<br />
          <strong>Plan:</strong> ${escapeHtml(policy.planName)}<br />
          <strong>Invoice date:</strong> ${escapeHtml(invoice.invoiceDate)}
        </div>
        <table>
          <thead><tr><th>Description</th><th>Amount</th></tr></thead>
          <tbody>
            <tr><td>Policy premium</td><td>${money(invoice.amount)}</td></tr>
            <tr><td>GST</td><td>${money(invoice.gstAmount)}</td></tr>
            <tr class="total"><td>Total paid</td><td>${money(invoice.totalAmount)}</td></tr>
          </tbody>
        </table>
        <p class="note">Generated from the JB Solar backend invoice after successful payment verification.</p>
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
