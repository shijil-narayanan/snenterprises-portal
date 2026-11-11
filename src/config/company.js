// Starting values for SN Enterprises' own details. Once someone saves the Settings page in the
// portal, the saved values (stored in Firestore: settings/company) are used instead.
export const COMPANY = {
  name: 'SN ENTERPRISES',
  address: {
    addressline1: '401, Sadguru Garden, Hotel Oriental Aster lane',
    addressline2: 'Nr. BMC School, Chakala, Andheri East',
    city: 'Mumbai',
    pincode: '400099',
    country: 'India',
  },
  mobile: '+91-7738939458',
  phone: '',
  email: 'snenterprise401@yahoo.com',
  iec: '0313007845',
  gst: '27ACYPA2969C1ZD',
  bankDetails: {
    bankName: 'HDFC Bank',
    accountNumber: '14257630001014',
    ifsc: 'HDFC0001425',
    swiftCode: 'HDFCINBBXXX',
    branch: 'MIDC CROSS ROAD BRANCH, ANDHERI (EAST)',
  },
  // Letter of Undertaking for exports; renewed every financial year. Default for new export documents.
  lut: 'AD270426023252E DT. 10.04.2026',
};
