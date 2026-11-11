import { createCollectionService } from './collection';
import { computeTotals, lineAmount } from '../utils/invoice';

const str = (v) => (v ?? '').toString().trim();

function toRecord(data) {
  const items = (data.items || []).map((it) => ({
    productId: it.productId || '',
    description: str(it.description),
    hsnCode: str(it.hsnCode),
    qty: Number(it.qty) || 0,
    rate: Number(it.rate) || 0,
    amount: lineAmount(it),
  }));
  return {
    invoiceDate: data.invoiceDate || '',
    invoiceNumber: str(data.invoiceNumber),
    poDate: data.poDate || '',
    poNumber: str(data.poNumber),
    poCompanyId: data.poCompanyId || '',
    poCompany: str(data.poCompany),
    // Snapshot of the buyer's details at the time of invoicing,
    // so later edits to the company don't change old invoices.
    buyer: data.buyer || null,
    // Our own company details as they were when this was saved (from Settings)
    seller: data.seller || null,
    currency: data.currency || 'INR',
    paymentTerms: str(data.paymentTerms),
    taxType: data.taxType || 'CGST_SGST',
    items,
    totals: computeTotals(items, data.taxType),
  };
}

const service = createCollectionService('taxInvoices', { toRecord });

export const listTaxInvoices = service.list;
export const getTaxInvoice = service.get;
export const createTaxInvoice = service.create;
export const updateTaxInvoice = service.update;
export const deleteTaxInvoice = service.remove;
