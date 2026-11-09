import { createCollectionService } from './collection';

const str = (v) => (v ?? '').toString().trim();

export const productsService = createCollectionService('products', {
  toRecord: (data) => ({ code: str(data.code), name: str(data.name), hsnCode: str(data.hsnCode) }),
  orderField: 'name',
  orderDir: 'asc',
});
