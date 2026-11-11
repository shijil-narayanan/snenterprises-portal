import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { createPackingList, getPackingList, listPackingLists, updatePackingList } from '../../../services/packingLists';
import { listCommercialInvoices } from '../../../services/commercialInvoices';
import { companiesService } from '../../../services/companies';
import { productsService } from '../../../services/products';
import { UNITS } from '../../../config/catalog';
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
import { buildPackingPdf } from '../../../utils/invoicePdf';
import { formatDate } from '../../../utils/invoice';
import { packageNumbers, suggestCommercialNumber } from '../../../utils/commercial';
import { AuditLine } from '../../../components/AuditInfo';
import {
  emptyPackingItem,
  emptyPackingList,
  emptyPackingRow,
  formatQty,
  formatWeight,
  packingListFromCommercial,
  packingTotals,
  rowTotals,
  withPackageRanges,
} from '../../../utils/packing';

const AUTO_NUMBERS = /^No\. 1( to \d+)?$/;

function validate(form, usedNumbers) {
  const errors = validateExportHeader(form, usedNumbers);
  if (errors.invoiceNumber?.includes('already')) errors.invoiceNumber = 'A packing list for this invoice number already exists';
  const items = form.items.filter((it) => it.description.trim());
  if (!items.length) errors.items = 'Add at least one item';
  else if (items.some((it) => !(it.packing || []).some((r) => Number(r.boxes) > 0))) errors.items = 'Enter the number of boxes for every item';
  else if (items.some((it) => it.packing.some((r) => Number(r.grossPerBox) < Number(r.netPerBox)))) {
    errors.items = 'Gross weight per box can’t be less than net weight per box';
  }
  return errors;
}

const ciLabel = (ci) => `${ci.invoiceNumber} — ${ci.consignee?.name || 'No consignee'} — ${formatDate(ci.invoiceDate)}`;

