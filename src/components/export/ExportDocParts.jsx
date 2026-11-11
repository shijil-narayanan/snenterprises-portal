import { useCompany } from '../../config/companySettings';
import { addressLines, formatDate } from '../../utils/invoice';

// Shared blocks of the export documents (commercial invoice and packing list),
// laid out like the paper forms.

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

/** Consignee / buyer / PO / invoice details, then the shipping row. */
export function ExportPartiesAndShipping({ doc: invoice }) {
  return (
    <>
      {/* Parties */}
      <div className="ci-grid ci-parties">
        <div className="ci-th ci-left">Consignee / Importer</div>
        <div className="ci-th">Buyer</div>
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
    </>
  );
}

/** Marks & Nos, then bank details, terms, LUT and signatory. */
export function ExportMarksAndFoot({ doc: invoice }) {
  const current = useCompany();
  // The seller details saved with the document; older documents use the current Settings
  const company = invoice.seller || current;
  const marks = invoice.marks || {};
  const bank = company.bankDetails || {};
  return (
    <>
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
            <div>Account Holder: {company.name}</div>
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
          <div>For {company.name}</div>
          <div className="ci-strong">Authorised Signatory</div>
        </div>
      </div>
    </>
  );
}
