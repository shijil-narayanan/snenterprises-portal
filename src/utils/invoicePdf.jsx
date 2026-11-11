import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import InvoiceDocument from '../components/InvoiceDocument';
import { ensureCompanySettings } from '../services/settings';
import CommercialInvoiceDocument from '../components/CommercialInvoiceDocument';
import PackingListDocument from '../components/PackingListDocument';

const A4 = { width: 210, height: 297, margin: 10 }; // mm

// Elements whose top edge is a clean place to start a new PDF page
const BREAK_SELECTOR = [
  '.ci-grid', '.ci-row', '.ci-foot', '.pl-breakdown-wrap', '.pl-notes', // export documents
  '.paper-boxes', '.paper-table tr', '.paper-bottom', '.paper-foot', // tax invoice
].join(', ');

// Characters not allowed in file names become "-" (e.g. "01/ 26-27" -> "01-26-27")
const safeFileName = (name) => `${name.replace(/\s*[\\/:*?"<>|]+\s*/g, '-').replace(/\s+/g, ' ').trim()}.pdf`;

export const invoicePdfFileName = (invoice) => safeFileName(`Tax Invoice ${invoice.invoiceNumber || 'Draft'}`);
export const commercialPdfFileName = (invoice) => safeFileName(`Commercial Invoice ${invoice.invoiceNumber || 'Draft'}`);
export const packingPdfFileName = (list) => safeFileName(`Packing List ${list.invoiceNumber || 'Draft'}`);

/**
 * Renders a document off-screen and builds an A4 PDF from it.
 * Returns an image of each page (for previews) and a save() function, so a preview
 * shows exactly what will be saved. Long documents continue onto extra pages.
 */
export async function buildPdf(element, fileName) {
  // Loaded only when needed, to keep the app fast
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf'), ensureCompanySettings()]);

  const host = document.createElement('div');
  host.className = 'pdf-render-host';
  host.setAttribute('aria-hidden', 'true');
  document.body.appendChild(host);
  const root = createRoot(host);

  try {
    flushSync(() => root.render(element));
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

    // Where a page may end without cutting through a section or a table row
    const scale = canvas.width / host.offsetWidth;
    const hostTop = host.getBoundingClientRect().top;
    const breakPoints = [...host.querySelectorAll(BREAK_SELECTOR)]
      .map((el) => Math.round((el.getBoundingClientRect().top - hostTop) * scale))
      .filter((v) => v > 0)
      .sort((a, b) => a - b);

    // Ignore a sliver of a few pixels left over at the end (rounding)
    const lastPageMin = 8;
    for (let y = 0, page = 0; y < canvas.height - (page ? lastPageMin : 0); y += pages.at(-1).sliceH, page += 1) {
      let sliceH = Math.min(pagePx, canvas.height - y);
      if (canvas.height - (y + sliceH) > lastPageMin) {
        // Break at the last safe point on this page, if it keeps at least half a page
        const safe = breakPoints.filter((b) => b > y + pagePx / 2 && b <= y + pagePx).at(-1);
        if (safe) sliceH = safe - y;
      }
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = sliceH;
      slice.getContext('2d').drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      const image = slice.toDataURL('image/png');
      if (page > 0) pdf.addPage();
      pdf.addImage(image, 'PNG', A4.margin, A4.margin, contentW, sliceH / pxPerMm, undefined, 'FAST');
      pages.push({ image, sliceH });
    }

    pdf.setProperties({ title: fileName.replace(/\.pdf$/, '') });
    return {
      fileName,
      pages: pages.map(({ image }) => ({ image })),
      save: () => pdf.save(fileName),
      // The PDF file as base64 (for email attachments)
      base64: () => pdf.output('datauristring').split('base64,')[1],
    };
  } finally {
    root.unmount();
    host.remove();
  }
}

export const buildInvoicePdf = (invoice) => buildPdf(<InvoiceDocument invoice={invoice} fillPage />, invoicePdfFileName(invoice));
export const buildCommercialPdf = (invoice) =>
  buildPdf(<CommercialInvoiceDocument invoice={invoice} fillPage />, commercialPdfFileName(invoice));

export const buildPackingPdf = (list) => buildPdf(<PackingListDocument list={list} fillPage />, packingPdfFileName(list));

export async function downloadInvoicePdf(invoice) {
  (await buildInvoicePdf(invoice)).save();
}
export async function downloadCommercialPdf(invoice) {
  (await buildCommercialPdf(invoice)).save();
}
export async function downloadPackingPdf(list) {
  (await buildPackingPdf(list)).save();
}
