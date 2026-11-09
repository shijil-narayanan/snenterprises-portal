import { createCollectionService } from './collection';

const str = (v) => (v ?? '').toString().trim();

export const COMPANY_ADDRESS_FIELDS = ['addressline1', 'addressline2', 'city', 'state', 'pincode', 'country'];
export const COMPANY_FIELDS = [
  'name', 'gst', 'phone', 'mobile', 'fax', 'email',
  'portOfDischarge', 'finalDestinationPort', 'countryOfFinalDestination',
];

export function toCompanyRecord(data) {
  const record = Object.fromEntries(COMPANY_FIELDS.map((f) => [f, str(data[f])]));
  record.address = Object.fromEntries(COMPANY_ADDRESS_FIELDS.map((f) => [f, str(data.address?.[f])]));
  return record;
}

export const companiesService = createCollectionService('companies', {
  toRecord: toCompanyRecord,
  orderField: 'name',
  orderDir: 'asc',
});
