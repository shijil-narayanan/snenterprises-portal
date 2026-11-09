import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { createTaxInvoice, getTaxInvoice, listTaxInvoices, updateTaxInvoice } from '../../../services/taxInvoices';
import { companiesService } from '../../../services/companies';
import { productsService } from '../../../services/products';
import { CURRENCIES, PAYMENT_TERM_PRESETS, TAX_TYPES } from '../../../config/catalog';
import { COMPANY } from '../../../config/company';
import InvoiceTotals from './InvoiceTotals';
import DateInput from '../../../components/DateInput';
import SearchSelect from '../../../components/SearchSelect';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '../../../components/Icons';
import {
  addressLines,
  amountInWords,
  computeTotals,
  emptyInvoice,
  emptyItem,
  formatMoney,
  lineAmount,
  suggestInvoiceNumber,
} from '../../../utils/invoice';

const OUR_STATE_CODE = COMPANY.gst.slice(0, 2);

// Buyer details copied onto the invoice (without bookkeeping fields)
const buyerSnapshot = ({ id: _id, createdAt: _c, updatedAt: _u, ...rest }) => rest;

// Same GST state as us -> CGST+SGST, different state -> IGST, no GSTIN -> no suggestion
function suggestedTaxType(company) {
  const code = (company?.gst || '').slice(0, 2);
  if (!/^\d{2}$/.test(code)) return null;
  return code === OUR_STATE_CODE ? 'CGST_SGST' : 'IGST';
}

function validate(form, usedNumbers) {
  const errors = {};
  const number = form.invoiceNumber.trim();
  if (!number) errors.invoiceNumber = 'Invoice number is required';
  else if (usedNumbers.has(number.toLowerCase())) errors.invoiceNumber = 'This invoice number is already used';
  if (!form.invoiceDate) errors.invoiceDate = 'Invoice date is required';
  if (!form.poCompanyId) errors.poCompany = 'Select the company to bill';
  if (!form.items.some((it) => it.description.trim())) errors.items = 'Add at least one item';
  return errors;
}

const FieldError = ({ message }) => (message ? <div className="field-error">{message}</div> : null);

