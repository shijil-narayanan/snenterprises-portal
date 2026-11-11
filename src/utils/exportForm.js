// Helpers shared by the commercial invoice and packing list forms.

/** Company details copied onto a document (without bookkeeping fields). */
export const companySnapshot = ({ id: _id, createdAt: _c, updatedAt: _u, ...rest }) => rest;

/** Shared validation for the parts these sections cover. */
export function validateExportHeader(form, usedNumbers) {
  const errors = {};
  const number = (form.invoiceNumber || '').trim();
  if (!number) errors.invoiceNumber = 'Invoice number is required';
  else if (usedNumbers.has(number.toLowerCase())) errors.invoiceNumber = 'This number is already used';
  if (!form.invoiceDate) errors.invoiceDate = 'Invoice date is required';
  if (!form.consigneeId) errors.consignee = 'Select the consignee / importer';
  if (!form.buyerSameAsConsignee && !form.buyerId) errors.buyer = 'Select the buyer, or tick “Same as consignee”';
  return errors;
}