export default function PackingListForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const copyFromId = searchParams.get('from');
  const fromInvoiceId = searchParams.get('invoice');
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const formRef = useRef(null);

  const [form, setForm] = useState(emptyPackingList);

  const [meta, setMeta] = useState(null); // who created / last updated the record
  const [savedJson, setSavedJson] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [usedNumbers, setUsedNumbers] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [previewList, setPreviewList] = useState(null);
  // Set when the form was filled from a commercial invoice: shows the banner and jumps to the boxes
  const [prefilledFrom, setPrefilledFrom] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [lists, ciList, companyList, productList] = await Promise.all([
          listPackingLists(), listCommercialInvoices().catch(() => []), companiesService.list(), productsService.list(),
        ]);
        if (cancelled) return;
        setCompanies(companyList);
        setProducts(productList);
        setInvoices(ciList);
        setUsedNumbers(new Set(lists.filter((l) => l.id !== id).map((l) => (l.invoiceNumber || '').trim().toLowerCase())));
        let initial;
        if (isEdit) {
          const pl = lists.find((l) => l.id === id) || (await getPackingList(id));
          if (!pl) throw new Error('Packing list not found');
          setMeta(pl);
          const base = emptyPackingList();
          initial = { ...base, ...pl, marks: { ...base.marks, ...pl.marks }, items: pl.items?.length ? pl.items : [emptyPackingItem()] };
          ['id', 'createdAt', 'updatedAt', 'totals', 'packages'].forEach((k) => delete initial[k]);
          initial.items = initial.items.map(({ productId, description, hsnCode, unit, packing }) => ({ productId, description, hsnCode, unit, packing }));
        } else if (fromInvoiceId && ciList.find((c) => c.id === fromInvoiceId)) {
          const ci = ciList.find((c) => c.id === fromInvoiceId);
          initial = packingListFromCommercial(ci);
          setPrefilledFrom(ci);
        } else {
          initial = { ...emptyPackingList(), invoiceNumber: suggestCommercialNumber(ciList) };
          const src = copyFromId && lists.find((l) => l.id === copyFromId);
          if (src) {
            const keep = ['consigneeId', 'consignee', 'buyerSameAsConsignee', 'buyerId', 'buyer', 'origin', 'destination',
              'vesselFlight', 'originPort', 'portOfDischarge', 'destinationPort', 'notes', 'deliveryTerms', 'lut'];
            keep.forEach((k) => { if (src[k] !== undefined) initial[k] = src[k]; });
            initial.items = (src.items || []).map(({ productId, description, hsnCode, unit, packing }) => ({ productId, description, hsnCode, unit, packing }));
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
  }, [id, isEdit, copyFromId, fromInvoiceId]);

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

  // ---------- Items & packing rows ----------
  const setItem = (index, changes) =>
    setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === index ? { ...it, ...changes } : it)) }));
  const selectProduct = (index, productId) => {
    const p = products.find((x) => x.id === productId);
    setItem(index, { productId, description: p?.name || '', hsnCode: p?.hsnCode || '' });
  };
  const addItem = () => {
    const newIndex = form.items.length;
    setForm((f) => ({ ...f, items: [...f.items, { ...emptyPackingItem(), unit: f.items.at(-1)?.unit || 'Nos' }] }));
    requestAnimationFrame(() => document.querySelectorAll('.li-product input')[newIndex]?.focus());
  };
  const removeItem = (index) =>
    setForm((f) => ({ ...f, items: f.items.length > 1 ? f.items.filter((_, i) => i !== index) : [emptyPackingItem()] }));
  const setRow = (itemIndex, rowIndex, changes) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === itemIndex ? { ...it, packing: it.packing.map((r, j) => (j === rowIndex ? { ...r, ...changes } : r)) } : it)),
    }));
  const addRow = (itemIndex) =>
    setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === itemIndex ? { ...it, packing: [...it.packing, emptyPackingRow()] } : it)) }));
  const removeRow = (itemIndex, rowIndex) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === itemIndex
        ? { ...it, packing: it.packing.length > 1 ? it.packing.filter((_, j) => j !== rowIndex) : [emptyPackingRow()] }
        : it)),
    }));

  // ---------- Start from a commercial invoice ----------
  const startFromInvoice = (ciId) => {
    const ci = invoices.find((c) => c.id === ciId);
    if (!ci) return;
    if (isDirty && !window.confirm('Replace what you have entered with the details of this commercial invoice?')) return;
    setForm(packingListFromCommercial(ci));
    setSubmitted(false);
    setPrefilledFrom(ci);
  };

  // After prefilling, take the user straight to the first Boxes field
  useEffect(() => {
    if (!prefilledFrom || loading) return;
    requestAnimationFrame(() => {
      document.querySelector('#packing-items')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const boxes = document.querySelector('#packing-items [aria-label="Boxes"]');
      boxes?.focus({ preventScroll: true });
      boxes?.select();
    });
  }, [prefilledFrom, loading]);

  // ---------- Derived ----------
  const ranged = withPackageRanges(form.items);
  const totals = packingTotals(form.items);
  const effectiveNumbers = !form.marks.numbers || AUTO_NUMBERS.test(form.marks.numbers) ? packageNumbers(totals.boxes) : form.marks.numbers;
  const marksForm = { ...form, marks: { ...form.marks, numbers: effectiveNumbers } };
  const allErrors = validate(form, usedNumbers);
  const errors = submitted ? allErrors : allErrors.invoiceNumber?.includes('already') ? { invoiceNumber: allErrors.invoiceNumber } : {};
  const linkedInvoice = invoices.find((c) => c.id === form.commercialInvoiceId);

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

  const buildList = () => {
    const items = form.items.filter((it) => it.description.trim());
    const liveConsignee = companies.find((c) => c.id === form.consigneeId);
    const liveBuyer = companies.find((c) => c.id === form.buyerId);
    return {
      ...form,
      items,
      totals: packingTotals(items),
      packages: packingTotals(items).boxes,
      marks: { ...form.marks, numbers: effectiveNumbers },
      consignee: liveConsignee ? companySnapshot(liveConsignee) : form.consignee,
      buyer: form.buyerSameAsConsignee ? null : liveBuyer ? companySnapshot(liveBuyer) : form.buyer,
    };
  };

  const openPreview = () => { if (checkValid()) setPreviewList(buildList()); };
  const closePreview = useCallback(() => setPreviewList(null), []);

  const backTo = isEdit ? `/admin/packing-lists/${id}` : '/admin/packing-lists';
  const handleCancel = () => { if (!isDirty || window.confirm('Discard your unsaved changes?')) navigate(backTo); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError('');
    if (!checkValid()) return;
    setSaving(true);
    try {
      const data = buildList();
      const savedId = isEdit ? (await updatePackingList(id, data), id) : await createPackingList(data);
      setSavedJson(JSON.stringify(form));
      navigate(`/admin/packing-lists/${savedId}`, { state: { flash: isEdit ? 'Packing list updated' : 'Packing list created' } });
    } catch (err) {
      setSaveError(err.message);
      setSaving(false);
    }
  };

  if (loading) return <p className="muted">Loading…</p>;
  if (loadError) return <div className="alert alert-error">{loadError}</div>;

  const saveLabel = saving ? 'Saving…' : isEdit ? 'Update Packing List' : 'Save Packing List';
  const ciOptions = invoices.map((ci) => ({ value: ci.id, label: ciLabel(ci) }));
  const step = (n) => (isEdit || prefilledFrom ? n : n + 1);

  return (
    <form ref={formRef} className="inv-form" onSubmit={handleSubmit} noValidate>
      <div className="page-head">
        <div>
          <Link to="/admin/packing-lists" className="crumb"><ArrowLeftIcon size={14} /> Packing Lists</Link>
          <h1>
            {isEdit ? `Edit packing list ${form.invoiceNumber}` : 'New Packing List'}
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
      {prefilledFrom && !isEdit && (
        <div className="alert alert-success prefill-banner">
          <strong>Prefilled from commercial invoice {prefilledFrom.invoiceNumber}.</strong>{' '}
          Consignee, PO, shipping, items, marks, terms and notes are copied — just add the boxes and weights for each item below.
          <a href="#packing-items" className="prefill-jump">Go to box details ↓</a>
        </div>
      )}

      <div className="inv-layout">
        <div className="inv-main">
          {!isEdit && !prefilledFrom && (
            <section className="panel panel-accent">
              <h2 className="panel-title"><span className="step">1</span> Start from a commercial invoice <em className="optional">optional</em></h2>
              <div className="field">
                <SearchSelect aria-label="Commercial invoice" options={ciOptions} value={form.commercialInvoiceId}
                  onChange={startFromInvoice} isClearable={false}
                  placeholder={invoices.length ? 'Search by invoice number or consignee…' : 'No commercial invoices yet'} />
                <div className="field-help">
                  Copies the consignee, PO, shipping, items, marks, terms and notes. Then just enter boxes and weights.
                </div>
              </div>
            </section>
          )}

          <InvoiceDetailsSection step={step(1)} form={form} setForm={setForm} errors={errors}
            numberHelp={linkedInvoice ? <>Linked to commercial invoice <Link to={`/admin/commercial-invoices/${linkedInvoice.id}`} target="_blank">{linkedInvoice.invoiceNumber}</Link></> : 'The commercial invoice number this packing list belongs to.'} />
          <PartiesSection step={step(2)} form={form} setForm={setForm} errors={errors} companies={companies} />
          <ShippingSection step={step(3)} form={form} setForm={setForm} />

          {/* Items & packing */}
          <section className={`panel${prefilledFrom ? ' panel-highlight' : ''}`} id="packing-items">
            <h2 className="panel-title"><span className="step">{step(4)}</span> Items &amp; packing</h2>
            <datalist id="unit-options">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
            <div className="pl-form-items">
              {form.items.map((item, i) => {
                const productFound = products.some((p) => p.id === item.productId);
                const info = ranged[i];
                return (
                  <div className="pl-form-item" key={i}>
                    <div className="li-row pl-item-top">
                      <span className="li-index">{i + 1}</span>
                      <div className="li-product">
                        <SearchSelect aria-label="Item" options={productOptions} value={productFound ? item.productId : ''}
                          onChange={(v) => selectProduct(i, v)} filterOption={filterProduct}
                          placeholder={item.description && !productFound ? item.description : 'Search product by name, code or HSN…'} />
                      </div>
                      <button type="button" className="icon-btn icon-btn-danger li-remove" title="Remove item"
                        aria-label={`Remove item ${i + 1}`} onClick={() => removeItem(i)}><TrashIcon /></button>
                      <div className="li-fields pl-item-fields">
                        <label className="li-field"><span>HSN</span>
                          <input className="input" aria-label="HSN Code" value={item.hsnCode || ''} onChange={(e) => setItem(i, { hsnCode: e.target.value })} />
                        </label>
                        <label className="li-field"><span>Unit</span>
                          <input className="input" aria-label="Unit" list="unit-options" value={item.unit || ''} onChange={(e) => setItem(i, { unit: e.target.value })} />
                        </label>
                        <div className="li-field pl-item-summary">
                          <span>Packages · pieces · net / gross</span>
                          <strong aria-label="Item summary">
                            {info.packages || '—'} · {formatQty(info.totals.pieces)} {item.unit} · {formatWeight(info.totals.net)} / {formatWeight(info.totals.gross)} kg
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="pl-pack-wrap">
                      <table className="pl-pack-table">
                        <thead>
                          <tr>
                            <th>Boxes</th><th>Pieces / box</th><th>NT. WT / box (kg)</th><th>GR. WT / box (kg)</th>
                            <th className="num">Total NT (kg)</th><th className="num">Total GR (kg)</th><th />
                          </tr>
                        </thead>
                        <tbody>
                          {item.packing.map((r, j) => {
                            const t = rowTotals(r);
                            return (
                              <tr key={j}>
                                <td><input type="number" min="0" step="1" className="input num" aria-label="Boxes" value={r.boxes} onChange={(e) => setRow(i, j, { boxes: e.target.value })} /></td>
                                <td><input type="number" min="0" step="any" className="input num" aria-label="Pieces per box" value={r.piecesPerBox} onChange={(e) => setRow(i, j, { piecesPerBox: e.target.value })} /></td>
                                <td><input type="number" min="0" step="0.001" className="input num" aria-label="Net weight per box" value={r.netPerBox} onChange={(e) => setRow(i, j, { netPerBox: e.target.value })} /></td>
                                <td><input type="number" min="0" step="0.001" className="input num" aria-label="Gross weight per box" value={r.grossPerBox} onChange={(e) => setRow(i, j, { grossPerBox: e.target.value })} /></td>
                                <td className="num">{formatWeight(t.net)}</td>
                                <td className="num">{formatWeight(t.gross)}</td>
                                <td>
                                  <button type="button" className="icon-btn icon-btn-danger" title="Remove packing row"
                                    aria-label={`Remove packing row ${j + 1}`} onClick={() => removeRow(i, j)}><TrashIcon size={14} /></button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <button type="button" className="link-btn" onClick={() => addRow(i)}><PlusIcon size={14} /> Add packing row</button>
                    <span className="field-help pl-row-hint"> — use another row when boxes hold different quantities or weights</span>
                  </div>
                );
              })}
            </div>
            <FieldError message={errors.items} />
            <button type="button" className="add-row" onClick={addItem}><PlusIcon /> Add item</button>
            <label className="field field-gap">
              <span>Notes <em className="optional">optional</em></span>
              <textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Printed at the bottom of the description column, under the packing details" />
            </label>
          </section>

          <MarksSection step={step(5)} form={marksForm} setForm={setForm} autoPackages={totals.boxes} />
          <TermsSection step={step(6)} form={form} setForm={setForm} />
        </div>

        <aside className="inv-side">
          <div className="panel summary">
            <h2 className="panel-title">Summary</h2>
            <div className="totals">
              <div className="totals-row"><span>Packages (boxes)</span><span>{totals.boxes || '—'}</span></div>
              <div className="totals-row"><span>Net weight</span><span>{formatWeight(totals.net)} kg</span></div>
              <div className="totals-row grand"><span>Gross weight</span><span>{formatWeight(totals.gross)} kg</span></div>
            </div>
            {linkedInvoice && (
              <p className="field-help usage">From commercial invoice <Link to={`/admin/commercial-invoices/${linkedInvoice.id}`} target="_blank">{linkedInvoice.invoiceNumber}</Link>.</p>
            )}
            <button type="submit" className="btn btn-primary btn-block" disabled={saving}>{saveLabel}</button>
            <button type="button" className="btn btn-block btn-secondary-block" onClick={openPreview}><FileIcon /> Preview PDF</button>
            <p className="kbd-hint"><kbd>Ctrl</kbd> + <kbd>S</kbd> to save</p>
          </div>
        </aside>
      </div>

      <div className="mobile-savebar">
        <div>
          <div className="muted small">{totals.boxes || 0} boxes · gross</div>
          <strong>{formatWeight(totals.gross)} kg</strong>
        </div>
        <div className="mobile-savebar-actions">
          <button type="button" className="icon-btn" onClick={openPreview} title="Preview PDF" aria-label="Preview PDF"><FileIcon /></button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saveLabel}</button>
        </div>
      </div>

      {previewList && <PdfPreviewModal invoice={previewList} onClose={closePreview} build={buildPackingPdf} />}
    </form>
  );
}
