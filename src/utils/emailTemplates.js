import { formatAmount, formatDate, formatMoney } from './invoice';

/** Default subject and message for emailing a document; the user can edit both. */
export function defaultEmail(kind, doc, company) {
  const signature = [company.name, company.mobile, company.phone, company.email].filter(Boolean).join('\n');
  const greeting = 'Dear Sir/Madam,';
  if (kind === 'tax') {
    const total = formatMoney(doc.totals?.grandTotal, doc.currency);
    return {
      subject: `Tax Invoice ${doc.invoiceNumber} from ${company.name}`,
      message: `${greeting}\n\nPlease find attached Tax Invoice ${doc.invoiceNumber} dated ${formatDate(doc.invoiceDate)} for ${total}${doc.poNumber ? `, against your PO ${doc.poNumber}` : ''}.\n\nKindly acknowledge receipt.\n\nRegards,\n${signature}`,
    };
  }
  if (kind === 'commercial') {
    return {
      subject: `Commercial Invoice ${doc.invoiceNumber} from ${company.name}`,
      message: `${greeting}\n\nPlease find attached Commercial Invoice ${doc.invoiceNumber} dated ${formatDate(doc.invoiceDate)} for ${doc.currency} ${formatAmount(doc.total, doc.currency)}${doc.poNumber ? `, against your PO ${doc.poNumber}` : ''}.\n\nKindly acknowledge receipt.\n\nRegards,\n${signature}`,
    };
  }
  return {
    subject: `Packing List for Invoice ${doc.invoiceNumber} from ${company.name}`,
    message: `${greeting}\n\nPlease find attached the Packing List for Invoice ${doc.invoiceNumber} (${doc.totals?.boxes || 0} packages${doc.portOfDischarge ? `, port of discharge ${doc.portOfDischarge}` : ''}).\n\nRegards,\n${signature}`,
  };
}

/** The customer's email to prefill "To" with. */
export function defaultRecipient(kind, doc) {
  if (kind === 'tax') return doc.buyer?.email || '';
  return doc.consignee?.email || doc.buyer?.email || '';
}
