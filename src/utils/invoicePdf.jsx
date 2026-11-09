import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import InvoiceDocument from '../components/InvoiceDocument';

const A4 = { width: 210, height: 297, margin: 10 }; // mm

export function invoicePdfFileName(invoice) {
  return `Tax Invoice ${invoice.invoiceNumber || 'Draft'}`.replace(/[\\/:*?"<>|]+/g, '-') + '.pdf';
}

/**
 * Renders the invoice off-screen with the same design as the invoice page
 * and saves it as an A4 PDF. Long invoices continue onto extra pages.
 */
export async function downloadInvoicePdf(invoice) {
  // Loaded only when needed, to keep the app fast
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);

  const host = document.createElement('div');
  host.className = 'pdf-render-host';
  host.setAttribute('aria-hidden', 'true');
  document.body.appendChild(host);
  const root = createRoot(host);

  try {
    flushSync(() => root.render(<InvoiceDocument invoice={invoice} />));
    if (document.fonts?.ready) await document.fonts.ready;

    const canvas = await html2canvas(host.firstElementChild, { scale: 2, backgroundColor: '#ffffff' });

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const contentW = A4.width - A4.margin * 2;
    const contentH = A4.height - A4.margin * 2;
    const pxPerMm = canvas.width / contentW;
    const pagePx = Math.floor(contentH * pxPerMm);

    for (let y = 0, page = 0; y < canvas.height; y += pagePx, page += 1) {
      const sliceH = Math.min(pagePx, canvas.height - y);
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = sliceH;
      slice.getContext('2d').drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      if (page > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL('image/png'), 'PNG', A4.margin, A4.margin, contentW, sliceH / pxPerMm, undefined, 'FAST');
    }

    pdf.setProperties({ title: invoicePdfFileName(invoice).replace(/\.pdf$/, '') });
    pdf.save(invoicePdfFileName(invoice));
  } finally {
    root.unmount();
    host.remove();
  }
}
