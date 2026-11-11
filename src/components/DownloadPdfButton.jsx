import { useState } from 'react';
import { downloadInvoicePdf } from '../utils/invoicePdf';
import { DownloadIcon } from './Icons';

/**
 * Downloads an invoice as PDF.
 * @param getInvoice  returns the invoice to render, or null to cancel (e.g. when the form is invalid)
 * @param iconOnly    compact icon button (used in tables)
 */
export default function DownloadPdfButton({ getInvoice, iconOnly = false, className = 'btn', label = 'Download PDF', download = downloadInvoicePdf }) {
  const [busy, setBusy] = useState(false);

  const handleClick = async (e) => {
    e.stopPropagation();
    const invoice = await getInvoice();
    if (!invoice) return;
    setBusy(true);
    try {
      await download(invoice);
    } catch (err) {
      window.alert(`Could not create the PDF: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  if (iconOnly) {
    return (
      <button type="button" className={`icon-btn${busy ? ' is-busy' : ''}`} onClick={handleClick} disabled={busy}
        title={busy ? 'Preparing PDF…' : label} aria-label={label}>
        {busy ? <span className="spinner" /> : <DownloadIcon />}
      </button>
    );
  }
  return (
    <button type="button" className={className} onClick={handleClick} disabled={busy}>
      {busy ? <span className="spinner" /> : <DownloadIcon />} {busy ? 'Preparing…' : label}
    </button>
  );
}
