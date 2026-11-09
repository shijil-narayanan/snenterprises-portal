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

export const emptyItem = () => ({ productId: '', description: '', hsnCode: '', qty: 1, rate: 0 });

export const emptyInvoice = () => ({
  invoiceDate: todayISO(),
  invoiceNumber: '',
  poDate: '',
  poNumber: '',
  poCompanyId: '',
  poCompany: '',
  buyer: null,
  currency: 'INR',
  paymentTerms: '',
  taxType: 'CGST_SGST',
  items: [emptyItem()],
});

// Address object -> array of display lines
export function addressLines(a = {}) {
  // Trim stray trailing commas/spaces so lines join cleanly
  const clean = (v) => (v || '').replace(/[\s,]+$/, '').trim();
  const cityLine = [a.city, a.state, a.pincode].map(clean).filter(Boolean).join(', ');
  return [a.addressline1, a.addressline2, cityLine, a.country].map(clean).filter(Boolean);
}

// ---------- Amount in words ----------
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven',
  'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const below100 = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : ''));
const below1000 = (n) =>
  [Math.floor(n / 100) ? `${ONES[Math.floor(n / 100)]} Hundred` : '', n % 100 ? below100(n % 100) : '']
    .filter(Boolean)
    .join(' ');

// Indian system: crore, lakh, thousand
function indianWords(n) {
  if (n === 0) return 'Zero';
  const parts = [];
  const crore = Math.floor(n / 1e7);
  const lakh = Math.floor((n % 1e7) / 1e5);
  const thousand = Math.floor((n % 1e5) / 1e3);
  const rest = n % 1e3;
  if (crore) parts.push(`${indianWords(crore)} Crore`);
  if (lakh) parts.push(`${below100(lakh)} Lakh`);
  if (thousand) parts.push(`${below100(thousand)} Thousand`);
  if (rest) parts.push(below1000(rest));
  return parts.join(' ');
}

// International system: billion, million, thousand
function intlWords(n) {
  if (n === 0) return 'Zero';
  const parts = [];
  for (const [value, name] of [[1e9, 'Billion'], [1e6, 'Million'], [1e3, 'Thousand']]) {
    if (n >= value) {
      parts.push(`${below1000(Math.floor(n / value))} ${name}`);
      n %= value;
    }
  }
  if (n) parts.push(below1000(n));
  return parts.join(' ');
}

export function amountInWords(amount, currencyCode) {
  const cur = CURRENCIES.find((c) => c.code === currencyCode) || { major: '', minor: '' };
  const cents = Math.round((Number(amount) || 0) * 100);
  const toWords = currencyCode === 'INR' ? indianWords : intlWords;
  const major = Math.floor(cents / 100);
  const minor = cents % 100;
  let words = `${cur.major} ${toWords(major)}`.trim();
  if (minor) words += ` and ${toWords(minor)} ${cur.minor}`;
  return `${words} Only`;
}