export default function TaxInvoiceForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const copyFromId = searchParams.get('from');
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyInvoice);
  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);
  const [usedNumbers, setUsedNumbers] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [taxHint, setTaxHint] = useState('');

  const formRef = useRef(null);
  // JSON of the last saved/loaded form, to detect unsaved changes
  const [savedJson, setSavedJson] = useState(null);

  // ---------- Loading ----------
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
        setUsedNumbers(new Set(all.filter((i) => i.id !== id).map((i) => (i.invoiceNumber || '').trim().toLowerCase())));

        let initial;
        if (isEdit) {
          const inv = all.find((i) => i.id === id) || (await getTaxInvoice(id));
          if (!inv) throw new Error('Invoice not found');
          // Older invoices stored only the company name: link it to the company if the name matches
          const poCompanyId = inv.poCompanyId || companyList.find((c) => c.name === inv.poCompany)?.id || '';
          initial = { ...emptyInvoice(), ...inv, poCompanyId, items: inv.items?.length ? inv.items : [emptyItem()] };
        } else {
          initial = { ...emptyInvoice(), invoiceNumber: suggestInvoiceNumber(all) };
          const source = copyFromId && all.find((i) => i.id === copyFromId);
          if (source) {
            initial = {
              ...initial,
              poCompanyId: source.poCompanyId || '',
              poCompany: source.poCompany || '',
              buyer: source.buyer || null,
              currency: source.currency,
              paymentTerms: source.paymentTerms || '',
              taxType: source.taxType,
              items: (source.items || []).map(({ productId, description, hsnCode, qty, rate }) => ({
                productId, description, hsnCode, qty, rate,
              })),
            };
          }
        }
        setForm(initial);
        setSavedJson(JSON.stringify(initial));
      } catch (e) {
        if (!cancelled) setLoadError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit, copyFromId]);

  // Refresh companies/products when returning from another tab (e.g. after adding a company)
  const refreshMasters = useCallback(async () => {
    const [c, p] = await Promise.all([companiesService.list(), productsService.list()]);
    setCompanies(c);
    setProducts(p);
  }, []);
  useEffect(() => {
    const onFocus = () => refreshMasters().catch(() => {});
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshMasters]);

  // ---------- Unsaved changes ----------
  const isDirty = savedJson !== null && JSON.stringify(form) !== savedJson;
  useEffect(() => {
    if (!isDirty || saving) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty, saving]);

  // Ctrl/Cmd + S saves
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ---------- Field updates ----------
  const update = (changes) => setForm((f) => ({ ...f, ...changes }));

  const selectCompany = (companyId) => {
    const company = companies.find((c) => c.id === companyId);
    const tax = suggestedTaxType(company);
    update({
      poCompanyId: companyId,
      poCompany: company?.name || '',
      buyer: company ? buyerSnapshot(company) : null,
      ...(tax ? { taxType: tax } : {}),
    });
    setTaxHint(
      tax === 'IGST' ? 'IGST applied — buyer is registered in another state.'
        : tax === 'CGST_SGST' ? 'CGST + SGST applied — buyer is in the same state.'
          : '',
    );
  };

  const setItem = (index, changes) =>
    setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === index ? { ...it, ...changes } : it)) }));

  const selectProduct = (index, productId) => {
    const p = products.find((x) => x.id === productId);
    setItem(index, { productId, description: p?.name || '', hsnCode: p?.hsnCode || '' });
  };

  const addItem = () => {
    const newIndex = form.items.length;
    setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }));
    // Put the cursor in the new row's product search
    requestAnimationFrame(() => document.querySelectorAll('.li-product input')[newIndex]?.focus());
  };

  const removeItem = (index) =>
    setForm((f) => ({ ...f, items: f.items.length > 1 ? f.items.filter((_, i) => i !== index) : [emptyItem()] }));

  // ---------- Derived ----------
  const totals = computeTotals(form.items, form.taxType);
  const company = companies.find((c) => c.id === form.poCompanyId);
  const buyer = company || form.buyer;
  const allErrors = validate(form, usedNumbers);
  // Show errors after the first save attempt; flag duplicate numbers straight away
  const errors = submitted ? allErrors : allErrors.invoiceNumber?.includes('already') ? { invoiceNumber: allErrors.invoiceNumber } : {};

  const companyOptions = companies.map((c) => ({ value: c.id, label: c.name }));
  const productOptions = products.map((p) => ({
    value: p.id,
    label: p.name,
    searchText: [p.code, p.name, p.hsnCode].filter(Boolean).join(' ').toLowerCase(),
  }));
  const filterProduct = (opt, input) => opt.data.searchText.includes(input.toLowerCase());

  const backTo = isEdit ? `/admin/tax-invoices/${id}` : '/admin/tax-invoices';
  const handleCancel = () => {
    if (!isDirty || window.confirm('Discard your unsaved changes?')) navigate(backTo);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setSaveError('');
    if (Object.keys(allErrors).length) {
      requestAnimationFrame(() =>
        document.querySelector('.field-error')?.closest('.field, .panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      );
      return;
    }
    setSaving(true);
    try {
      const items = form.items.filter((it) => it.description.trim());
      const data = { ...form, items, buyer: company ? buyerSnapshot(company) : form.buyer };
      const savedId = isEdit ? (await updateTaxInvoice(id, data), id) : await createTaxInvoice(data);
      setSavedJson(JSON.stringify(form));
      navigate(`/admin/tax-invoices/${savedId}`, { state: { flash: isEdit ? 'Invoice updated' : 'Invoice created' } });
    } catch (err) {
      setSaveError(err.message);
      setSaving(false);
    }
  };

  if (loading) return <p className="muted">Loading…</p>;
  if (loadError) return <div className="alert alert-error">{loadError}</div>;

  const saveLabel = saving ? 'Saving…' : isEdit ? 'Update Invoice' : 'Save Invoice';

  return (
    <form ref={formRef} className="inv-form" onSubmit={handleSubmit} noValidate>
      <div className="page-head">
        <div>
          <Link to="/admin/tax-invoices" className="crumb"><ArrowLeftIcon size={14} /> Tax Invoices</Link>
          <h1>
            {isEdit ? `Edit ${form.invoiceNumber || 'Tax Invoice'}` : copyFromId ? 'New Tax Invoice (copy)' : 'New Tax Invoice'}
            {isDirty && <span className="badge">Unsaved</span>}
          </h1>
        </div>
        <div className="page-head-actions">
          <button type="button" className="btn" onClick={handleCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saveLabel}</button>
        </div>
      </div>

      {saveError && <div className="alert alert-error">Could not save: {saveError}</div>}

      <div className="inv-layout">
        <div className="inv-main">
          {/* 1. Invoice details */}
          <section className="panel">
            <h2 className="panel-title"><span className="step">1</span> Invoice details</h2>
            <div className="grid-2">
              <label className="field">
                <span>Invoice number</span>
                <input
                  className={`input${errors.invoiceNumber ? ' input-invalid' : ''}`}
                  value={form.invoiceNumber}
                  onChange={(e) => update({ invoiceNumber: e.target.value })}
                />
                <FieldError message={errors.invoiceNumber} />
              </label>
              <label className="field">
                <span>Invoice date</span>
                <DateInput value={form.invoiceDate} onChange={(v) => update({ invoiceDate: v })} required />
                <FieldError message={errors.invoiceDate} />
              </label>
              <label className="field">
                <span>PO number <em className="optional">optional</em></span>
                <input className="input" value={form.poNumber} onChange={(e) => update({ poNumber: e.target.value })} />
              </label>
              <label className="field">
                <span>PO date <em className="optional">optional</em></span>
                <DateInput value={form.poDate} onChange={(v) => update({ poDate: v })} />
              </label>
            </div>
          </section>

          {/* 2. Bill to */}
          <section className="panel">
            <h2 className="panel-title"><span className="step">2</span> Bill to</h2>
            <div className="field">
              <span>PO company</span>
              <SearchSelect
                aria-label="PO Company"
                options={companyOptions}
                value={company ? form.poCompanyId : ''}
                onChange={selectCompany}
                placeholder={form.poCompany && !company ? `${form.poCompany} (no longer in list — select again)` : 'Search company by name…'}
              />
              <FieldError message={errors.poCompany} />
              <div className="field-help">
                Not in the list? <Link to="/admin/companies/new" target="_blank">Add a new company</Link> — it appears here when you come back.
              </div>
            </div>

            {buyer?.name && (
              <div className="buyer-card">
                <div className="buyer-name">{buyer.name}</div>
                <div className="buyer-lines">
                  {addressLines(buyer.address).join(', ') || <span className="muted">No address on file</span>}
                </div>
                <div className="buyer-meta">
                  {buyer.gst && <span><strong>GSTIN</strong> {buyer.gst}</span>}
                  {buyer.email && <span>{buyer.email}</span>}
                  {(buyer.mobile || buyer.phone) && <span>{buyer.mobile || buyer.phone}</span>}
                </div>
                {company && <Link to={`/admin/companies/${company.id}/edit`} target="_blank" className="buyer-edit">Edit company</Link>}
              </div>
            )}

            <div className="field">
              <span>Payment terms <em className="optional">optional</em></span>
              <input
                className="input"
                value={form.paymentTerms}
                onChange={(e) => update({ paymentTerms: e.target.value })}
                placeholder="e.g. 30 days from invoice date"
              />
              <div className="chips">
                {PAYMENT_TERM_PRESETS.map((t) => (
                  <button
                    type="button"
                    key={t}
                    className={`chip${form.paymentTerms === t ? ' chip-active' : ''}`}
                    onClick={() => update({ paymentTerms: t })}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 3. Items */}
          <section className="panel">
            <h2 className="panel-title"><span className="step">3</span> Items</h2>
            <div className="line-items">
              {form.items.map((item, i) => {
                const productFound = products.some((p) => p.id === item.productId);
                return (
                  <div className="li-row" key={i}>
                    <span className="li-index">{i + 1}</span>
                    <div className="li-product">
                      <SearchSelect
                        aria-label="Item"
                        options={productOptions}
                        value={productFound ? item.productId : ''}
                        onChange={(v) => selectProduct(i, v)}
                        filterOption={filterProduct}
                        placeholder={item.description && !productFound ? item.description : 'Search product by name, code or HSN…'}
                      />
                    </div>
                    <button type="button" className="icon-btn icon-btn-danger li-remove" title="Remove item"
                      aria-label={`Remove item ${i + 1}`} onClick={() => removeItem(i)}>
                      <TrashIcon />
                    </button>
                    <div className="li-fields">
                      <label className="li-field">
                        <span>HSN</span>
                        <input className="input" aria-label="HSN Code" value={item.hsnCode || ''}
                          onChange={(e) => setItem(i, { hsnCode: e.target.value })} />
                      </label>
                      <label className="li-field">
                        <span>Qty</span>
                        <input type="number" min="0" step="any" className="input num" aria-label="Quantity"
                          value={item.qty} onChange={(e) => setItem(i, { qty: e.target.value })} />
                      </label>
                      <label className="li-field">
                        <span>Rate</span>
                        <input type="number" min="0" step="0.01" className="input num" aria-label="Rate"
                          value={item.rate} onChange={(e) => setItem(i, { rate: e.target.value })} />
                      </label>
                      <div className="li-field li-amount">
                        <span>Amount</span>
                        <strong aria-label="Amount">{formatMoney(lineAmount(item), form.currency)}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <FieldError message={errors.items} />
            <button type="button" className="add-row" onClick={addItem}><PlusIcon /> Add item</button>
            <div className="field-help">
              Product missing? <Link to="/admin/products/new" target="_blank">Add a new product</Link>.
            </div>
          </section>
        </div>

        {/* Summary */}
        <aside className="inv-side">
          <div className="panel summary">
            <h2 className="panel-title">Summary</h2>
            <label className="field">
              <span>Currency</span>
              <select className="input" value={form.currency} onChange={(e) => update({ currency: e.target.value })}>
                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} ({c.symbol.trim()})</option>)}
              </select>
            </label>
            <div className="field">
              <span>GST</span>
              <div className="segmented" role="radiogroup" aria-label="GST type">
                {TAX_TYPES.map((t) => (
                  <button
                    type="button"
                    key={t.value}
                    role="radio"
                    aria-checked={form.taxType === t.value}
                    className={form.taxType === t.value ? 'active' : ''}
                    onClick={() => { update({ taxType: t.value }); setTaxHint(''); }}
                    title={t.label}
                  >
                    {t.short}
                  </button>
                ))}
              </div>
              {taxHint && <div className="field-help">{taxHint}</div>}
            </div>
            <InvoiceTotals totals={totals} taxType={form.taxType} currency={form.currency} />
            <p className="in-words">{amountInWords(totals.grandTotal, form.currency)}</p>
            <button type="submit" className="btn btn-primary btn-block" disabled={saving}>{saveLabel}</button>
            <p className="kbd-hint"><kbd>Ctrl</kbd> + <kbd>S</kbd> to save</p>
          </div>
        </aside>
      </div>

      {/* Mobile: total + save always reachable */}
      <div className="mobile-savebar">
        <div>
          <div className="muted small">Grand total</div>
          <strong>{formatMoney(totals.grandTotal, form.currency)}</strong>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saveLabel}</button>
      </div>
    </form>
  );
}
