import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { productsService } from '../../../services/products';
import { listTaxInvoices } from '../../../services/taxInvoices';
import { EditIcon, PlusIcon, SearchIcon, TrashIcon } from '../../../components/Icons';
import { CreatedByCell } from '../../../components/AuditInfo';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'missing-hsn', label: 'Missing HSN' },
];

export default function ProductList() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [usage, setUsage] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    Promise.all([productsService.list(), listTaxInvoices().catch(() => [])])
      .then(([list, invoices]) => {
        setProducts(list);
        // Number of invoices each product appears on
        const counts = {};
        invoices.forEach((inv) => {
          new Set((inv.items || []).map((it) => it.productId).filter(Boolean)).forEach((pid) => {
            counts[pid] = (counts[pid] || 0) + 1;
          });
        });
        setUsage(counts);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const missingHsn = useMemo(() => products.filter((p) => !p.hsnCode).length, [products]);
  const hsnGroups = useMemo(() => new Set(products.map((p) => p.hsnCode).filter(Boolean)).size, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (filter === 'missing-hsn' && p.hsnCode) return false;
      return !q || [p.code, p.name, p.hsnCode].some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [products, search, filter]);

  const handleDelete = async (p) => {
    const used = usage[p.id] || 0;
    const note = used ? `\n\nIt appears on ${used} invoice${used > 1 ? 's' : ''}; those invoices are not affected.` : '';
    if (!window.confirm(`Delete "${p.name}"?${note}`)) return;
    try {
      await productsService.remove(p.id);
      setProducts((list) => list.filter((x) => x.id !== p.id));
    } catch (e) {
      setError(e.message);
    }
  };

  const stop = (e) => e.stopPropagation();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Products</h1>
          <p className="muted">Items you sell. Picked as line items on invoices, with their HSN code.</p>
        </div>
        <div className="page-head-actions">
          <Link to="/products/new" className="btn btn-primary"><PlusIcon /> New Product</Link>
        </div>
      </div>

      {!loading && products.length > 0 && (
        <div className="stat-strip">
          <div className="stat-chip"><span>All products</span><strong>{products.length}</strong></div>
          <div className="stat-chip"><span>HSN codes in use</span><strong>{hsnGroups}</strong></div>
          <button type="button" className={`stat-chip stat-chip-btn${missingHsn ? ' stat-chip-warn' : ''}`}
            onClick={() => setFilter(missingHsn ? 'missing-hsn' : 'all')} disabled={!missingHsn}>
            <span>Missing HSN code</span><strong>{missingHsn}</strong>
            {missingHsn > 0 && <em>Show these →</em>}
          </button>
        </div>
      )}

      <div className="panel">
        {error && <div className="alert alert-error">{error}</div>}
        {loading ? (
          <p className="muted">Loading…</p>
        ) : products.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📦</div>
            <h2>No products yet</h2>
            <p className="muted">Add the items you put on invoices.</p>
            <Link to="/products/new" className="btn btn-primary"><PlusIcon /> Add your first product</Link>
          </div>
        ) : (
          <>
            <div className="list-toolbar">
              <div className="search-box">
                <SearchIcon />
                <input className="input" placeholder="Search name, code or HSN…" value={search}
                  onChange={(e) => setSearch(e.target.value)} aria-label="Search products" />
              </div>
              <div className="toolbar-right">
                <div className="segmented segmented-inline" role="radiogroup" aria-label="Filter products">
                  {FILTERS.map((f) => (
                    <button key={f.value} type="button" role="radio" aria-checked={filter === f.value}
                      className={filter === f.value ? 'active' : ''} onClick={() => setFilter(f.value)}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <span className="muted small">{filtered.length} of {products.length}</span>
              </div>
            </div>
            <div className="table-wrap">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>HSN</th>
                    <th className="num hide-sm">Invoices</th>
                    <th className="hide-sm">Created by</th>
                    <th className="actions"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="row-link" onClick={() => navigate(`/products/${p.id}/edit`)}>
                      <td>
                        <Link to={`/products/${p.id}/edit`} onClick={stop} className="strong product-name">{p.name}</Link>
                        {p.code && <div><span className="tag tag-gray mono">{p.code}</span></div>}
                      </td>
                      <td className="nowrap">
                        {p.hsnCode ? <span className="mono">{p.hsnCode}</span> : <span className="tag tag-amber">Missing</span>}
                      </td>
                      <td className="num hide-sm">{usage[p.id] || <span className="muted">0</span>}</td>
                      <td className="hide-sm"><CreatedByCell record={p} /></td>
                      <td className="actions" onClick={stop}>
                        <Link to={`/products/${p.id}/edit`} className="icon-btn" title="Edit" aria-label="Edit"><EditIcon /></Link>
                        <button className="icon-btn icon-btn-danger" title="Delete" aria-label="Delete" onClick={() => handleDelete(p)}><TrashIcon /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && <p className="muted">No products match your search or filter.</p>}
          </>
        )}
      </div>
    </>
  );
}
