import { useEffect, useMemo, useRef, useState } from 'react';
import { sendPdfEmail } from '../services/email';
import { getCompany } from '../config/companySettings';
import { defaultEmail, defaultRecipient } from '../utils/emailTemplates';
import { CloseIcon, MailIcon, PaperclipIcon } from './Icons';

const EMAIL = /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[^\s@<>()",;]+$/;
// "a@x.com, b@y.com; c@z.com" -> ['a@x.com', 'b@y.com', 'c@z.com']
const splitEmails = (s) => s.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);

/**
 * Email a document as a PDF attachment.
 * kind: 'tax' | 'commercial' | 'packing';  build: (doc) => built PDF;  onSent(entry) after success.
 */
export default function EmailModal({ kind, doc, build, onClose, onSent }) {
  const company = getCompany();
  const defaults = useMemo(() => defaultEmail(kind, doc, company), [kind, doc, company]);
  const [to, setTo] = useState(defaultRecipient(kind, doc));
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(defaults.subject);
  const [message, setMessage] = useState(defaults.message);
  const [pdf, setPdf] = useState(null);
  const [pdfError, setPdfError] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const toRef = useRef(null);

  // Build the PDF once when the window opens
  useEffect(() => {
    let cancelled = false;
    build(doc)
      .then((r) => !cancelled && setPdf({ fileName: r.fileName, base64: r.base64() }))
      .catch((e) => !cancelled && setPdfError(e.message));
    return () => { cancelled = true; };
  }, [build, doc]);

  // Esc closes (unless sending); page doesn't scroll behind
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !sending && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    toRef.current?.focus();
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [onClose, sending]);

  const toList = splitEmails(to);
  const ccList = splitEmails(cc);
  const errors = {};
  if (!toList.length) errors.to = 'Enter at least one email address';
  else if (toList.some((e) => !EMAIL.test(e))) errors.to = `“${toList.find((e) => !EMAIL.test(e))}” is not a valid email address`;
  if (ccList.some((e) => !EMAIL.test(e))) errors.cc = `“${ccList.find((e) => !EMAIL.test(e))}” is not a valid email address`;
  if (!subject.trim()) errors.subject = 'Add a subject';
  const shown = submitted ? errors : {};
  const sizeKb = pdf ? Math.round((pdf.base64.length * 3) / 4 / 1024) : 0;
  const sender = { email: company.senderEmail || company.email, name: company.name };

  const handleSend = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setError('');
    if (Object.keys(errors).length || !pdf) return;
    setSending(true);
    try {
      const entry = await sendPdfEmail({
        to: toList, cc: ccList, subject: subject.trim(), message,
        fileName: pdf.fileName, pdfBase64: pdf.base64, sender, replyTo: company.replyTo || '',
      });
      await onSent(entry);
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !sending && onClose()}>
      <form className="modal modal-email" role="dialog" aria-modal="true" aria-labelledby="email-title" onSubmit={handleSend} noValidate>
        <header className="modal-head">
          <div>
            <h2 id="email-title">Email {kind === 'packing' ? 'packing list' : 'invoice'}</h2>
            <p className="muted small">From {sender.name} &lt;{sender.email || 'not set'}&gt;</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} disabled={sending} aria-label="Close" title="Close (Esc)">
            <CloseIcon size={18} />
          </button>
        </header>

        <div className="modal-body email-body">
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <label className="field">
            <span>To</span>
            <input ref={toRef} className={`input${shown.to ? ' input-invalid' : ''}`} value={to} onChange={(e) => setTo(e.target.value)}
              placeholder="customer@example.com" autoComplete="email" />
            {shown.to ? <div className="field-error">{shown.to}</div> : <div className="field-help">Separate several addresses with commas.</div>}
          </label>
          <label className="field">
            <span>CC <em className="optional">optional</em></span>
            <input className={`input${shown.cc ? ' input-invalid' : ''}`} value={cc} onChange={(e) => setCc(e.target.value)} placeholder="accounts@example.com" />
            {shown.cc && <div className="field-error">{shown.cc}</div>}
          </label>
          <label className="field">
            <span>Subject</span>
            <input className={`input${shown.subject ? ' input-invalid' : ''}`} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
            {shown.subject && <div className="field-error">{shown.subject}</div>}
          </label>
          <label className="field">
            <span>Message</span>
            <textarea className="input" rows={9} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={5000} />
          </label>
          <div className="email-attachment">
            <PaperclipIcon size={16} />
            {pdfError ? <span className="field-error">Could not create the PDF: {pdfError}</span>
              : pdf ? <span><strong>{pdf.fileName}</strong> <span className="muted">· {sizeKb} KB</span></span>
                : <span className="muted"><span className="spinner" /> Preparing PDF…</span>}
          </div>
        </div>

        <footer className="modal-foot">
          <span className="muted small hide-sm">The PDF is attached exactly as it downloads.</span>
          <div className="modal-foot-actions">
            <button type="button" className="btn" onClick={onClose} disabled={sending}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={sending || !pdf}>
              {sending ? <><span className="spinner" /> Sending…</> : <><MailIcon /> Send email</>}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}
