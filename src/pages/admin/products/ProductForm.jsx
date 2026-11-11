import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { productsService } from '../../../services/products';
import { listTaxInvoices } from '../../../services/taxInvoices';
import useFormGuards from '../../../hooks/useFormGuards';
import { ArrowLeftIcon, TrashIcon } from '../../../components/Icons';
import { AuditLine } from '../../../components/AuditInfo';

const EMPTY = { code: '', name: '', hsnCode: '' };
const HSN_PATTERN = /^(\d{4}|\d{6}|\d{8})$/;

function validate(form, otherNames) {
  const errors = {};
  const name = form.name.trim();
  if (!name) errors.name = 'Product name is required';
  else if (otherNames.has(name.toLowerCase())) errors.name = 'A product with this name already exists';
  if (form.hsnCode && !HSN_PATTERN.test(form.hsnCode)) errors.hsnCode = 'HSN code should be 4, 6 or 8 digits';
  return errors;
}

const FieldError = ({ message }) => (message ? <div className="field-error">{message}</div> : null);

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const formRef = useRef(null);

  const [form, setForm] = useState(EMPTY);

  const [meta, setMeta] = useState(null); // who created / last updated the record
  const [savedJson, setSavedJson] = useState(null);
  const [others, setOthers] = useState([]);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([productsService.list(), listTaxInvoices().catch(() => [])])
      .then(([products, invoices]) => {
        if (cancelled) return;
        setOthers(products.filter((p) => p.id !== id));
        let initial = EMPTY;
        if (isEdit) {
          const p = products.find((x) => x.id === id);
          if (!p) throw new Error('Product not found');
          setMeta(p);
          initial = { code: p.code || '', name: p.name || '', hsnCode: p.hsnCode || '' };
          setInvoiceCount(invoices.filter((inv) => (inv.items || []).some((it) => it.productId === id)).length);
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

  const otherNames = useMemo(() => new Set(others.map((p) => (p.name || '').trim().toLowerCase())), [others]);
  // Most used HSN codes, offered as one-click suggestions
  const commonHsn = useMemo(() => {
    const counts = {};
    others.forEach((p) => { if (p.hsnCode) counts[p.hsnCode] = (counts[p.hsnCode] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [others]);

  const isDirty = savedJson !== null && JSON.stringify(form) !== savedJson;
  useFormGuards({ isDirty, saving, formRef });

  const allErrors = validate(form, otherNames);
  const errors = submitted ? allErrors : allErrors.name?.includes('exists') ? { name: allErrors.name } : {};

  const update = (changes) => setForm((f) => ({ ...f, ...changes }));

  const handleCancel = () => {
    if (!isDirty || window.confirm('Discard your unsaved changes?')) navigate('/products');
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
      if (isEdit) await productsService.update(id, form);
      else await productsService.create(form);
      const label = form.name.trim().length > 40 ? `${form.name.trim().slice(0, 40)}…` : form.name.trim();
      const flash = `${label} ${isEdit ? 'updated' : 'added'}`;
      if (addAnother) {
        setOthers((list) => [...list, { ...form }]);
        setForm(EMPTY);
        setSavedJson(JSON.stringify(EMPTY));
        setSubmitted(false);
        setSaving(false);
        navigate('/products/new', { replace: true, state: { flash } });
        requestAnimationFrame(() => document.querySelector('textarea')?.focus());
      } else {
        setSavedJson(JSON.stringify(form));
        navigate('/products', { state: { flash } });
      }
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const note = invoiceCount ? `\n\nIt appears on ${invoiceCount} invoice${invoiceCount > 1 ? 's' : ''}; those invoices are not affected.` : '';
    if (!window.confirm(`Delete "${form.name}"?${note}`)) return;
    try {
      await productsService.remove(id);
      setSavedJson(JSON.stringify(form));
      navigate('/products', { state: { flash: 'Product deleted' } });
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) return <p className="muted">Loading…</p>;

  const saveLabel = saving ? 'Saving…' : isEdit ? 'Update Product' : 'Save Product';

  return (
    <form ref={formRef} onSubmit={(e) => { e.preventDefault(); save(false); }} noValidate>
      <div className="page-head">
        <div>
          <Link to="/products" className="crumb"><ArrowLeftIcon size={14} /> Products</Link>
          <h1>
            {isEdit ? 'Edit Product' : 'New Product'}
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
            <h2 className="panel-title"><span className="step">1</span> Product</h2>
            <label className="field">
              <span>Name / description</span>
              <textarea className={`input${errors.name ? ' input-invalid' : ''}`} rows={3} value={form.name}
                onChange={(e) => update({ name: e.target.value })} autoFocus={!isEdit}
                placeholder="Exactly as it should appear on invoices, e.g. PVC END CAP FOR 41x41MM CHANNEL - BLACK" />
              <FieldError message={errors.name} />
              <div className="field-help">{form.name.length} characters · shown on invoices exactly as typed</div>
            </label>
            <div className="grid-2 field-gap">
              <label className="field">
                <span>Product code <em className="optional">optional</em></span>
                <input className="input mono-input" value={form.code} onChange={(e) => update({ code: e.target.value.toUpperCase() })}
                  placeholder="e.g. BJC00002" />
                <div className="field-help">Your or the customer&apos;s item code. Searchable on invoices.</div>
              </label>
            </div>
          </section>

          <section className="panel">
            <h2 className="panel-title"><span className="step">2</span> Tax classification</h2>
            <label className="field">
              <span>HSN code <em className="optional">optional</em></span>
              <input className={`input mono-input hsn-input${errors.hsnCode ? ' input-invalid' : ''}`} inputMode="numeric"
                value={form.hsnCode} maxLength={8}
                onChange={(e) => update({ hsnCode: e.target.value.replace(/\D/g, '') })} placeholder="8 digits, e.g. 73089090" />
              <FieldError message={errors.hsnCode} />
            </label>
            {commonHsn.length > 0 && (
              <div className="field field-gap">
                <span className="field-help">Codes used by your other products:</span>
                <div className="chips">
                  {commonHsn.map(([code, count]) => (
                    <button type="button" key={code} className={`chip mono${form.hsnCode === code ? ' chip-active' : ''}`}
                      onClick={() => update({ hsnCode: code })} title={`Used by ${count} product${count > 1 ? 's' : ''}`}>
                      {code} <span className="chip-count">{count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="inv-side">
          <div className="panel summary">
            <h2 className="panel-title">Preview on invoice</h2>
            <table className="paper-table preview-table">
              <thead>
                <tr><th>Description of Goods</th><th>HSN</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>{form.name || <span className="muted">Product name</span>}</td>
                  <td>{form.hsnCode || '—'}</td>
                </tr>
              </tbody>
            </table>
            {isEdit && (
              <p className="field-help usage">
                Appears on <strong>{invoiceCount}</strong> invoice{invoiceCount === 1 ? '' : 's'}. Changes apply to new invoices only.
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
                <button type="button" className="btn btn-danger-outline btn-block" onClick={handleDelete}><TrashIcon /> Delete product</button>
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
