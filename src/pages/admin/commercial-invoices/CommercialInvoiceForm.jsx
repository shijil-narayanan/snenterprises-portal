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
import { CURRENCIES, DELIVERY_TERMS_PRESETS, ORIGIN_PORTS, TRANSPORT_MODES, UNITS } from '../../../config/catalog';
import DateInput from '../../../components/DateInput';
import SearchSelect from '../../../components/SearchSelect';
import PdfPreviewModal from '../../../components/PdfPreviewModal';
import { ArrowLeftIcon, FileIcon, PlusIcon, TrashIcon } from '../../../components/Icons';
import useFormGuards from '../../../hooks/useFormGuards';
import { buildCommercialPdf } from '../../../utils/invoicePdf';
import { addressLines, amountInWordsPlain, formatAmount, lineAmount } from '../../../utils/invoice';
import {
  commercialTotal,
  emptyCommercialInvoice,
  emptyCommercialItem,
  shippingFromCompany,
  suggestCommercialNumber,
} from '../../../utils/commercial';

const snapshot = ({ id: _id, createdAt: _c, updatedAt: _u, ...rest }) => rest;
const packageNumbers = (n) => (Number(n) > 0 ? (Number(n) === 1 ? 'No. 1' : `No. 1 to ${Number(n)}`) : '');

function validate(form, usedNumbers) {
  const errors = {};
  const number = form.invoiceNumber.trim();
  if (!number) errors.invoiceNumber = 'Invoice number is required';
  else if (usedNumbers.has(number.toLowerCase())) errors.invoiceNumber = 'This invoice number is already used';
  if (!form.invoiceDate) errors.invoiceDate = 'Invoice date is required';
  if (!form.consigneeId) errors.consignee = 'Select the consignee / importer';
  if (!form.buyerSameAsConsignee && !form.buyerId) errors.buyer = 'Select the buyer, or tick “Same as consignee”';
  if (!form.items.some((it) => it.description.trim())) errors.items = 'Add at least one item';
  return errors;
}

const FieldError = ({ message }) => (message ? <div className="field-error">{message}</div> : null);

function Chips({ options, value, onPick }) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button type="button" key={o} className={`chip${value === o ? ' chip-active' : ''}`} onClick={() => onPick(o)}>{o}</button>
      ))}
    </div>
  );
}

function PartyCard({ company, editable }) {
  if (!company?.name) return null;
  const contact = [company.email, company.mobile || company.phone].filter(Boolean);
  return (
    <div className="buyer-card">
      <div className="buyer-name">{company.name}</div>
      <div className="buyer-lines">{addressLines(company.address).join(', ') || <span className="muted">No address on file</span>}</div>
      <div className="buyer-meta">
        {company.gst && <span><strong>GSTIN</strong> {company.gst}</span>}
        {contact.map((c) => <span key={c}>{c}</span>)}
      </div>
      {editable && company.id && <Link to={`/admin/companies/${company.id}/edit`} target="_blank" className="buyer-edit">Edit company</Link>}
    </div>
  );
}

