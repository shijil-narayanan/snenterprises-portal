import DocumentHeader from './DocumentHeader';
import SignatureBlock from './SignatureBlock';
import { useCompany } from '../config/companySettings';
import { NATURE_OPTIONS, RULE_OPTIONS, dotDate, resolvedEvd } from '../utils/evd';

const Box = ({ checked, label }) => (
  <span className="evd-choice">
    {label && <span className="evd-choice-label">{label}</span>}
    <span className={`evd-box${checked ? ' checked' : ''}`} aria-label={checked ? `${label} (selected)` : label}>{checked ? '✓' : ''}</span>
  </span>
);

const YesNo = ({ value }) => (
  <div className="evd-yesno">
    <Box label="Yes" checked={value === 'yes'} />
    <Box label="No" checked={value === 'no'} />
  </div>
);

/**
 * Export Value Declaration (Annexure-A), filled from a commercial invoice.
 * Same header as the commercial invoice and packing list; content follows the customs form.
 */
export default function ExportValueDeclarationDocument({ invoice }) {
  const current = useCompany();
  const company = invoice.seller || current;
  const evd = resolvedEvd(invoice);
  const date = dotDate(invoice.invoiceDate);
  const place = (company.address?.city || '').toUpperCase();
  const shippingBill = [evd.shippingBillNo, evd.shippingBillDate && `dt. ${dotDate(evd.shippingBillDate)}`].filter(Boolean).join(' ');
  const nature = (v) => NATURE_OPTIONS.find((o) => o.value === v).label;

  return (
    <article className="paper evd-doc">
      <DocumentHeader title="Export Value Declaration" company={company} showIec />

      <div className="evd-date">Date: {date}</div>
      <div className="evd-title">
        <div className="evd-annex">Annexure-A</div>
        <div className="evd-name">EXPORT VALUE DECLARATION</div>
        <div className="evd-rule">(See Rule 7 of Customs Valuation (Determination of Value of Export Goods) Rules, 2007.)</div>
      </div>

      <div className="evd-list">
        <div className="evd-row">
          <span className="evd-num">1.</span>
          <span className="evd-label">Shipping Bill No. &amp; Date:-</span>
          <span className="evd-value">{shippingBill}</span>
        </div>
        <div className="evd-row">
          <span className="evd-num">2.</span>
          <span className="evd-label">Invoice No. &amp; Date:-</span>
          <span className="evd-value strong">{invoice.invoiceNumber} dt.{date}</span>
        </div>
        <div className="evd-row evd-block">
          <span className="evd-num">3.</span>
          <span className="evd-label">Nature of Transaction</span>
          <div className="evd-grid evd-nature">
            {['sale', 'consignment', 'gift', 'sample', 'other'].map((v) => (
              <Box key={v} label={v === 'other' && evd.natureOther ? `Other (${evd.natureOther})` : nature(v)} checked={evd.nature === v} />
            ))}
          </div>
        </div>
        <div className="evd-row">
          <span className="evd-num">4.</span>
          <span className="evd-label">Method of Valuation<br /><small>(See Export Valuation Rules)</small></span>
          <div className="evd-grid evd-rules">
            {RULE_OPTIONS.map((r) => <Box key={r} label={`Rule ${r}`} checked={evd.valuationRule === r} />)}
          </div>
        </div>
        <div className="evd-row">
          <span className="evd-num">5.</span>
          <span className="evd-label">Whether seller and buyer are related</span>
          <YesNo value={evd.related} />
        </div>
        <div className="evd-row">
          <span className="evd-num">6.</span>
          <span className="evd-label">If yes, whether relationship has influenced the price</span>
          <YesNo value={evd.influenced} />
        </div>
        <div className="evd-row">
          <span className="evd-num">7.</span>
          <span className="evd-label">Terms of Payment</span>
          <span className="evd-value strong">: {evd.termsOfPayment}</span>
        </div>
        <div className="evd-row">
          <span className="evd-num">8.</span>
          <span className="evd-label">Terms of Delivery</span>
          <span className="evd-value strong">: {evd.termsOfDelivery}</span>
        </div>
        <div className="evd-row evd-block">
          <span className="evd-num">9.</span>
          <span className="evd-label">Previous exports of identical/ similar goods, if any</span>
          {evd.previousExports && <div className="evd-text">{evd.previousExports}</div>}
        </div>
        <div className="evd-row evd-block">
          <span className="evd-num">10.</span>
          <span className="evd-label">Any other relevant information (Attach separate sheet, if necessary)</span>
          {evd.otherInfo && <div className="evd-text">{evd.otherInfo}</div>}
        </div>
      </div>

      <section className="evd-declaration">
        <div className="evd-decl-title">DECLARATION</div>
        <p><span>1.</span> I/We hereby declare that the information furnished above is true, complete and correct in every respect.</p>
        <p><span>2.</span> I/We also undertake to bring to the notice of proper officer any particulars which subsequently come to my/our knowledge which will have bearing on a valuation.</p>
      </section>

      <footer className="evd-foot">
        <div className="evd-place">
          <div>Place: {place}</div>
          <div>Date: {date}</div>
        </div>
        <SignatureBlock companyName={company.name} variant="declaration" />
      </footer>
    </article>
  );
}
