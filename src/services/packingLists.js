import { createCollectionService } from './collection';
import { packageNumbers } from '../utils/commercial';
import { itemTotals, packingTotals } from '../utils/packing';

const str = (v) => (v ?? '').toString().trim();
const num = (v) => Number(v) || 0;

function toRecord(data) {
  const items = (data.items || []).map((it) => {
    const packing = (it.packing || []).map((r) => ({
      boxes: num(r.boxes), piecesPerBox: num(r.piecesPerBox), netPerBox: num(r.netPerBox), grossPerBox: num(r.grossPerBox),
    }));
    const totals = itemTotals({ packing });
    return {
      productId: it.productId || '',
      description: str(it.description),
      hsnCode: str(it.hsnCode),
      unit: str(it.unit),
      packing,
      pieces: totals.pieces,
      net: totals.net,
      gross: totals.gross,
    };
  });
  const totals = packingTotals(items);
  const marks = data.marks || {};
  return {
    commercialInvoiceId: data.commercialInvoiceId || '',
    invoiceNumber: str(data.invoiceNumber),
    invoiceDate: data.invoiceDate || '',
    poNumber: str(data.poNumber),
    poDate: data.poDate || '',
    consigneeId: data.consigneeId || '',
    consignee: data.consignee || null,
    // Our own company details as they were when this was saved (from Settings)
    seller: data.seller || null,
    buyerSameAsConsignee: data.buyerSameAsConsignee !== false,
    buyerId: data.buyerSameAsConsignee === false ? data.buyerId || '' : '',
    buyer: data.buyerSameAsConsignee === false ? data.buyer || null : null,
    origin: str(data.origin),
    destination: str(data.destination),
    vesselFlight: str(data.vesselFlight),
    originPort: str(data.originPort),
    portOfDischarge: str(data.portOfDischarge),
    destinationPort: str(data.destinationPort),
    items,
    totals,
    packages: totals.boxes,
    notes: (data.notes || '').trim(),
    marks: {
      name: str(marks.name),
      numbers: str(marks.numbers) || packageNumbers(totals.boxes),
      port: str(marks.port),
      origin: str(marks.origin),
    },
    deliveryTerms: str(data.deliveryTerms),
    lut: str(data.lut),
  };
}

const service = createCollectionService('packingLists', { toRecord });

export const listPackingLists = service.list;
export const getPackingList = service.get;
export const createPackingList = service.create;
export const updatePackingList = service.update;
export const deletePackingList = service.remove;
