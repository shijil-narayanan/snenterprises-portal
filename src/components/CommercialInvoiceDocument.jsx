import { amountInWordsPlain, formatAmount } from '../utils/invoice';
import { commercialTotal, groupItemsByHsn } from '../utils/commercial';
import DocumentHeader from './DocumentHeader';
import { ExportMarksAndFoot, ExportPartiesAndShipping } from './export/ExportDocParts';

// Price as entered (no forced decimals), e.g. 215 or 2.75
const formatRate = (v, currency) => {
  const n = Number(v) || 0;
  return n.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', { maximumFractionDigits: 4 });
};

/**
 * Printable commercial invoice (export). Used on the invoice page, for printing and PDFs.
 * fillPage stretches the item area to the bottom of the A4 page, like the paper form.
 */
export default function CommercialInvoiceDocument({ invoice, fillPage = false }) {
  const cur = invoice.currency || 'USD';
  const total = invoice.total ?? commercialTotal(invoice.items);
  const groups = groupItemsByHsn(invoice.items || []);

  return (
    <article className={`paper ci-doc${fillPage ? ' ci-fill' : ''}`}>
      <DocumentHeader title="Commercial Invoice" showIec />

      <ExportPartiesAndShipping doc={invoice} />

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

      <ExportMarksAndFoot doc={invoice} />
    </article>
  );
}
