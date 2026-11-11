import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  createCommercialInvoice,
  getCommercialInvoice,
  listCommercialInvoices,
  updateCommercialInvoice,
} from '../../../services/commercialInvoices';
import { companiesService } from '../../../services/companies';
import { productsService } from '../../../services/products';
import { CURRENCIES, UNITS } from '../../../config/catalog';
import SearchSelect from '../../../components/SearchSelect';
import PdfPreviewModal from '../../../components/PdfPreviewModal';
import { ArrowLeftIcon, FileIcon, PlusIcon, TrashIcon } from '../../../components/Icons';
import useFormGuards from '../../../hooks/useFormGuards';
import {
  FieldError,
  InvoiceDetailsSection,
  MarksSection,
  PartiesSection,
  ShippingSection,
  TermsSection,
} from '../../../components/export/ExportFormSections';
import { companySnapshot, validateExportHeader } from '../../../utils/exportForm';
import { buildCommercialPdf } from '../../../utils/invoicePdf';
import { amountInWordsPlain, formatAmount, lineAmount } from '../../../utils/invoice';
import { AuditLine } from '../../../components/AuditInfo';
import {
  commercialTotal,
  emptyCommercialInvoice,
  emptyCommercialItem,
  suggestCommercialNumber,
} from '../../../utils/commercial';

function validate(form, usedNumbers) {
  const errors = validateExportHeader(form, usedNumbers);
  if (!form.items.some((it) => it.description.trim())) errors.items = 'Add at least one item';
  return errors;
}

