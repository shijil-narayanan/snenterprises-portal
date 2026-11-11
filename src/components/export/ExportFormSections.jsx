import { Link } from 'react-router-dom';
import { DELIVERY_TERMS_PRESETS, ORIGIN_PORTS, TRANSPORT_MODES } from '../../config/catalog';
import { addressLines } from '../../utils/invoice';
import { packageNumbers, shippingFromCompany } from '../../utils/commercial';
import { companySnapshot } from '../../utils/exportForm';
import DateInput from '../DateInput';
import SearchSelect from '../SearchSelect';

// Form sections shared by the commercial invoice and packing list forms.
// Each takes the form state and a setForm(updater) function.

export const FieldError = ({ message }) => (message ? <div className="field-error">{message}</div> : null);

export function Chips({ options, value, onPick }) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button type="button" key={o} className={`chip${value === o ? ' chip-active' : ''}`} onClick={() => onPick(o)}>{o}</button>
      ))}
    </div>
  );
}

function PartyCard({ company }) {
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
      {company.id && <Link to={`/admin/companies/${company.id}/edit`} target="_blank" className="buyer-edit">Edit company</Link>}
    </div>
  );
}

export function InvoiceDetailsSection({ step, form, setForm, errors, numberLabel = 'Invoice number', numberHelp }) {
  const update = (changes) => setForm((f) => ({ ...f, ...changes }));
  return (
    <section className="panel">
      <h2 className="panel-title"><span className="step">{step}</span> Invoice &amp; purchase order</h2>
      <div className="grid-2">
        <label className="field">
          <span>{numberLabel}</span>
          <input className={`input${errors.invoiceNumber ? ' input-invalid' : ''}`} value={form.invoiceNumber}
            onChange={(e) => update({ invoiceNumber: e.target.value })} />
          <FieldError message={errors.invoiceNumber} />
          {numberHelp && !errors.invoiceNumber && <div className="field-help">{numberHelp}</div>}
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
  );
}

export function PartiesSection({ step, form, setForm, errors, companies }) {
  const companyOptions = companies.map((c) => ({ value: c.id, label: c.name }));
  const inList = (id) => companies.some((c) => c.id === id);
  const consignee = companies.find((c) => c.id === form.consigneeId) || form.consignee;
  const buyer = companies.find((c) => c.id === form.buyerId) || form.buyer;

  const selectConsignee = (companyId) => {
    const company = companies.find((c) => c.id === companyId);
    setForm((f) => {
      const ship = shippingFromCompany(company);
      return {
        ...f,
        consigneeId: companyId,
        consignee: company ? companySnapshot(company) : null,
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
    setForm((f) => ({ ...f, buyerId: companyId, buyer: company ? companySnapshot(company) : null }));
  };

  return (
    <section className="panel">
      <h2 className="panel-title"><span className="step">{step}</span> Consignee &amp; buyer</h2>
      <div className="field">
        <span>Consignee / importer</span>
        <SearchSelect aria-label="Consignee" options={companyOptions} value={inList(form.consigneeId) ? form.consigneeId : ''}
          onChange={selectConsignee}
          placeholder={form.consignee?.name && !inList(form.consigneeId) ? `${form.consignee.name} (no longer in list — select again)` : 'Search company by name…'} />
        <FieldError message={errors.consignee} />
        <div className="field-help">
          Not in the list? <Link to="/admin/companies/new" target="_blank">Add a new company</Link> — it appears here when you come back.
          Shipping details below are filled from the company.
        </div>
      </div>
      <PartyCard company={consignee} />

      <div className="field">
        <label className="check">
          <input type="checkbox" checked={form.buyerSameAsConsignee}
            onChange={(e) => setForm((f) => ({ ...f, buyerSameAsConsignee: e.target.checked, ...(e.target.checked ? { buyerId: '', buyer: null } : {}) }))} />
          <span>Buyer is the same as the consignee</span>
        </label>
      </div>
      {!form.buyerSameAsConsignee && (
        <>
          <div className="field">
            <span>Buyer</span>
            <SearchSelect aria-label="Buyer" options={companyOptions} value={inList(form.buyerId) ? form.buyerId : ''}
              onChange={selectBuyer} placeholder="Search buyer company…" />
            <FieldError message={errors.buyer} />
          </div>
          <PartyCard company={buyer} />
        </>
      )}
    </section>
  );
}

export function ShippingSection({ step, form, setForm }) {
  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value.toUpperCase() }));
  const pick = (name) => (v) => setForm((f) => ({ ...f, [name]: v }));
  return (
    <section className="panel">
      <h2 className="panel-title"><span className="step">{step}</span> Shipping</h2>
      <div className="grid-3">
        <label className="field"><span>Origin</span><input className="input" value={form.origin} onChange={set('origin')} /></label>
        <label className="field"><span>Destination</span><input className="input" value={form.destination} onChange={set('destination')} placeholder="e.g. U.A.E." /></label>
        <div className="field">
          <span>Vessel / flight no.</span>
          <input className="input" aria-label="Vessel / flight no." value={form.vesselFlight} onChange={set('vesselFlight')} />
          <Chips options={TRANSPORT_MODES} value={form.vesselFlight} onPick={pick('vesselFlight')} />
        </div>
        <div className="field">
          <span>Origin port</span>
          <input className="input" aria-label="Origin port" value={form.originPort} onChange={set('originPort')} />
          <Chips options={ORIGIN_PORTS} value={form.originPort} onPick={pick('originPort')} />
        </div>
        <label className="field"><span>Port of discharge</span><input className="input" value={form.portOfDischarge} onChange={set('portOfDischarge')} placeholder="e.g. JEBEL ALI" /></label>
        <label className="field"><span>Destination port</span><input className="input" value={form.destinationPort} onChange={set('destinationPort')} /></label>
      </div>
    </section>
  );
}

/**
 * Marks & numbers. With autoPackages (packing list) the package count comes from the
 * boxes entered and can't be typed; otherwise it is a normal field.
 */
export function MarksSection({ step, form, setForm, autoPackages }) {
  const setMarks = (changes) => setForm((f) => ({ ...f, marks: { ...f.marks, ...changes } }));
  const setPackages = (value) =>
    setForm((f) => ({
      ...f,
      packages: value,
      // Keep "No. 1 to N" in step, unless it was typed by hand
      marks: { ...f.marks, numbers: !f.marks.numbers || f.marks.numbers === packageNumbers(f.packages) ? packageNumbers(value) : f.marks.numbers },
    }));
  return (
    <section className="panel">
      <h2 className="panel-title"><span className="step">{step}</span> Marks &amp; numbers</h2>
      <div className="grid-3">
        <label className="field">
          <span>No. of packages</span>
          {autoPackages !== undefined ? (
            <>
              <input className="input" value={autoPackages || ''} readOnly placeholder="From the boxes entered" />
              <div className="field-help">Total boxes from the items above.</div>
            </>
          ) : (
            <input type="number" min="0" className="input" value={form.packages} onChange={(e) => setPackages(e.target.value)} placeholder="e.g. 5" />
          )}
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
  );
}

export function TermsSection({ step, form, setForm }) {
  const update = (changes) => setForm((f) => ({ ...f, ...changes }));
  return (
    <section className="panel">
      <h2 className="panel-title"><span className="step">{step}</span> Terms &amp; LUT</h2>
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
  );
}
