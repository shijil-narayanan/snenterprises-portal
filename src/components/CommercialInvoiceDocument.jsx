import { COMPANY } from '../config/company';
import { addressLines, amountInWordsPlain, formatAmount, formatDate } from '../utils/invoice';
import { commercialTotal, groupItemsByHsn } from '../utils/commercial';
import DocumentHeader from './DocumentHeader';

// Price as entered (no forced decimals), e.g. 215 or 2.75
const formatRate = (v, currency) => {
  const n = Number(v) || 0;
  return n.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', { maximumFractionDigits: 4 });
};

function Party({ company }) {
  if (!company?.name) return <span className="muted">—</span>;
  const contact = [company.email && `Email: ${company.email}`, (company.mobile || company.phone) && `Mob : ${company.mobile || company.phone}`]
    .filter(Boolean).join(' / ');
  return (
    <>
      <div className="ci-strong">{company.name}</div>
      <div>{addressLines(company.address).join(', ')}</div>
      {company.gst && <div>GSTIN: {company.gst}</div>}
      {contact && <div className="ci-small">{contact}</div>}
    </>
  );
}

/**
 * Printable commercial invoice (export). Used on the invoice page, for printing and PDFs.
 * fillPage stretches the item area to the bottom of the A4 page, like the paper form.
 */
export default function CommercialInvoiceDocument({ invoice, fillPage = false }) {
  const cur = invoice.currency || 'USD';
  const total = invoice.total ?? commercialTotal(invoice.items);
  const groups = groupItemsByHsn(invoice.items || []);
  const marks = invoice.marks || {};
  const bank = COMPANY.bankDetails;

  return (
    <article className={`paper ci-doc${fillPage ? ' ci-fill' : ''}`}>
      <DocumentHeader title="Commercial Invoice" showIec />

      {/* Parties */}
      <div className="ci-grid ci-parties">
        <div className="ci-th ci-left">Consignee / Importer</div>
        <div className="ci-th">Buyer (If not consignee)</div>
        <div className="ci-th">Purchase Order</div>
        <div className="ci-th">Invoice Details</div>
        <div className="ci-td ci-left"><Party company={invoice.consignee} /></div>
        <div className="ci-td">
          {invoice.buyerSameAsConsignee !== false ? <>Same as<br />Consignee</> : <div className="ci-left"><Party company={invoice.buyer} /></div>}
        </div>
        <div className="ci-td ci-left">
          <div>PO No. {invoice.poNumber || '—'}</div>
          <div>PO Date: {formatDate(invoice.poDate)}</div>
        </div>
        <div className="ci-td ci-right">
          <div>Date : {formatDate(invoice.invoiceDate)}</div>
          <div>Invoice No: {invoice.invoiceNumber}</div>
        </div>
      </div>

      {/* Shipping */}
      <div className="ci-grid ci-shipping">
        {['Origin', 'Destination', 'Vessel/Flight No', 'Origin Port', 'Port of Discharge', 'Destination Port'].map((h) => (
          <div className="ci-th" key={h}>{h}</div>
        ))}
        {[invoice.origin, invoice.destination, invoice.vesselFlight, invoice.originPort, invoice.portOfDischarge, invoice.destinationPort].map((v, i) => (
          <div className="ci-td" key={i}>{v || '—'}</div>
        ))}
      </div>

      {/* Items */}
      <div className="ci-items">
        <div className="ci-row ci-items-head">
          <div className="ci-th ci-left">Description</div>
          <div className="ci-th">Quantity</div>
          <div className="ci-th">Price {cur}</div>
          <div className="ci-th">Amount {cur}</div>
        </div>
        {groups.map((group) => (
          <div key={group.hsn || 'no-hsn'}>
            {group.hsn && (
              <div className="ci-row">
                <div className="ci-cell ci-left">HSN CODE: {group.hsn}</div>
                <div className="ci-cell" /><div className="ci-cell" /><div className="ci-cell" />
              </div>
            )}
            {group.items.map((it) => (
              <div className="ci-row ci-item" key={it.lineNo}>
                <div className="ci-cell ci-left ci-desc"><span className="ci-no">{it.lineNo}.</span><span>{it.description}</span></div>
                <div className="ci-cell">{it.qty} {it.unit}</div>
                <div className="ci-cell ci-num">{formatRate(it.rate, cur)}</div>
                <div className="ci-cell ci-num">{formatAmount(it.amount, cur)}</div>
              </div>
            ))}
          </div>
        ))}
        {/* Filler keeps the column lines running to the total; notes sit at its bottom */}
        <div className="ci-row ci-filler">
          <div className="ci-cell ci-left ci-notes">{invoice.notes}</div>
          <div className="ci-cell" /><div className="ci-cell" /><div className="ci-cell" />
        </div>
        <div className="ci-row ci-total">
          <div className="ci-cell ci-left">TOTAL {cur}: {amountInWordsPlain(total, cur)}.</div>
          <div className="ci-cell ci-num ci-strong">{formatAmount(total, cur)}</div>
        </div>
      </div>

      {/* Marks & Nos */}
      <div className="ci-grid ci-marks">
        <div className="ci-th ci-left ci-span4">
          Marks &amp; Nos{invoice.packages ? ` – ${invoice.packages} Package${Number(invoice.packages) === 1 ? '' : 's'}` : ''}
        </div>
        <div className="ci-td">{marks.name || '—'}</div>
        <div className="ci-td">{marks.numbers || '—'}</div>
        <div className="ci-td">{marks.port || '—'}</div>
        <div className="ci-td">{marks.origin || '—'}</div>
      </div>

      {/* Bank, terms, LUT, signature */}
      <div className="ci-foot">
        <div className="ci-foot-col">
          <div className="ci-th ci-left">Bank Details</div>
          <div className="ci-td ci-left">
            <div>Account Holder: {COMPANY.name}</div>
            <div>Account No: {bank.accountNumber}</div>
            <div>IFSC CODE: {bank.ifsc}</div>
            <div>SWIFT CODE: {bank.swiftCode}</div>
            <div>Name: {bank.bankName}, {bank.branch}</div>
          </div>
        </div>
        <div className="ci-foot-col">
          <div className="ci-th ci-left">Terms of Delivery &amp; Payment</div>
          <div className="ci-td ci-left">{invoice.deliveryTerms || '—'}</div>
          <div className="ci-th ci-left">LUT</div>
          <div className="ci-td ci-left">
            <div>Application Reference Number:</div>
            <div>{invoice.lut || '—'}</div>
          </div>
        </div>
        <div className="ci-sign">
          <div>For {COMPANY.name}</div>
          <div className="ci-strong">Authorised Signatory</div>
        </div>
      </div>
    </article>
  );
}
