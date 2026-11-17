import DateInput from '../DateInput';
import { NATURE_OPTIONS, RULE_OPTIONS, emptyEvd, splitTerms } from '../../utils/evd';

/** A row of toggle buttons where one option is chosen. */
const Segmented = ({ label, value, options, onChange }) => (
  <div className="segmented segmented-inline evd-seg" role="radiogroup" aria-label={label}>
    {options.map((o) => (
      <button key={o.value} type="button" role="radio" aria-checked={value === o.value}
        className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
    ))}
  </div>
);

const yesNo = [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }];

/** Commercial invoice form: choices for the Export Value Declaration (Annexure-A). */
export default function EvdSection({ step, form, setForm }) {
  const evd = { ...emptyEvd(), ...(form.evd || {}) };
  const set = (changes) => setForm((f) => ({ ...f, evd: { ...emptyEvd(), ...(f.evd || {}), ...changes } }));
  const terms = splitTerms(form.deliveryTerms);


  return (
    <section className="panel">
      <h2 className="panel-title">
        <span className="step">{step}</span> Export value declaration <em className="optional">Annexure-A · optional</em>
      </h2>
      <p className="field-help evd-intro">
        Used for the <strong>Export Value Declaration</strong> PDF on the invoice page. The invoice number, date, terms and
        place are filled in automatically; the choices below are already set the usual way.
      </p>
      <div className="grid-2">
        <label className="field">
          <span>Shipping bill no. <em className="optional">optional</em></span>
          <input className="input" value={evd.shippingBillNo} onChange={(e) => set({ shippingBillNo: e.target.value })} placeholder="Add once available" />
        </label>
        <label className="field">
          <span>Shipping bill date <em className="optional">optional</em></span>
          <DateInput value={evd.shippingBillDate} onChange={(v) => set({ shippingBillDate: v })} />
        </label>
      </div>
      <div className="field field-gap">
        <span>Nature of transaction</span>
        <Segmented label="Nature of transaction" value={evd.nature} options={NATURE_OPTIONS} onChange={(v) => set({ nature: v })} />
        {evd.nature === 'other' && (
          <input className="input" aria-label="Other nature of transaction" value={evd.natureOther}
            onChange={(e) => set({ natureOther: e.target.value })} placeholder="Describe the transaction" />
        )}
      </div>
      <div className="grid-3 field-gap">
        <div className="field">
          <span>Method of valuation</span>
          <Segmented label="Method of valuation" value={evd.valuationRule} options={RULE_OPTIONS.map((r) => ({ value: r, label: `Rule ${r}` }))}
            onChange={(v) => set({ valuationRule: v })} />
        </div>
        <div className="field">
          <span>Seller and buyer related?</span>
          <Segmented label="Seller and buyer related" value={evd.related} options={yesNo} onChange={(v) => set({ related: v })} />
        </div>
        <div className="field">
          <span>If yes, relationship influenced the price?</span>
          <Segmented label="Relationship influenced the price" value={evd.influenced} options={yesNo} onChange={(v) => set({ influenced: v })} />
        </div>
      </div>
      <div className="grid-2 field-gap">
        <label className="field">
          <span>Terms of payment</span>
          <input className="input" value={evd.termsOfPayment} onChange={(e) => set({ termsOfPayment: e.target.value })}
            placeholder={terms.payment || 'e.g. 100% TT in Advance'} />
          <div className="field-help">{evd.termsOfPayment ? 'Typed here' : terms.payment ? `From the terms above: “${terms.payment}”` : 'Leave empty to take it from the terms above'}</div>
        </label>
        <label className="field">
          <span>Terms of delivery</span>
          <input className="input" value={evd.termsOfDelivery} onChange={(e) => set({ termsOfDelivery: e.target.value })}
            placeholder={terms.delivery || 'e.g. C&F'} />
          <div className="field-help">{evd.termsOfDelivery ? 'Typed here' : terms.delivery ? `From the terms above: “${terms.delivery}”` : 'Leave empty to take it from the terms above'}</div>
        </label>
      </div>
      <label className="field field-gap">
        <span>Previous exports of identical / similar goods <em className="optional">optional</em></span>
        <input className="input" value={evd.previousExports} onChange={(e) => set({ previousExports: e.target.value })} />
      </label>
      <label className="field field-gap">
        <span>Any other relevant information <em className="optional">optional</em></span>
        <textarea className="input" rows={2} value={evd.otherInfo} onChange={(e) => set({ otherInfo: e.target.value })} />
      </label>
    </section>
  );
}
