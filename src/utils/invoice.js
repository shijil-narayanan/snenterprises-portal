import { CURRENCIES } from '../config/catalog';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const lineAmount = (item) => round2((Number(item.qty) || 0) * (Number(item.rate) || 0));

export function computeTotals(items = [], taxType = 'CGST_SGST') {
  const subTotal = round2(items.reduce((sum, it) => sum + lineAmount(it), 0));
  const sgst = taxType === 'CGST_SGST' ? round2(subTotal * 0.09) : 0;
  const cgst = taxType === 'CGST_SGST' ? round2(subTotal * 0.09) : 0;
  const igst = taxType === 'IGST' ? round2(subTotal * 0.18) : 0;
  return { subTotal, sgst, cgst, igst, grandTotal: round2(subTotal + sgst + cgst + igst) };
}

export function currencySymbol(code) {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? '';
}

export function formatMoney(value, currency) {
  const n = Number(value) || 0;
  return `${currencySymbol(currency)}${n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// 'yyyy-mm-dd' -> 'dd/mm/yyyy'
export function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Indian financial year label, e.g. 2026-27
function financialYear(date = new Date()) {
  const y = date.getFullYear();
  const start = date.getMonth() >= 3 ? y : y - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

export function suggestInvoiceNumber(existing = []) {
  const fy = financialYear();
  const prefix = `SNE/${fy}/`;
  const max = existing
    .map((inv) => inv.invoiceNumber || '')
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10))
    .filter(Number.isFinite)
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

export const emptyItem = () => ({ description: '', qty: 1, rate: 0 });

export const emptyInvoice = () => ({
  invoiceDate: todayISO(),
  invoiceNumber: '',
  poDate: '',
  poNumber: '',
  poCompany: '',
  currency: 'INR',
  paymentTerms: '',
  taxType: 'CGST_SGST',
  items: [emptyItem()],
});
