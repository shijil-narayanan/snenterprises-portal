import { COMPANY } from '../config/company';
import { todayISO } from './invoice';

const num = (v) => Number(v) || 0;
const round3 = (n) => Math.round(n * 1000) / 1000;

export const emptyPackingRow = () => ({ boxes: 1, piecesPerBox: 1, netPerBox: 0, grossPerBox: 0 });
export const emptyPackingItem = () => ({ productId: '', description: '', hsnCode: '', unit: 'Nos', packing: [emptyPackingRow()] });

export const emptyPackingList = () => ({
  commercialInvoiceId: '',
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
  items: [emptyPackingItem()],
  notes: '',
  marks: { name: '', numbers: '', port: '', origin: 'MADE IN INDIA' },
  deliveryTerms: '',
  lut: COMPANY.lut,
});

/** Totals for one packing row: boxes × per-box figures. */
export const rowTotals = (r) => ({
  pieces: round3(num(r.boxes) * num(r.piecesPerBox)),
  net: round3(num(r.boxes) * num(r.netPerBox)),
  gross: round3(num(r.boxes) * num(r.grossPerBox)),
});

/** Totals for an item: sums of its packing rows. */
export function itemTotals(item) {
  return (item.packing || []).reduce(
    (t, r) => {
      const rt = rowTotals(r);
      return {
        boxes: t.boxes + num(r.boxes),
        pieces: round3(t.pieces + rt.pieces),
        net: round3(t.net + rt.net),
        gross: round3(t.gross + rt.gross),
      };
    },
    { boxes: 0, pieces: 0, net: 0, gross: 0 },
  );
}

/**
 * Items with their totals and package numbers ("1 to 5", "6 to 8", …).
 * Boxes are numbered in the order the document prints them (grouped by HSN code),
 * but the result keeps the original item order.
 */
export function withPackageRanges(items = []) {
  const groups = [];
  items.forEach((it, i) => {
    const hsn = it.hsnCode || '';
    let g = groups.find((x) => x.hsn === hsn);
    if (!g) groups.push((g = { hsn, indexes: [] }));
    g.indexes.push(i);
  });
  const ranges = [];
  let next = 1;
  groups.flatMap((g) => g.indexes).forEach((i) => {
    const boxes = itemTotals(items[i]).boxes;
    if (boxes > 0) {
      const last = next + boxes - 1;
      ranges[i] = boxes === 1 ? `${next}` : `${next} to ${last}`;
      next = last + 1;
    } else {
      ranges[i] = '';
    }
  });
  return items.map((item, i) => ({ ...item, totals: itemTotals(item), packages: ranges[i] }));
}

export function packingTotals(items = []) {
  return items.reduce(
    (t, it) => {
      const x = itemTotals(it);
      return { boxes: t.boxes + x.boxes, net: round3(t.net + x.net), gross: round3(t.gross + x.gross) };
    },
    { boxes: 0, net: 0, gross: 0 },
  );
}

/** Weight with 3 decimals, e.g. 460.000 */
export const formatWeight = (v) => num(v).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

/** Quantity without trailing zeros, e.g. 10 or 2.5 */
export const formatQty = (v) => num(v).toLocaleString('en-US', { maximumFractionDigits: 3 });

/**
 * A new packing list prefilled from a commercial invoice: same parties, shipping, marks,
 * terms and items (one packing row per item holding its full quantity, weights to fill in).
 */
export function packingListFromCommercial(ci) {
  const base = emptyPackingList();
  const keep = ['invoiceNumber', 'invoiceDate', 'poNumber', 'poDate', 'consigneeId', 'consignee', 'buyerSameAsConsignee',
    'buyerId', 'buyer', 'origin', 'destination', 'vesselFlight', 'originPort', 'portOfDischarge', 'destinationPort',
    'deliveryTerms', 'lut'];
  const result = { ...base, commercialInvoiceId: ci.id || '' };
  keep.forEach((k) => { if (ci[k] !== undefined && ci[k] !== null) result[k] = ci[k]; });
  result.marks = { ...base.marks, ...ci.marks };
  result.items = (ci.items || []).length
    ? ci.items.map((it) => ({
      productId: it.productId || '',
      description: it.description || '',
      hsnCode: it.hsnCode || '',
      unit: it.unit || 'Nos',
      packing: [{ boxes: 1, piecesPerBox: num(it.qty) || 1, netPerBox: 0, grossPerBox: 0 }],
    }))
    : [emptyPackingItem()];
  return result;
}
