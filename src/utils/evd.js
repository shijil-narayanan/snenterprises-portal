// Export Value Declaration (Annexure-A, Rule 7 of the Customs Valuation
// (Determination of Value of Export Goods) Rules, 2007) — filled from a commercial invoice.

export const NATURE_OPTIONS = [
  { value: 'sale', label: 'Sale' },
  { value: 'consignment', label: 'Sale on consignment basis' },
  { value: 'gift', label: 'Gift' },
  { value: 'sample', label: 'Sample' },
  { value: 'other', label: 'Other' },
];
export const RULE_OPTIONS = ['3', '4', '5', '6'];

/** Defaults match how SN Enterprises usually fills the form. */
export const emptyEvd = () => ({
  shippingBillNo: '',
  shippingBillDate: '',
  nature: 'consignment',
  natureOther: '',
  valuationRule: '3',
  related: 'no',
  influenced: 'no',
  termsOfPayment: '',
  termsOfDelivery: '',
  previousExports: '',
  otherInfo: '',
});

/**
 * "C&F & 100% TT in Advance" -> { delivery: 'C&F', payment: '100% TT in Advance' }.
 * The first " & " separates the delivery term from the payment term.
 */
export function splitTerms(deliveryTerms = '') {
  const t = deliveryTerms.trim();
  const m = t.match(/^(.+?)\s+&\s+(.+)$/);
  return m ? { delivery: m[1].trim(), payment: m[2].trim() } : { delivery: t, payment: '' };
}

/** The declaration as printed: saved choices, with terms taken from the invoice when left empty. */
export function resolvedEvd(invoice) {
  const evd = { ...emptyEvd(), ...(invoice.evd || {}) };
  const terms = splitTerms(invoice.deliveryTerms);
  return {
    ...evd,
    termsOfPayment: evd.termsOfPayment || terms.payment,
    termsOfDelivery: evd.termsOfDelivery || terms.delivery,
  };
}

/** "2026-11-03" -> "03.11.2026" (how the declaration writes dates) */
export function dotDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return d && m && y ? `${d}.${m}.${y}` : iso;
}
