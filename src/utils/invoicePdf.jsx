import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import InvoiceDocument from '../components/InvoiceDocument';

const A4 = { width: 210, height: 297, margin: 10 }; // mm

export function invoicePdfFileName(invoice) {
  return `Tax Invoice ${invoice.invoiceNumber || 'Draft'}`.replace(/[\\/:*?"<>|]+/g, '-') + '.pdf';
}

/**
 * Renders the invoice off-screen (same design as the invoice page) and builds an A4 PDF.
 * Returns the PDF plus an image of each page, so a preview shows exactly what will be saved.
 * Long invoices continue onto extra pages.
 */
export async function buildInvoicePdf(invoice) {
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
    // Wait for images (the logo) so they are in the capture
    await Promise.all(
      [...host.querySelectorAll('img')].map((img) =>
        img.complete ? null : new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; })),
    );

    const canvas = await html2canvas(host, { scale: 2, backgroundColor: '#ffffff' });

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const contentW = A4.width - A4.margin * 2;
    const contentH = A4.height - A4.margin * 2;
    const pxPerMm = canvas.width / contentW;
    const pagePx = Math.floor(contentH * pxPerMm);
    const pages = [];

    for (let y = 0, page = 0; y < canvas.height; y += pagePx, page += 1) {
      const sliceH = Math.min(pagePx, canvas.height - y);
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = sliceH;
      slice.getContext('2d').drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      const image = slice.toDataURL('image/png');
      if (page > 0) pdf.addPage();
      pdf.addImage(image, 'PNG', A4.margin, A4.margin, contentW, sliceH / pxPerMm, undefined, 'FAST');
      pages.push({ image });
    }

    const fileName = invoicePdfFileName(invoice);
    pdf.setProperties({ title: fileName.replace(/\.pdf$/, '') });
    return { fileName, pages, save: () => pdf.save(fileName) };
  } finally {
    root.unmount();
    host.remove();
  }
}

export async function downloadInvoicePdf(invoice) {
  (await buildInvoicePdf(invoice)).save();
}
