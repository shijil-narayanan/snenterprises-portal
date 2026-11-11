import { useEffect, useRef, useState } from 'react';
import { loadCompanySettings, saveCompanySettings } from '../../../services/settings';
import { mergeCompany } from '../../../config/companySettings';
import { GSTIN_PATTERN, gstStateName } from '../../../config/gstStates';
import DocumentHeader from '../../../components/DocumentHeader';
import { formatDateTime, userLabel } from '../../../utils/audit';
import useFormGuards from '../../../hooks/useFormGuards';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const SWIFT_PATTERN = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

// Only the editable fields (the store also carries bookkeeping like updatedAt)
const editable = (c) => ({
  name: c.name || '', gst: c.gst || '', iec: c.iec || '',
  address: { addressline1: '', addressline2: '', city: '', state: '', pincode: '', country: '', ...c.address },
  mobile: c.mobile || '', phone: c.phone || '', email: c.email || '',
  bankDetails: { bankName: '', accountNumber: '', ifsc: '', swiftCode: '', branch: '', ...c.bankDetails },
  lut: c.lut || '',
  senderEmail: c.senderEmail || '', replyTo: c.replyTo || '',
});

function validate(f) {
  const e = {};
  if (!f.name.trim()) e.name = 'Company name is required';
  if (f.gst && !GSTIN_PATTERN.test(f.gst)) e.gst = 'GSTIN should be 15 characters, e.g. 27ABCDE1234F1Z5';
  if (f.email && !EMAIL_PATTERN.test(f.email)) e.email = 'Enter a valid email address';
  if (f.senderEmail && !EMAIL_PATTERN.test(f.senderEmail)) e.senderEmail = 'Enter a valid email address';
  if (f.replyTo && !EMAIL_PATTERN.test(f.replyTo)) e.replyTo = 'Enter a valid email address';
  if (f.bankDetails.ifsc && !IFSC_PATTERN.test(f.bankDetails.ifsc)) e.ifsc = 'IFSC is 11 characters, e.g. HDFC0001425';
  if (f.bankDetails.swiftCode && !SWIFT_PATTERN.test(f.bankDetails.swiftCode)) e.swiftCode = 'SWIFT is 8 or 11 characters, e.g. HDFCINBBXXX';
  if (f.bankDetails.accountNumber && !/^\d{6,20}$/.test(f.bankDetails.accountNumber)) e.accountNumber = 'Account number should be 6–20 digits';
  return e;
}

const FieldError = ({ message }) => (message ? <div className="field-error">{message}</div> : null);

function Field({ label, optional, error, help, className = '', mono, ...input }) {
  return (
    <label className={`field ${className}`}>
      <span>{label}{optional && <em className="optional">optional</em>}</span>
      <input className={`input${mono ? ' mono-input' : ''}${error ? ' input-invalid' : ''}`} {...input} />
      <FieldError message={error} />
      {help && !error && <div className="field-help">{help}</div>}
    </label>
  );
}

