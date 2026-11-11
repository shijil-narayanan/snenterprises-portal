import { createCollectionService } from './collection';
import { commercialTotal } from '../utils/commercial';
import { lineAmount } from '../utils/invoice';

const str = (v) => (v ?? '').toString().trim();

function toRecord(data) {
  const items = (data.items || []).map((it) => ({
    productId: it.productId || '',
    description: str(it.description),
    hsnCode: str(it.hsnCode),
    qty: Number(it.qty) || 0,
    unit: str(it.unit),
    rate: Number(it.rate) || 0,
    amount: lineAmount(it),
  }));
  const marks = data.marks || {};
  return {
    invoiceNumber: str(data.invoiceNumber),
    invoiceDate: data.invoiceDate || '',
    poNumber: str(data.poNumber),
    poDate: data.poDate || '',
    consigneeId: data.consigneeId || '',
    // Snapshots: later edits to a company don't change saved invoices
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
    currency: data.currency || 'USD',
    items,
    total: commercialTotal(items),
    notes: (data.notes || '').trim(),
    packages: data.packages === '' || data.packages == null ? '' : Number(data.packages) || 0,
    marks: { name: str(marks.name), numbers: str(marks.numbers), port: str(marks.port), origin: str(marks.origin) },
    deliveryTerms: str(data.deliveryTerms),
    lut: str(data.lut),
  };
}

const service = createCollectionService('commercialInvoices', { toRecord });

export const listCommercialInvoices = service.list;
export const getCommercialInvoice = service.get;
export const createCommercialInvoice = service.create;
export const updateCommercialInvoice = service.update;
export const deleteCommercialInvoice = service.remove;
export const addCommercialInvoiceEmailLog = service.addEmailLog;
