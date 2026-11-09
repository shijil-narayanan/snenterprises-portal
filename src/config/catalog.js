// Suggestions for the invoice form. Users can still type any value.
// Later these can move to their own Firestore collections with their own CRUD screens.
export const ITEM_SUGGESTIONS = [
  'BONDING JUMPER ELECTRO TINNED TRAYS 6MM2 X 120MM, 8MM HOLE',
];

export const COMPANY_SUGGESTIONS = [];

export const CURRENCIES = [
  { code: 'INR', symbol: '₹' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'AED', symbol: 'AED ' },
  { code: 'SGD', symbol: 'S$' },
];

export const TAX_TYPES = [
  { value: 'CGST_SGST', label: 'CGST 9% + SGST 9% (intra-state)' },
  { value: 'IGST', label: 'IGST 18% (inter-state)' },
];
