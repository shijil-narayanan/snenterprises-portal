import { useCompany } from '../config/companySettings';
import { TAX_TYPES } from '../config/catalog';
import { addressLines, amountInWords, computeTotals, formatDate, formatMoney } from '../utils/invoice';
import InvoiceTotals from '../pages/admin/tax-invoices/InvoiceTotals';
import DocumentHeader from './DocumentHeader';

/** The printable tax invoice. Used on the invoice page, for printing and for PDF downloads. */
export default function InvoiceDocument({ invoice, fillPage = false }) {
  const totals = invoice.totals || computeTotals(invoice.items, invoice.taxType);
  const buyer = invoice.buyer || {};
  const buyerContact = [buyer.email, buyer.mobile || buyer.phone].filter(Boolean).join(' · ');
  const current = useCompany();
  // The seller details saved with the invoice; older invoices use the current Settings
  const company = invoice.seller || current;
  const bank = company.bankDetails || {};
  const taxLabel = TAX_TYPES.find((t) => t.value === invoice.taxType)?.short;

  return (
    <article className={`paper tax-doc doc-a4${fillPage ? ' ci-fill' : ''}`}>
      <DocumentHeader title="Tax Invoice" company={company} />

      <div className="paper-boxes">
        <div className="paper-box">
          <div className="paper-label">Bill to</div>
          <div className="paper-strong">{buyer.name || invoice.poCompany || '—'}</div>
          {addressLines(buyer.address).map((l) => <div key={l}>{l}</div>)}
          {buyer.gst && <div><strong>GSTIN:</strong> {buyer.gst}</div>}
          {buyerContact && <div>{buyerContact}</div>}
        </div>
        <div className="paper-box">
          <dl className="paper-dl">
            <dt>Invoice No.</dt><dd className="paper-strong">{invoice.invoiceNumber}</dd>
            <dt>Invoice Date</dt><dd>{formatDate(invoice.invoiceDate)}</dd>
            <dt>PO No.</dt><dd>{invoice.poNumber || '—'}</dd>
            <dt>PO Date</dt><dd>{formatDate(invoice.poDate)}</dd>
            <dt>Payment Terms</dt><dd>{invoice.paymentTerms || '—'}</dd>
            <dt>Currency</dt><dd>{invoice.currency}{taxLabel ? ` · ${taxLabel}` : ''}</dd>
          </dl>
        </div>
      </div>

      {/* Items grow to fill the page so the totals and signature sit at the bottom */}
      <div className="paper-items">
        <table className="paper-table">
          <colgroup>
            <col className="col-sr" /><col /><col className="col-hsn" /><col className="col-qty" /><col className="col-rate" /><col className="col-amount" />
          </colgroup>
          <thead>
            <tr>
              <th className="col-sr">Sr.</th>
              <th>Description of Goods</th>
              <th>HSN</th>
              <th className="num">Qty</th>
              <th className="num">Rate</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it, i) => (
              <tr key={i}>
                <td className="col-sr">{i + 1}</td>
                <td>{it.description}</td>
                <td>{it.hsnCode || '—'}</td>
                <td className="num">{it.qty}</td>
                <td className="num">{formatMoney(it.rate, invoice.currency)}</td>
                <td className="num">{formatMoney(it.amount, invoice.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="paper-filler" aria-hidden="true"><span /><span /><span /><span /><span /><span /></div>
      </div>

      <div className="paper-bottom">
        <div className="paper-left">
          <div className="paper-label">Amount in words</div>
          <div className="paper-strong">{amountInWords(totals.grandTotal, invoice.currency)}</div>

          <div className="paper-label paper-gap">Bank details</div>
          <dl className="paper-dl compact">
            <dt>Bank</dt><dd>{bank.bankName}</dd>
            <dt>A/c No.</dt><dd>{bank.accountNumber}</dd>
            <dt>IFSC</dt><dd>{bank.ifsc}</dd>
            <dt>Branch</dt><dd>{bank.branch}</dd>
          </dl>
        </div>
        <div className="paper-right">
          <InvoiceTotals totals={totals} taxType={invoice.taxType} currency={invoice.currency} />
        </div>
      </div>

      <footer className="paper-foot">
        <div className="paper-note">This is a computer-generated invoice.</div>
        <div className="paper-sign">
          <div>For <strong>{company.name}</strong></div>
          <div className="paper-sign-line">Authorised Signatory</div>
        </div>
      </footer>
    </article>
  );
}
