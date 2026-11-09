import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  createTaxInvoice,
  getTaxInvoice,
  listTaxInvoices,
  updateTaxInvoice,
} from '../../../services/taxInvoices';
import { COMPANY_SUGGESTIONS, CURRENCIES, ITEM_SUGGESTIONS, TAX_TYPES } from '../../../config/catalog';
import InvoiceTotals from './InvoiceTotals';
import {
  computeTotals,
  emptyInvoice,
  emptyItem,
  formatMoney,
  lineAmount,
  suggestInvoiceNumber,
} from '../../../utils/invoice';

export default function TaxInvoiceForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyInvoice);
  const [companies, setCompanies] = useState(COMPANY_SUGGESTIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await listTaxInvoices();
        if (cancelled) return;
        // Offer previously used companies as suggestions
        setCompanies([...new Set([...COMPANY_SUGGESTIONS, ...all.map((i) => i.poCompany).filter(Boolean)])]);
        if (isEdit) {
          const inv = all.find((i) => i.id === id) || (await getTaxInvoice(id));
          if (!inv) throw new Error('Invoice not found');
          setForm({ ...emptyInvoice(), ...inv, items: inv.items?.length ? inv.items : [emptyItem()] });
        } else {
          setForm((f) => ({ ...f, invoiceNumber: suggestInvoiceNumber(all) }));
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  const setField = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  const setItem = (index, name, value) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === index ? { ...it, [name]: value } : it)),
    }));

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeItem = (index) =>
    setForm((f) => ({ ...f, items: f.items.length > 1 ? f.items.filter((_, i) => i !== index) : [emptyItem()] }));

  const totals = computeTotals(form.items, form.taxType);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.items.some((it) => it.description.trim())) {
      setError('Add at least one item with a description.');
      return;
    }
    setSaving(true);
    try {
      const data = { ...form, items: form.items.filter((it) => it.description.trim()) };
      const savedId = isEdit ? (await updateTaxInvoice(id, data), id) : await createTaxInvoice(data);
      navigate(`/admin/tax-invoices/${savedId}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) return <p className="muted">Loading…</p>;

  return (
    <form className="card invoice-form" onSubmit={handleSubmit}>
      <div className="card-header">
        <h1>{isEdit ? 'Edit Tax Invoice' : 'New Tax Invoice'}</h1>
        <Link to="/admin/tax-invoices" className="btn">Cancel</Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-row">
        <label className="field">
          <span>Invoice Date</span>
          <input type="date" className="input" value={form.invoiceDate} onChange={setField('invoiceDate')} required />
        </label>
        <label className="field">
          <span>Invoice Number</span>
          <input className="input" value={form.invoiceNumber} onChange={setField('invoiceNumber')} required />
        </label>
        <label className="field">
          <span>PO Date</span>
          <input type="date" className="input" value={form.poDate} onChange={setField('poDate')} />
        </label>
        <label className="field">
          <span>PO Number</span>
          <input className="input" value={form.poNumber} onChange={setField('poNumber')} />
        </label>
      </div>

      <div className="form-row">
        <label className="field field-wide">
          <span>PO Company</span>
          <input
            className="input"
            list="po-companies"
            value={form.poCompany}
            onChange={setField('poCompany')}
            placeholder="Select or type a company"
          />
          <datalist id="po-companies">
            {companies.map((c) => <option key={c} value={c} />)}
          </datalist>
        </label>
        <label className="field">
          <span>Currency</span>
          <select className="input" value={form.currency} onChange={setField('currency')}>
            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
          </select>
        </label>
        <label className="field field-wide">
          <span>Payment Terms</span>
          <input className="input" value={form.paymentTerms} onChange={setField('paymentTerms')} placeholder="e.g. 30 days from invoice date" />
        </label>
      </div>

      <div className="items">
        <div className="items-head">
          <span>Item</span><span>Qty</span><span>Rate</span><span>Amount</span><span />
        </div>
        <datalist id="item-suggestions">
          {ITEM_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
        </datalist>
        {form.items.map((item, i) => (
          <div className="items-row" key={i}>
            <input
              className="input"
              list="item-suggestions"
              placeholder="Item description"
              aria-label="Item"
              value={item.description}
              onChange={(e) => setItem(i, 'description', e.target.value)}
            />
            <input
              type="number" min="0" step="any" className="input num" aria-label="Quantity"
              value={item.qty}
              onChange={(e) => setItem(i, 'qty', e.target.value)}
            />
            <input
              type="number" min="0" step="0.01" className="input num" aria-label="Rate"
              value={item.rate}
              onChange={(e) => setItem(i, 'rate', e.target.value)}
            />
            <input className="input num" aria-label="Amount" value={formatMoney(lineAmount(item), form.currency)} readOnly tabIndex={-1} />
            <button type="button" className="btn btn-danger btn-icon" title="Remove item" onClick={() => removeItem(i)}>🗑</button>
          </div>
        ))}
        <button type="button" className="btn btn-primary" onClick={addItem}>Add Item</button>
      </div>

      <div className="form-row">
        <label className="field">
          <span>Tax</span>
          <select className="input" value={form.taxType} onChange={setField('taxType')}>
            {TAX_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
      </div>

      <InvoiceTotals totals={totals} taxType={form.taxType} currency={form.currency} />

      <div className="form-actions">
        <Link to="/admin/tax-invoices" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Update Invoice' : 'Save Invoice'}
        </button>
      </div>
    </form>
  );
}
