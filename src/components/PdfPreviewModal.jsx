import { useEffect, useRef, useState } from 'react';
import { buildInvoicePdf } from '../utils/invoicePdf';
import { CloseIcon, DownloadIcon } from './Icons';

/** Modal that shows the invoice PDF page by page, with Close / Download in the footer. */
export default function PdfPreviewModal({ invoice, onClose }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const downloadRef = useRef(null);
  const closeRef = useRef(null);

  // Build the PDF once when the modal opens
  useEffect(() => {
    let cancelled = false;
    buildInvoicePdf(invoice)
      .then((r) => !cancelled && setResult(r))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [invoice]);

  // Esc closes; lock page scroll while open
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  useEffect(() => {
    if (result) downloadRef.current?.focus();
  }, [result]);

  const pageCount = result?.pages.length || 0;

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-pdf" role="dialog" aria-modal="true" aria-labelledby="pdf-preview-title">
        <header className="modal-head">
          <div>
            <h2 id="pdf-preview-title">PDF preview</h2>
            <p className="muted small">
              {result ? `${result.fileName} · ${pageCount} page${pageCount === 1 ? '' : 's'} · A4` : 'Preparing your invoice…'}
            </p>
          </div>
          <button ref={closeRef} type="button" className="icon-btn" onClick={onClose} aria-label="Close preview" title="Close (Esc)">
            <CloseIcon size={18} />
          </button>
        </header>

        <div className="modal-body pdf-stage">
          {error && <div className="alert alert-error">Could not create the PDF: {error}</div>}
          {!result && !error && (
            <div className="pdf-loading"><span className="spinner" /> Generating preview…</div>
          )}
          {result?.pages.map((page, i) => (
            <div className="pdf-page-wrap" key={i}>
              <div className="pdf-page">
                <img src={page.image} alt={`Page ${i + 1} of ${pageCount}`} />
              </div>
              {pageCount > 1 && <span className="pdf-page-no">Page {i + 1} of {pageCount}</span>}
            </div>
          ))}
        </div>

        <footer className="modal-foot">
          <span className="muted small hide-sm">Not saved yet — this previews what you have entered.</span>
          <div className="modal-foot-actions">
            <button type="button" className="btn" onClick={onClose}>Close</button>
            <button ref={downloadRef} type="button" className="btn btn-primary" disabled={!result} onClick={() => result.save()}>
              <DownloadIcon /> Download PDF
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
