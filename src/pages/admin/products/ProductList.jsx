import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { productsService } from '../../../services/products';
import { DEFAULT_PRODUCTS } from '../../../data/seed';
import ImportDefaults from '../../../components/ImportDefaults';

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    return productsService
      .list()
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => [p.code, p.name, p.hsnCode].some((v) => (v || '').toLowerCase().includes(q)));
  }, [products, search]);

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete product "${p.name}"? Existing invoices are not affected.`)) return;
    try {
      await productsService.remove(p.id);
      setProducts((list) => list.filter((x) => x.id !== p.id));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h1>Products</h1>
        <Link to="/admin/products/new" className="btn btn-primary">+ New Product</Link>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : products.length === 0 ? (
        <ImportDefaults label="products" items={DEFAULT_PRODUCTS} service={productsService} onDone={load} />
      ) : (
        <>
          <input className="input search" placeholder="Search by code, name or HSN…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Code</th><th>Name</th><th>HSN Code</th><th className="actions">Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td className="nowrap">{p.code || '—'}</td>
                    <td><Link to={`/admin/products/${p.id}/edit`}>{p.name}</Link></td>
                    <td>{p.hsnCode || '—'}</td>
                    <td className="actions">
                      <Link to={`/admin/products/${p.id}/edit`} className="btn btn-sm">Edit</Link>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <p className="muted">No products match your search.</p>}
        </>
      )}
    </div>
  );
}
