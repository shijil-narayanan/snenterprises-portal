// major/minor are used for "amount in words"
export const CURRENCIES = [
  { code: 'INR', symbol: '₹', major: 'Rupees', minor: 'Paise' },
  { code: 'USD', symbol: '$', major: 'US Dollars', minor: 'Cents' },
  { code: 'EUR', symbol: '€', major: 'Euros', minor: 'Cents' },
  { code: 'GBP', symbol: '£', major: 'Pounds', minor: 'Pence' },
  { code: 'AED', symbol: 'AED ', major: 'Dirhams', minor: 'Fils' },
  { code: 'SGD', symbol: 'S$', major: 'Singapore Dollars', minor: 'Cents' },
];

export const TAX_TYPES = [
  { value: 'CGST_SGST', short: 'CGST + SGST', label: 'CGST 9% + SGST 9% (intra-state)' },
  { value: 'IGST', short: 'IGST', label: 'IGST 18% (inter-state)' },
];

export const PAYMENT_TERM_PRESETS = ['Immediate', '15 days', '30 days', '45 days', '60 days'];
