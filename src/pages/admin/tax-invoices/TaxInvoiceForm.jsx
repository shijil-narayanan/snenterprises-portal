import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createTaxInvoice, getTaxInvoice, listTaxInvoices, updateTaxInvoice } from '../../../services/taxInvoices';
import { companiesService } from '../../../services/companies';
import { productsService } from '../../../services/products';
import { CURRENCIES, TAX_TYPES } from '../../../config/catalog';
import InvoiceTotals from './InvoiceTotals';
import DateInput from '../../../components/DateInput';
import SearchSelect from '../../../components/SearchSelect';
import {
  computeTotals,
  emptyInvoice,
  emptyItem,
  formatMoney,
  lineAmount,
  suggestInvoiceNumber,
} from '../../../utils/invoice';

// Buyer details copied onto the invoice (without bookkeeping fields)
const buyerSnapshot = ({ id: _id, createdAt: _c, updatedAt: _u, ...rest }) => rest;

export default function TaxInvoiceForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyInvoice);
  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [all, companyList, productList] = await Promise.all([
          listTaxInvoices(),
          companiesService.list(),
          productsService.list(),
        ]);
        if (cancelled) return;
        setCompanies(companyList);
        setProducts(productList);
        if (isEdit) {
          const inv = all.find((i) => i.id === id) || (await getTaxInvoice(id));
          if (!inv) throw new Error('Invoice not found');
          // Older invoices stored only the company name: link it to the company if the name matches
          const poCompanyId = inv.poCompanyId || companyList.find((c) => c.name === inv.poCompany)?.id || '';
          setForm({ ...emptyInvoice(), ...inv, poCompanyId, items: inv.items?.length ? inv.items : [emptyItem()] });
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

  const selectCompany = (companyId) => {
    const company = companies.find((c) => c.id === companyId);
    setForm((f) => ({
      ...f,
      poCompanyId: companyId,
      poCompany: company?.name || '',
      buyer: company ? buyerSnapshot(company) : null,
    }));
  };

  const setItem = (index, changes) =>
    setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === index ? { ...it, ...changes } : it)) }));

  const selectProduct = (index, productId) => {
    const p = products.find((x) => x.id === productId);
    setItem(index, { productId, description: p?.name || '', hsnCode: p?.hsnCode || '' });
  };

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeItem = (index) =>
    setForm((f) => ({ ...f, items: f.items.length > 1 ? f.items.filter((_, i) => i !== index) : [emptyItem()] }));

  const totals = computeTotals(form.items, form.taxType);
  const companyFound = companies.some((c) => c.id === form.poCompanyId);
  const companyOptions = companies.map((c) => ({ value: c.id, label: c.name }));
  // Product code and HSN are searchable too
  const productOptions = products.map((p) => ({
    value: p.id,
    label: p.name,
    searchText: [p.code, p.name, p.hsnCode].filter(Boolean).join(' '),
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const items = form.items.filter((it) => it.description.trim());
    if (!items.length) {
      setError('Add at least one item.');
      return;
    }
    setSaving(true);
    try {
      // Refresh the buyer snapshot from the current company record
      const company = companies.find((c) => c.id === form.poCompanyId);
      const data = { ...form, items, buyer: company ? buyerSnapshot(company) : form.buyer };
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
      {(companies.length === 0 || products.length === 0) && (
        <div className="alert alert-info">
          {companies.length === 0 && <>No companies yet — <Link to="/admin/companies">add or import companies</Link>. </>}
          {products.length === 0 && <>No products yet — <Link to="/admin/products">add or import products</Link>.</>}
        </div>
      )}

      <div className="form-row">
        <label className="field">
          <span>Invoice Date</span>
          <DateInput value={form.invoiceDate} onChange={(v) => setForm((f) => ({ ...f, invoiceDate: v }))} required />
        </label>
        <label className="field">
          <span>Invoice Number</span>
          <input className="input" value={form.invoiceNumber} onChange={setField('invoiceNumber')} required />
        </label>
        <label className="field">
          <span>PO Date</span>
          <DateInput value={form.poDate} onChange={(v) => setForm((f) => ({ ...f, poDate: v }))} />
        </label>
        <label className="field">
          <span>PO Number</span>
          <input className="input" value={form.poNumber} onChange={setField('poNumber')} />
        </label>
      </div>

      <div className="form-row">
        <label className="field field-wide">
          <span>PO Company</span>
          <SearchSelect
            aria-label="PO Company"
            options={companyOptions}
            value={companyFound ? form.poCompanyId : ''}
            onChange={selectCompany}
            placeholder={form.poCompany && !companyFound ? `${form.poCompany} (not in company list — select again)` : 'Search or select company…'}
            required
          />
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
          <span>Item</span><span>HSN</span><span>Qty</span><span>Rate</span><span>Amount</span><span />
        </div>
        {form.items.map((item, i) => {
          const productFound = products.some((p) => p.id === item.productId);
          return (
            <div className="items-row" key={i}>
              <SearchSelect
                aria-label="Item"
                options={productOptions}
                value={productFound ? item.productId : ''}
                onChange={(v) => selectProduct(i, v)}
                placeholder={item.description && !productFound ? item.description : 'Search or select product…'}
                filterOption={(opt, input) => opt.data.searchText.toLowerCase().includes(input.toLowerCase())}
              />
              <input className="input" aria-label="HSN Code" value={item.hsnCode || ''} onChange={(e) => setItem(i, { hsnCode: e.target.value })} />
              <input
                type="number" min="0" step="any" className="input num" aria-label="Quantity"
                value={item.qty}
                onChange={(e) => setItem(i, { qty: e.target.value })}
              />
              <input
                type="number" min="0" step="0.01" className="input num" aria-label="Rate"
                value={item.rate}
                onChange={(e) => setItem(i, { rate: e.target.value })}
              />
              <input className="input num" aria-label="Amount" value={formatMoney(lineAmount(item), form.currency)} readOnly tabIndex={-1} />
              <button type="button" className="btn btn-danger btn-icon" title="Remove item" onClick={() => removeItem(i)}>🗑</button>
            </div>
          );
        })}
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
