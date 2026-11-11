import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { companiesService, toCompanyRecord } from '../../../services/companies';
import { listTaxInvoices } from '../../../services/taxInvoices';
import { getCompany } from '../../../config/companySettings';
import { GSTIN_PATTERN, gstStateName } from '../../../config/gstStates';
import { addressLines } from '../../../utils/invoice';
import useFormGuards from '../../../hooks/useFormGuards';
import { ArrowLeftIcon, TrashIcon } from '../../../components/Icons';
import { AuditLine } from '../../../components/AuditInfo';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form, otherNames) {
  const errors = {};
  const name = form.name.trim();
  if (!name) errors.name = 'Company name is required';
  else if (otherNames.has(name.toLowerCase())) errors.name = 'A company with this name already exists';
  if (form.gst && !GSTIN_PATTERN.test(form.gst)) errors.gst = 'GSTIN should be 15 characters, e.g. 27ABCDE1234F1Z5';
  if (form.email && !EMAIL_PATTERN.test(form.email)) errors.email = 'Enter a valid email address';
  return errors;
}

const FieldError = ({ message }) => (message ? <div className="field-error">{message}</div> : null);

function TextField({ label, optional, error, help, className = '', mono = false, ...inputProps }) {
  return (
    <label className={`field ${className}`}>
      <span>{label}{optional && <em className="optional">optional</em>}</span>
      <input className={`input${mono ? ' mono-input' : ''}${error ? ' input-invalid' : ''}`} {...inputProps} />
      <FieldError message={error} />
      {help && <div className="field-help">{help}</div>}
    </label>
  );
}