export default function CommercialInvoiceForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const copyFromId = searchParams.get('from');
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const formRef = useRef(null);

  const [form, setForm] = useState(emptyCommercialInvoice);
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
  const setMarks = (changes) => setForm((f) => ({ ...f, marks: { ...f.marks, ...changes } }));

  const selectConsignee = (companyId) => {
    const company = companies.find((c) => c.id === companyId);
    setForm((f) => {
      const ship = shippingFromCompany(company);
      return {
        ...f,
        consigneeId: companyId,
        consignee: company ? snapshot(company) : null,
        // Fill shipping details from the company, keeping anything already typed
        destination: ship.destination || f.destination,
        portOfDischarge: ship.portOfDischarge || f.portOfDischarge,
        destinationPort: ship.destinationPort || f.destinationPort,
        marks: {
          ...f.marks,
          name: !f.marks.name || f.marks.name === f.consignee?.name ? company?.name || '' : f.marks.name,
          port: !f.marks.port || f.marks.port === f.destinationPort ? ship.destinationPort || f.marks.port : f.marks.port,
        },
      };
    });
  };

  const selectBuyer = (companyId) => {
    const company = companies.find((c) => c.id === companyId);
    update({ buyerId: companyId, buyer: company ? snapshot(company) : null });
  };

  const setPackages = (value) =>
    setForm((f) => ({
      ...f,
      packages: value,
      // Keep "No. 1 to N" in step, unless it was typed by hand
      marks: { ...f.marks, numbers: !f.marks.numbers || f.marks.numbers === packageNumbers(f.packages) ? packageNumbers(value) : f.marks.numbers },
    }));

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
  const consignee = companies.find((c) => c.id === form.consigneeId) || form.consignee;
  const buyer = companies.find((c) => c.id === form.buyerId) || form.buyer;
  const allErrors = validate(form, usedNumbers);
  const errors = submitted ? allErrors : allErrors.invoiceNumber?.includes('already') ? { invoiceNumber: allErrors.invoiceNumber } : {};

  const companyOptions = companies.map((c) => ({ value: c.id, label: c.name }));
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
      consignee: liveConsignee ? snapshot(liveConsignee) : form.consignee,
      buyer: form.buyerSameAsConsignee ? null : liveBuyer ? snapshot(liveBuyer) : form.buyer,
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
          {/* 1. Invoice & PO */}
          <section className="panel">
            <h2 className="panel-title"><span className="step">1</span> Invoice &amp; purchase order</h2>
            <div className="grid-2">
              <label className="field">
                <span>Invoice number</span>
                <input className={`input${errors.invoiceNumber ? ' input-invalid' : ''}`} value={form.invoiceNumber}
                  onChange={(e) => update({ invoiceNumber: e.target.value })} />
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

          {/* 2. Parties */}
          <section className="panel">
            <h2 className="panel-title"><span className="step">2</span> Consignee &amp; buyer</h2>
            <div className="field">
              <span>Consignee / importer</span>
              <SearchSelect aria-label="Consignee" options={companyOptions} value={companies.some((c) => c.id === form.consigneeId) ? form.consigneeId : ''}
                onChange={selectConsignee}
                placeholder={form.consignee?.name && !companies.some((c) => c.id === form.consigneeId) ? `${form.consignee.name} (no longer in list — select again)` : 'Search company by name…'} />
              <FieldError message={errors.consignee} />
              <div className="field-help">
                Not in the list? <Link to="/admin/companies/new" target="_blank">Add a new company</Link> — it appears here when you come back.
                Shipping details below are filled from the company.
              </div>
            </div>
            <PartyCard company={consignee} editable />

            <div className="field">
              <label className="check">
                <input type="checkbox" checked={form.buyerSameAsConsignee}
                  onChange={(e) => update({ buyerSameAsConsignee: e.target.checked, ...(e.target.checked ? { buyerId: '', buyer: null } : {}) })} />
                <span>Buyer is the same as the consignee</span>
              </label>
            </div>
            {!form.buyerSameAsConsignee && (
              <>
                <div className="field">
                  <span>Buyer</span>
                  <SearchSelect aria-label="Buyer" options={companyOptions} value={companies.some((c) => c.id === form.buyerId) ? form.buyerId : ''}
                    onChange={selectBuyer} placeholder="Search buyer company…" />
                  <FieldError message={errors.buyer} />
                </div>
                <PartyCard company={buyer} editable />
              </>
            )}
          </section>

          {/* 3. Shipping */}
          <section className="panel">
            <h2 className="panel-title"><span className="step">3</span> Shipping</h2>
            <div className="grid-3">
              <label className="field">
                <span>Origin</span>
                <input className="input" value={form.origin} onChange={(e) => update({ origin: e.target.value.toUpperCase() })} />
              </label>
              <label className="field">
                <span>Destination</span>
                <input className="input" value={form.destination} onChange={(e) => update({ destination: e.target.value.toUpperCase() })} placeholder="e.g. U.A.E." />
              </label>
              <div className="field">
                <span>Vessel / flight no.</span>
                <input className="input" aria-label="Vessel / flight no." value={form.vesselFlight} onChange={(e) => update({ vesselFlight: e.target.value.toUpperCase() })} />
                <Chips options={TRANSPORT_MODES} value={form.vesselFlight} onPick={(v) => update({ vesselFlight: v })} />
              </div>
              <div className="field">
                <span>Origin port</span>
                <input className="input" aria-label="Origin port" value={form.originPort} onChange={(e) => update({ originPort: e.target.value.toUpperCase() })} />
                <Chips options={ORIGIN_PORTS} value={form.originPort} onPick={(v) => update({ originPort: v })} />
              </div>
              <label className="field">
                <span>Port of discharge</span>
                <input className="input" value={form.portOfDischarge} onChange={(e) => update({ portOfDischarge: e.target.value.toUpperCase() })} placeholder="e.g. JEBEL ALI" />
              </label>
              <label className="field">
                <span>Destination port</span>
                <input className="input" value={form.destinationPort} onChange={(e) => update({ destinationPort: e.target.value.toUpperCase() })} />
              </label>
            </div>
          </section>

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

          {/* 5. Packing & marks */}
          <section className="panel">
            <h2 className="panel-title"><span className="step">5</span> Marks &amp; numbers</h2>
            <div className="grid-3">
              <label className="field">
                <span>No. of packages</span>
                <input type="number" min="0" className="input" value={form.packages} onChange={(e) => setPackages(e.target.value)} placeholder="e.g. 5" />
              </label>
            </div>
            <div className="grid-4 field-gap">
              <label className="field"><span>Marks</span><input className="input" value={form.marks.name} onChange={(e) => setMarks({ name: e.target.value.toUpperCase() })} /></label>
              <label className="field"><span>Numbers</span><input className="input" value={form.marks.numbers} onChange={(e) => setMarks({ numbers: e.target.value })} placeholder="No. 1 to 5" /></label>
              <label className="field"><span>Port</span><input className="input" value={form.marks.port} onChange={(e) => setMarks({ port: e.target.value.toUpperCase() })} /></label>
              <label className="field"><span>Origin</span><input className="input" value={form.marks.origin} onChange={(e) => setMarks({ origin: e.target.value.toUpperCase() })} /></label>
            </div>
            <div className="field-help field-gap">Filled in from the consignee and package count; change anything as needed.</div>
          </section>

          {/* 6. Terms */}
          <section className="panel">
            <h2 className="panel-title"><span className="step">6</span> Terms &amp; LUT</h2>
            <div className="field">
              <span>Terms of delivery &amp; payment <em className="optional">optional</em></span>
              <input className="input" aria-label="Terms of delivery & payment" value={form.deliveryTerms}
                onChange={(e) => update({ deliveryTerms: e.target.value })} placeholder="e.g. C&F & 100% Against Delivery" />
              <Chips options={DELIVERY_TERMS_PRESETS} value={form.deliveryTerms} onPick={(v) => update({ deliveryTerms: v })} />
            </div>
            <label className="field">
              <span>LUT application reference number</span>
              <input className="input" value={form.lut} onChange={(e) => update({ lut: e.target.value })} />
              <div className="field-help">Defaults to the current LUT; update it when the LUT is renewed.</div>
            </label>
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
