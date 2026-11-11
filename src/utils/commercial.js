import { COMPANY } from '../config/company';
import { lineAmount, todayISO } from './invoice';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const emptyCommercialItem = () => ({ productId: '', description: '', hsnCode: '', qty: 1, unit: 'Nos', rate: 0 });

export const emptyCommercialInvoice = () => ({
  invoiceNumber: '',
  invoiceDate: todayISO(),
  poNumber: '',
  poDate: '',
  consigneeId: '',
  consignee: null,
  buyerSameAsConsignee: true,
  buyerId: '',
  buyer: null,
  origin: 'INDIA',
  destination: '',
  vesselFlight: 'BY SEA',
  originPort: 'NHAVA SHEVA',
  portOfDischarge: '',
  destinationPort: '',
  currency: 'USD',
  items: [emptyCommercialItem()],
  notes: '',
  packages: '',
  marks: { name: '', numbers: '', port: '', origin: 'MADE IN INDIA' },
  deliveryTerms: '',
  lut: COMPANY.lut,
});

export const commercialTotal = (items = []) => round2(items.reduce((sum, it) => sum + lineAmount(it), 0));

// Financial year as "26-27"
function shortFinancialYear(date = new Date()) {
  const start = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `${String(start).slice(-2)}-${String(start + 1).slice(-2)}`;
}

/** Next number in the "01/26-27" style, per financial year. */
export function suggestCommercialNumber(existing = []) {
  const fy = shortFinancialYear();
  const max = existing
    .map((inv) => (inv.invoiceNumber || '').match(/^(\d+)\s*\/\s*(\d{2}-\d{2})$/))
    .filter((m) => m && m[2] === fy)
    .reduce((acc, m) => Math.max(acc, parseInt(m[1], 10)), 0);
  return `${String(max + 1).padStart(2, '0')}/${fy}`;
}

/**
 * Items grouped by HSN code (keeping the original order), for the "HSN CODE: …" headings.
 * Each item gets a running lineNo (1, 2, 3…) across groups.
 */
export function groupItemsByHsn(items = []) {
  const groups = [];
  items.forEach((item) => {
    const hsn = item.hsnCode || '';
    let group = groups.find((g) => g.hsn === hsn);
    if (!group) {
      group = { hsn, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  });
  let lineNo = 0;
  return groups.map((g) => ({ ...g, items: g.items.map((it) => ({ ...it, lineNo: (lineNo += 1) })) }));
}

/** Shipping defaults taken from a company's saved export details. */
export function shippingFromCompany(company) {
  if (!company) return {};
  return {
    destination: company.countryOfFinalDestination || company.address?.country || '',
    portOfDischarge: company.portOfDischarge || '',
    destinationPort: company.finalDestinationPort || company.portOfDischarge || '',
  };
}

/** "No. 1 to N" for N packages (or "No. 1" for one). */
export const packageNumbers = (n) => (Number(n) > 0 ? (Number(n) === 1 ? 'No. 1' : `No. 1 to ${Number(n)}`) : '');