export default function CompanyForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const formRef = useRef(null);

  const [form, setForm] = useState(() => toCompanyRecord({}));

  const [meta, setMeta] = useState(null); // who created / last updated the record
  const [savedJson, setSavedJson] = useState(null);
  const [otherNames, setOtherNames] = useState(() => new Set());
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([companiesService.list(), listTaxInvoices().catch(() => [])])
      .then(([companies, invoices]) => {
        if (cancelled) return;
        setOtherNames(new Set(companies.filter((c) => c.id !== id).map((c) => c.name.trim().toLowerCase())));
        let initial = toCompanyRecord({});
        if (isEdit) {
          const company = companies.find((c) => c.id === id);
          if (!company) throw new Error('Company not found');
          setMeta(company);
          initial = toCompanyRecord(company);
          setInvoiceCount(invoices.filter((inv) => inv.poCompanyId === id).length);
        }
        setForm(initial);
        setSavedJson(JSON.stringify(initial));
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  const isDirty = savedJson !== null && JSON.stringify(form) !== savedJson;
  useFormGuards({ isDirty, saving, formRef });

  const allErrors = validate(form, otherNames);
  // Duplicate names are flagged straight away; everything else after the first save attempt
  const errors = submitted ? allErrors : allErrors.name?.includes('exists') ? { name: allErrors.name } : {};

  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));
  const setAddress = (name) => (e) => setForm((f) => ({ ...f, address: { ...f.address, [name]: e.target.value } }));

  // GSTIN: upper-case it, and fill in the state from its code if the state is still empty
  const setGst = (e) => {
    const gst = e.target.value.toUpperCase().replace(/\s/g, '');
    setForm((f) => {
      const state = GSTIN_PATTERN.test(gst) && !f.address.state ? gstStateName(gst) : f.address.state;
      const country = GSTIN_PATTERN.test(gst) && !f.address.country ? 'INDIA' : f.address.country;
      return { ...f, gst, address: { ...f.address, state, country } };
    });
  };

  const gstValid = GSTIN_PATTERN.test(form.gst);
  const sameState = gstValid && form.gst.slice(0, 2) === (getCompany().gst || '').slice(0, 2);
  const gstHelp = gstValid
    ? `${gstStateName(form.gst) || 'Unknown state'} (${form.gst.slice(0, 2)}) — invoices will use ${sameState ? 'CGST + SGST' : 'IGST'}`
    : 'Leave empty for export customers.';

  const handleCancel = () => {
    if (!isDirty || window.confirm('Discard your unsaved changes?')) navigate('/companies');
  };

  const save = async (addAnother) => {
    setSubmitted(true);
    setError('');
    if (Object.keys(allErrors).length) {
      requestAnimationFrame(() =>
        document.querySelector('.field-error')?.closest('.field')?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      );
      return;
    }
    setSaving(true);
    try {
      if (isEdit) await companiesService.update(id, form);
      else await companiesService.create(form);
      const flash = `${form.name.trim()} ${isEdit ? 'updated' : 'added'}`;
      if (addAnother) {
        const blank = toCompanyRecord({});
        setOtherNames((s) => new Set([...s, form.name.trim().toLowerCase()]));
        setForm(blank);
        setSavedJson(JSON.stringify(blank));
        setSubmitted(false);
        setSaving(false);
        navigate('/companies/new', { replace: true, state: { flash } });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setSavedJson(JSON.stringify(form));
        navigate('/companies', { state: { flash } });
      }
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const note = invoiceCount ? `\n\nIt is used on ${invoiceCount} invoice${invoiceCount > 1 ? 's' : ''}; those invoices keep their copy of the details.` : '';
    if (!window.confirm(`Delete "${form.name}"?${note}`)) return;
    try {
      await companiesService.remove(id);
      setSavedJson(JSON.stringify(form));
      navigate('/companies', { state: { flash: `${form.name} deleted` } });
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) return <p className="muted">Loading…</p>;

  const saveLabel = saving ? 'Saving…' : isEdit ? 'Update Company' : 'Save Company';
  const previewAddress = addressLines(form.address);
  const previewContact = [form.email, form.mobile || form.phone].filter(Boolean).join(' · ');

  return (
    <form ref={formRef} onSubmit={(e) => { e.preventDefault(); save(false); }} noValidate>
      <div className="page-head">
        <div>
          <Link to="/companies" className="crumb"><ArrowLeftIcon size={14} /> Companies</Link>
          <h1>
            {isEdit ? form.name || 'Edit Company' : 'New Company'}
            {isDirty && <span className="badge">Unsaved</span>}
          </h1>
          {isEdit && <AuditLine record={meta} />}
        </div>
        <div className="page-head-actions">
          <button type="button" className="btn" onClick={handleCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saveLabel}</button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="inv-layout">
        <div className="inv-main">
          <section className="panel">
            <h2 className="panel-title"><span className="step">1</span> Company</h2>
            <div className="grid-2">
              <TextField className="span-2" label="Company name" value={form.name} onChange={set('name')} error={errors.name}
                placeholder="e.g. KOMAL CHEMIEQUIP PVT LTD" autoFocus={!isEdit} />
              <TextField label="GSTIN" optional value={form.gst} onChange={setGst} error={errors.gst}
                placeholder="27ABCDE1234F1Z5" maxLength={15} mono help={!errors.gst && gstHelp} />
            </div>
          </section>

          <section className="panel">
            <h2 className="panel-title"><span className="step">2</span> Address</h2>
            <div className="grid-2">
              <TextField className="span-2" label="Address line 1" optional value={form.address.addressline1} onChange={setAddress('addressline1')} />
              <TextField className="span-2" label="Address line 2" optional value={form.address.addressline2} onChange={setAddress('addressline2')} />
              <TextField label="City" optional value={form.address.city} onChange={setAddress('city')} />
              <TextField label="State" optional value={form.address.state} onChange={setAddress('state')} />
              <TextField label="Pincode / PO Box" optional value={form.address.pincode} onChange={setAddress('pincode')} />
              <TextField label="Country" optional value={form.address.country} onChange={setAddress('country')} />
            </div>
          </section>

          <section className="panel">
            <h2 className="panel-title"><span className="step">3</span> Contact</h2>
            <div className="grid-2">
              <TextField label="Email" optional type="email" value={form.email} onChange={set('email')} error={errors.email} />
              <TextField label="Mobile" optional type="tel" value={form.mobile} onChange={set('mobile')} />
              <TextField label="Phone" optional type="tel" value={form.phone} onChange={set('phone')} />
              <TextField label="Fax" optional type="tel" value={form.fax} onChange={set('fax')} />
            </div>
          </section>

          <section className="panel">
            <h2 className="panel-title"><span className="step">4</span> Shipping <span className="muted small">— for export invoices</span></h2>
            <div className="grid-2">
              <TextField label="Port of discharge" optional value={form.portOfDischarge} onChange={set('portOfDischarge')} placeholder="e.g. JEBEL ALI" />
              <TextField label="Final destination port" optional value={form.finalDestinationPort} onChange={set('finalDestinationPort')} />
              <TextField label="Country of final destination" optional value={form.countryOfFinalDestination} onChange={set('countryOfFinalDestination')} />
            </div>
          </section>
        </div>

        <aside className="inv-side">
          <div className="panel summary">
            <h2 className="panel-title">Preview on invoice</h2>
            <div className="preview-box">
              <div className="paper-label">Bill to</div>
              <div className="paper-strong">{form.name || <span className="muted">Company name</span>}</div>
              {previewAddress.map((l) => <div key={l}>{l}</div>)}
              {form.gst && <div><strong>GSTIN:</strong> {form.gst}</div>}
              {previewContact && <div>{previewContact}</div>}
            </div>
            {isEdit && (
              <p className="field-help usage">
                Used on <strong>{invoiceCount}</strong> invoice{invoiceCount === 1 ? '' : 's'}. Existing invoices keep the details they were created with.
              </p>
            )}
            <button type="submit" className="btn btn-primary btn-block" disabled={saving}>{saveLabel}</button>
            {!isEdit && (
              <button type="button" className="btn btn-block btn-secondary-block" disabled={saving} onClick={() => save(true)}>
                Save &amp; add another
              </button>
            )}
            <p className="kbd-hint"><kbd>Ctrl</kbd> + <kbd>S</kbd> to save</p>
            {isEdit && (
              <div className="danger-zone">
                <button type="button" className="btn btn-danger-outline btn-block" onClick={handleDelete}><TrashIcon /> Delete company</button>
              </div>
            )}
          </div>
        </aside>
      </div>

      <div className="mobile-savebar">
        <span className="muted small">{isDirty ? 'Unsaved changes' : 'No changes'}</span>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saveLabel}</button>
      </div>
    </form>
  );
}