export default function CommercialInvoiceForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const copyFromId = searchParams.get('from');
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const formRef = useRef(null);

  const [form, setForm] = useState(emptyCommercialInvoice);

  const [meta, setMeta] = useState(null); // who created / last updated the record
  const [savedJson, setSavedJson] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);
  const [usedNumbers, setUsedNumbers] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [previewInvoice, setPreviewInvoice] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [all, companyList, productList] = await Promise.all([
          listCommercialInvoices(), companiesService.list(), productsService.list(),
        ]);
        if (cancelled) return;
        setCompanies(companyList);
        setProducts(productList);
        setUsedNumbers(new Set(all.filter((i) => i.id !== id).map((i) => (i.invoiceNumber || '').trim().toLowerCase())));
        let initial;
        if (isEdit) {
          const inv = all.find((i) => i.id === id) || (await getCommercialInvoice(id));
          if (!inv) throw new Error('Commercial invoice not found');
          setMeta(inv);
          const base = emptyCommercialInvoice();
          initial = { ...base, ...inv, marks: { ...base.marks, ...inv.marks }, items: inv.items?.length ? inv.items : [emptyCommercialItem()] };
          delete initial.id; delete initial.createdAt; delete initial.updatedAt; delete initial.total;
        } else {
          initial = { ...emptyCommercialInvoice(), invoiceNumber: suggestCommercialNumber(all) };
          const src = copyFromId && all.find((i) => i.id === copyFromId);
          if (src) {
            const keep = ['consigneeId', 'consignee', 'buyerSameAsConsignee', 'buyerId', 'buyer', 'origin', 'destination',
              'vesselFlight', 'originPort', 'portOfDischarge', 'destinationPort', 'currency', 'notes', 'deliveryTerms', 'lut'];
            keep.forEach((k) => { if (src[k] !== undefined) initial[k] = src[k]; });
            initial.items = (src.items || []).map(({ productId, description, hsnCode, qty, unit, rate }) => ({ productId, description, hsnCode, qty, unit, rate }));
            initial.marks = { ...initial.marks, name: src.marks?.name || '', port: src.marks?.port || '', origin: src.marks?.origin || 'MADE IN INDIA' };
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
    return () => { cancelled = true; };
  }, [id, isEdit, copyFromId]);

  // Refresh companies/products when coming back from another tab
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

  const isDirty = savedJson !== null && JSON.stringify(form) !== savedJson;
  useFormGuards({ isDirty, saving, formRef });

  const update = (changes) => setForm((f) => ({ ...f, ...changes }));

  const setItem = (index, changes) =>
    setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === index ? { ...it, ...changes } : it)) }));
  const selectProduct = (index, productId) => {
    const p = products.find((x) => x.id === productId);
    setItem(index, { productId, description: p?.name || '', hsnCode: p?.hsnCode || '' });
  };
  const addItem = () => {
    const newIndex = form.items.length;
    setForm((f) => ({ ...f, items: [...f.items, { ...emptyCommercialItem(), unit: f.items.at(-1)?.unit || 'Nos' }] }));
    requestAnimationFrame(() => document.querySelectorAll('.li-product input')[newIndex]?.focus());
  };
  const removeItem = (index) =>
    setForm((f) => ({ ...f, items: f.items.length > 1 ? f.items.filter((_, i) => i !== index) : [emptyCommercialItem()] }));

  const total = commercialTotal(form.items);
  const allErrors = validate(form, usedNumbers);
  const errors = submitted ? allErrors : allErrors.invoiceNumber?.includes('already') ? { invoiceNumber: allErrors.invoiceNumber } : {};

  const productOptions = products.map((p) => ({
    value: p.id, label: p.name, searchText: [p.code, p.name, p.hsnCode].filter(Boolean).join(' ').toLowerCase(),
  }));
  const filterProduct = (opt, input) => opt.data.searchText.includes(input.toLowerCase());

  const checkValid = () => {
    setSubmitted(true);
    if (!Object.keys(allErrors).length) return true;
    requestAnimationFrame(() =>
      document.querySelector('.field-error')?.closest('.field, .panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    );
    return false;
  };

  // The invoice as it will be saved (rows without a product are dropped; snapshots refreshed)
  const buildInvoice = () => {
    const items = form.items.filter((it) => it.description.trim()).map((it) => ({ ...it, amount: lineAmount(it) }));
    const liveConsignee = companies.find((c) => c.id === form.consigneeId);
    const liveBuyer = companies.find((c) => c.id === form.buyerId);
    return {
      ...form,
      items,
      total: commercialTotal(items),
      consignee: liveConsignee ? companySnapshot(liveConsignee) : form.consignee,
      buyer: form.buyerSameAsConsignee ? null : liveBuyer ? companySnapshot(liveBuyer) : form.buyer,
    };
  };

  const openPreview = () => { if (checkValid()) setPreviewInvoice(buildInvoice()); };
  const closePreview = useCallback(() => setPreviewInvoice(null), []);

  const backTo = isEdit ? `/admin/commercial-invoices/${id}` : '/admin/commercial-invoices';
  const handleCancel = () => { if (!isDirty || window.confirm('Discard your unsaved changes?')) navigate(backTo); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError('');
    if (!checkValid()) return;
    setSaving(true);
    try {
      const data = buildInvoice();
      const savedId = isEdit ? (await updateCommercialInvoice(id, data), id) : await createCommercialInvoice(data);
      setSavedJson(JSON.stringify(form));
      navigate(`/admin/commercial-invoices/${savedId}`, { state: { flash: isEdit ? 'Commercial invoice updated' : 'Commercial invoice created' } });
    } catch (err) {
      setSaveError(err.message);
      setSaving(false);
    }
  };

  if (loading) return <p className="muted">Loading…</p>;
  if (loadError) return <div className="alert alert-error">{loadError}</div>;

  const saveLabel = saving ? 'Saving…' : isEdit ? 'Update Invoice' : 'Save Invoice';
  const curCode = form.currency;

  return (
    <form ref={formRef} className="inv-form" onSubmit={handleSubmit} noValidate>
      <div className="page-head">
        <div>
          <Link to="/admin/commercial-invoices" className="crumb"><ArrowLeftIcon size={14} /> Commercial Invoices</Link>
          <h1>
            {isEdit ? `Edit ${form.invoiceNumber || 'Commercial Invoice'}` : copyFromId ? 'New Commercial Invoice (copy)' : 'New Commercial Invoice'}
            {isDirty && <span className="badge">Unsaved</span>}
          </h1>
          {isEdit && <AuditLine record={meta} />}
        </div>
        <div className="page-head-actions">
          <button type="button" className="btn" onClick={handleCancel}>Cancel</button>
          <button type="button" className="btn" onClick={openPreview}><FileIcon /> Preview PDF</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saveLabel}</button>
        </div>
      </div>

      {saveError && <div className="alert alert-error">Could not save: {saveError}</div>}

      <div className="inv-layout">
        <div className="inv-main">
          <InvoiceDetailsSection step={1} form={form} setForm={setForm} errors={errors} />
          <PartiesSection step={2} form={form} setForm={setForm} errors={errors} companies={companies} />
          <ShippingSection step={3} form={form} setForm={setForm} />

          {/* 4. Items */}
          <section className="panel">
            <h2 className="panel-title"><span className="step">4</span> Items</h2>
            <datalist id="unit-options">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
            <div className="line-items">
              {form.items.map((item, i) => {
                const productFound = products.some((p) => p.id === item.productId);
                return (
                  <div className="li-row" key={i}>
                    <span className="li-index">{i + 1}</span>
                    <div className="li-product">
                      <SearchSelect aria-label="Item" options={productOptions} value={productFound ? item.productId : ''}
                        onChange={(v) => selectProduct(i, v)} filterOption={filterProduct}
                        placeholder={item.description && !productFound ? item.description : 'Search product by name, code or HSN…'} />
                    </div>
                    <button type="button" className="icon-btn icon-btn-danger li-remove" title="Remove item"
                      aria-label={`Remove item ${i + 1}`} onClick={() => removeItem(i)}><TrashIcon /></button>
                    <div className="li-fields li-fields-5">
                      <label className="li-field">
                        <span>HSN</span>
                        <input className="input" aria-label="HSN Code" value={item.hsnCode || ''} onChange={(e) => setItem(i, { hsnCode: e.target.value })} />
                      </label>
                      <label className="li-field">
                        <span>Qty</span>
                        <input type="number" min="0" step="any" className="input num" aria-label="Quantity" value={item.qty}
                          onChange={(e) => setItem(i, { qty: e.target.value })} />
                      </label>
                      <label className="li-field">
                        <span>Unit</span>
                        <input className="input" aria-label="Unit" list="unit-options" value={item.unit || ''} onChange={(e) => setItem(i, { unit: e.target.value })} />
                      </label>
                      <label className="li-field">
                        <span>Price ({curCode})</span>
                        <input type="number" min="0" step="0.01" className="input num" aria-label="Rate" value={item.rate}
                          onChange={(e) => setItem(i, { rate: e.target.value })} />
                      </label>
                      <div className="li-field li-amount">
                        <span>Amount</span>
                        <strong aria-label="Amount">{formatAmount(lineAmount(item), curCode)}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <FieldError message={errors.items} />
            <button type="button" className="add-row" onClick={addItem}><PlusIcon /> Add item</button>
            <label className="field field-gap">
              <span>Notes <em className="optional">optional</em></span>
              <textarea className="input" rows={3} value={form.notes} onChange={(e) => update({ notes: e.target.value })}
                placeholder="Printed at the bottom of the description column, after the items" />
            </label>
          </section>

          <MarksSection step={5} form={form} setForm={setForm} />
          <TermsSection step={6} form={form} setForm={setForm} />
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
            <div className="totals">
              <div className="totals-row"><span>Items</span><span>{form.items.filter((it) => it.description).length}</span></div>
              <div className="totals-row grand"><span>Total {curCode}</span><span>{formatAmount(total, curCode)}</span></div>
            </div>
            <p className="in-words">{amountInWordsPlain(total, curCode)}</p>
            <p className="field-help">Export under LUT — no GST is charged.</p>
            <button type="submit" className="btn btn-primary btn-block" disabled={saving}>{saveLabel}</button>
            <button type="button" className="btn btn-block btn-secondary-block" onClick={openPreview}><FileIcon /> Preview PDF</button>
            <p className="kbd-hint"><kbd>Ctrl</kbd> + <kbd>S</kbd> to save</p>
          </div>
        </aside>
      </div>

      <div className="mobile-savebar">
        <div>
          <div className="muted small">Total {curCode}</div>
          <strong>{formatAmount(total, curCode)}</strong>
        </div>
        <div className="mobile-savebar-actions">
          <button type="button" className="icon-btn" onClick={openPreview} title="Preview PDF" aria-label="Preview PDF"><FileIcon /></button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saveLabel}</button>
        </div>
      </div>

      {previewInvoice && <PdfPreviewModal invoice={previewInvoice} onClose={closePreview} build={buildCommercialPdf} />}
    </form>
  );
}