export default function CompanySettings() {
  const formRef = useRef(null);
  const [form, setForm] = useState(null);
  const [savedJson, setSavedJson] = useState(null);
  const [meta, setMeta] = useState(null);
  const [neverSaved, setNeverSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  useEffect(() => {
    loadCompanySettings()
      .then(({ company, saved }) => {
        const initial = editable(company);
        setForm(initial);
        setSavedJson(JSON.stringify(initial));
        setMeta(saved);
        setNeverSaved(!saved);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const isDirty = form !== null && JSON.stringify(form) !== savedJson;
  useFormGuards({ isDirty, saving, formRef });

  if (loading) return <p className="muted">Loading…</p>;
  if (!form) return <div className="alert alert-error">{error || 'Could not load settings.'}</div>;

  const allErrors = validate(form);
  const errors = submitted ? allErrors : {};
  const set = (name, upper) => (e) => setForm((f) => ({ ...f, [name]: upper ? e.target.value.toUpperCase() : e.target.value }));
  const setAddr = (name) => (e) => setForm((f) => ({ ...f, address: { ...f.address, [name]: e.target.value } }));
  const setBank = (name, upper) => (e) =>
    setForm((f) => ({ ...f, bankDetails: { ...f.bankDetails, [name]: upper ? e.target.value.toUpperCase().replace(/\s/g, '') : e.target.value } }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setError('');
    if (Object.keys(allErrors).length) {
      requestAnimationFrame(() => document.querySelector('.field-error')?.closest('.field')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }
    setSaving(true);
    try {
      const saved = await saveCompanySettings(form);
      const next = editable(saved);
      setForm(next);
      setSavedJson(JSON.stringify(next));
      setMeta(saved);
      setNeverSaved(false);
      setSubmitted(false);
      setFlash('Settings saved');
      setTimeout(() => setFlash(''), 3500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Discard your changes?')) setForm(JSON.parse(savedJson));
  };

  const gstHelp = GSTIN_PATTERN.test(form.gst) ? `${gstStateName(form.gst) || 'Unknown state'} (${form.gst.slice(0, 2)}) — customers in this state get CGST + SGST` : '';
  const preview = mergeCompany(form);
  const bank = form.bankDetails;

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      <div className="page-head">
        <div>
          <h1>Settings {isDirty && <span className="badge">Unsaved</span>}</h1>
          <p className="muted">Your own details, printed on tax invoices, commercial invoices and packing lists.</p>
          {meta?.updatedAt && (
            <p className="audit-line">
              Last saved{meta.updatedBy ? ` by ${userLabel(meta.updatedBy)}` : ''} on {formatDateTime(meta.updatedAt)}
            </p>
          )}
        </div>
        <div className="page-head-actions">
          <button type="button" className="btn" onClick={handleReset} disabled={!isDirty}>Discard changes</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !isDirty}>{saving ? 'Saving…' : 'Save Settings'}</button>
        </div>
      </div>

      {error && <div className="alert alert-error">Could not save: {error}</div>}
      {neverSaved && (
        <div className="alert alert-info">These are the starting values. Check them and click <strong>Save Settings</strong> to store them.</div>
      )}
      {flash && <div className="flash" role="status">✓ {flash}</div>}

      <div className="inv-layout">
        <div className="inv-main">
          <section className="panel">
            <h2 className="panel-title"><span className="step">1</span> Company</h2>
            <div className="grid-2">
              <Field className="span-2" label="Company name" value={form.name} onChange={set('name')} error={errors.name} />
              <Field label="GSTIN" optional mono maxLength={15} value={form.gst} onChange={(e) => setForm((f) => ({ ...f, gst: e.target.value.toUpperCase().replace(/\s/g, '') }))} error={errors.gst} help={gstHelp} />
              <Field label="IEC (Import Export Code)" optional mono value={form.iec} onChange={set('iec')} help="Shown on commercial invoices and packing lists" />
            </div>
          </section>

          <section className="panel">
            <h2 className="panel-title"><span className="step">2</span> Address</h2>
            <div className="grid-2">
              <Field className="span-2" label="Address line 1" value={form.address.addressline1} onChange={setAddr('addressline1')} />
              <Field className="span-2" label="Address line 2" optional value={form.address.addressline2} onChange={setAddr('addressline2')} />
              <Field label="City" value={form.address.city} onChange={setAddr('city')} />
              <Field label="State" optional value={form.address.state} onChange={setAddr('state')} />
              <Field label="Pincode" value={form.address.pincode} onChange={setAddr('pincode')} />
              <Field label="Country" value={form.address.country} onChange={setAddr('country')} />
            </div>
          </section>

          <section className="panel">
            <h2 className="panel-title"><span className="step">3</span> Contact</h2>
            <div className="grid-3">
              <Field label="Mobile" optional type="tel" value={form.mobile} onChange={set('mobile')} placeholder="+91-…" />
              <Field label="Phone" optional type="tel" value={form.phone} onChange={set('phone')} placeholder="Landline, if any" />
              <Field label="Email" optional type="email" value={form.email} onChange={set('email')} error={errors.email} />
            </div>
          </section>

          <section className="panel">
            <h2 className="panel-title"><span className="step">4</span> Bank account</h2>
            <div className="grid-2">
              <Field label="Bank name" value={bank.bankName} onChange={setBank('bankName')} placeholder="e.g. HDFC Bank" />
              <Field label="Account number" mono inputMode="numeric" value={bank.accountNumber} onChange={(e) => setForm((f) => ({ ...f, bankDetails: { ...f.bankDetails, accountNumber: e.target.value.replace(/\s/g, '') } }))} error={errors.accountNumber} />
              <Field label="IFSC" mono maxLength={11} value={bank.ifsc} onChange={setBank('ifsc', true)} error={errors.ifsc} />
              <Field label="SWIFT code" optional mono maxLength={11} value={bank.swiftCode} onChange={setBank('swiftCode', true)} error={errors.swiftCode} help="Needed on export documents" />
              <Field className="span-2" label="Branch" value={bank.branch} onChange={setBank('branch')} />
            </div>
          </section>

          <section className="panel">
            <h2 className="panel-title"><span className="step">5</span> Exports</h2>
            <Field label="LUT application reference number" value={form.lut} onChange={set('lut')}
              help="Letter of Undertaking — renewed every financial year. New commercial invoices and packing lists start with this; existing ones keep theirs." />
          </section>

          <section className="panel">
            <h2 className="panel-title"><span className="step">6</span> Email</h2>
            <div className="grid-2">
              <Field label="Send emails from" optional type="email" value={form.senderEmail} onChange={set('senderEmail')} error={errors.senderEmail}
                placeholder={form.email || 'accounts@yourdomain.com'}
                help="Must be a verified sender in your Brevo account. Leave empty to use the company email above." />
              <Field label="Replies go to" optional type="email" value={form.replyTo} onChange={set('replyTo')} error={errors.replyTo}
                placeholder={form.senderEmail || form.email} help="Leave empty to receive replies at the sending address." />
            </div>
          </section>

          <section className="panel">
            <h2 className="panel-title">Preview on documents</h2>
            <div className="settings-preview">
              <DocumentHeader title="Tax Invoice" company={preview} showIec />
              <div className="settings-bank">
                <div className="paper-label">Bank details</div>
                <dl className="paper-dl compact">
                  <dt>Account Holder</dt><dd>{form.name || '—'}</dd>
                  <dt>Bank</dt><dd>{bank.bankName || '—'}</dd>
                  <dt>A/c No.</dt><dd>{bank.accountNumber || '—'}</dd>
                  <dt>IFSC</dt><dd>{bank.ifsc || '—'}</dd>
                  <dt>SWIFT</dt><dd>{bank.swiftCode || '—'}</dd>
                  <dt>Branch</dt><dd>{bank.branch || '—'}</dd>
                </dl>
              </div>
            </div>
          </section>
        </div>

        <aside className="inv-side">
          <div className="panel summary">
            <h2 className="panel-title">How changes apply</h2>
            <ul className="settings-notes">
              <li>New invoices and packing lists use these details.</li>
              <li>Already-saved documents keep the details they were saved with, until you edit and save them again.</li>
              <li>The LUT here is the default for new export documents.</li>
            </ul>
            <button type="submit" className="btn btn-primary btn-block" disabled={saving || !isDirty}>{saving ? 'Saving…' : 'Save Settings'}</button>
            <p className="kbd-hint"><kbd>Ctrl</kbd> + <kbd>S</kbd> to save</p>
          </div>
        </aside>
      </div>

      <div className="mobile-savebar">
        <span className="muted small">{isDirty ? 'Unsaved changes' : 'All changes saved'}</span>
        <button type="submit" className="btn btn-primary" disabled={saving || !isDirty}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}
