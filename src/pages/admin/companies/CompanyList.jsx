import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { companiesService } from '../../../services/companies';
import { listTaxInvoices } from '../../../services/taxInvoices';
import { EditIcon, PlusIcon, SearchIcon, TrashIcon } from '../../../components/Icons';
import { addressLines } from '../../../utils/invoice';
import { CreatedByCell } from '../../../components/AuditInfo';

// Domestic = has a GSTIN or an Indian address; everything else is an export customer
const isDomestic = (c) => Boolean(c.gst) || /india/i.test(c.address?.country || '') || (!c.address?.country && Boolean(c.address?.state));

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'domestic', label: 'Domestic' },
  { value: 'export', label: 'Export' },
];

export default function CompanyList() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [invoiceCounts, setInvoiceCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    Promise.all([companiesService.list(), listTaxInvoices().catch(() => [])])
      .then(([list, invoices]) => {
        setCompanies(list);
        const counts = {};
        invoices.forEach((inv) => {
          if (inv.poCompanyId) counts[inv.poCompanyId] = (counts[inv.poCompanyId] || 0) + 1;
        });
        setInvoiceCounts(counts);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const domesticCount = useMemo(() => companies.filter(isDomestic).length, [companies]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companies.filter((c) => {
      if (filter === 'domestic' && !isDomestic(c)) return false;
      if (filter === 'export' && isDomestic(c)) return false;
      if (!q) return true;
      return [c.name, c.gst, c.email, c.mobile, c.phone, ...Object.values(c.address || {})]
        .some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [companies, search, filter]);

  const handleDelete = async (c) => {
    const used = invoiceCounts[c.id] || 0;
    const note = used ? `\n\nIt is used on ${used} invoice${used > 1 ? 's' : ''}; those invoices keep their copy of the details.` : '';
    if (!window.confirm(`Delete "${c.name}"?${note}`)) return;
    try {
      await companiesService.remove(c.id);
      setCompanies((list) => list.filter((x) => x.id !== c.id));
    } catch (e) {
      setError(e.message);
    }
  };

  const stop = (e) => e.stopPropagation();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Companies</h1>
          <p className="muted">Customers you bill. Selected as “PO company” on invoices.</p>
        </div>
        <div className="page-head-actions">
          <Link to="/companies/new" className="btn btn-primary"><PlusIcon /> New Company</Link>
        </div>
      </div>

      {!loading && companies.length > 0 && (
        <div className="stat-strip">
          <div className="stat-chip"><span>All companies</span><strong>{companies.length}</strong></div>
          <div className="stat-chip"><span>Domestic (India)</span><strong>{domesticCount}</strong></div>
          <div className="stat-chip"><span>Export customers</span><strong>{companies.length - domesticCount}</strong></div>
        </div>
      )}

      <div className="panel">
        {error && <div className="alert alert-error">{error}</div>}
        {loading ? (
          <p className="muted">Loading…</p>
        ) : companies.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🏢</div>
            <h2>No companies yet</h2>
            <p className="muted">Add the customers you invoice.</p>
            <Link to="/companies/new" className="btn btn-primary"><PlusIcon /> Add your first company</Link>
          </div>
        ) : (
          <>
            <div className="list-toolbar">
              <div className="search-box">
                <SearchIcon />
                <input className="input" placeholder="Search name, GSTIN, city, email…" value={search}
                  onChange={(e) => setSearch(e.target.value)} aria-label="Search companies" />
              </div>
              <div className="toolbar-right">
                <div className="segmented segmented-inline" role="radiogroup" aria-label="Filter companies">
                  {FILTERS.map((f) => (
                    <button key={f.value} type="button" role="radio" aria-checked={filter === f.value}
                      className={filter === f.value ? 'active' : ''} onClick={() => setFilter(f.value)}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <span className="muted small">{filtered.length} of {companies.length}</span>
              </div>
            </div>
            <div className="table-wrap">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th className="hide-sm">GSTIN</th>
                    <th className="hide-sm">Contact</th>
                    <th className="num">Invoices</th>
                    <th className="hide-sm">Created by</th>
                    <th className="actions"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const place = [c.address?.city, c.address?.state, c.address?.country].filter(Boolean).join(', ');
                    return (
                      <tr key={c.id} className="row-link" onClick={() => navigate(`/companies/${c.id}/edit`)}>
                        <td>
                          <div className="cell-title">
                            <Link to={`/companies/${c.id}/edit`} onClick={stop} className="strong">{c.name}</Link>
                            <span className={`tag ${isDomestic(c) ? 'tag-blue' : 'tag-green'}`}>{isDomestic(c) ? 'Domestic' : 'Export'}</span>
                          </div>
                          <div className="muted small" title={addressLines(c.address).join(', ')}>{place || 'No address'}</div>
                        </td>
                        <td className="hide-sm mono">{c.gst || <span className="muted">—</span>}</td>
                        <td className="hide-sm">
                          <div className="small">{c.email || <span className="muted">—</span>}</div>
                          <div className="muted small">{c.mobile || c.phone}</div>
                        </td>
                        <td className="num">{invoiceCounts[c.id] || <span className="muted">0</span>}</td>
                        <td className="hide-sm"><CreatedByCell record={c} /></td>
                        <td className="actions" onClick={stop}>
                          <Link to={`/companies/${c.id}/edit`} className="icon-btn" title="Edit" aria-label="Edit"><EditIcon /></Link>
                          <button className="icon-btn icon-btn-danger" title="Delete" aria-label="Delete" onClick={() => handleDelete(c)}><TrashIcon /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && <p className="muted">No companies match your search or filter.</p>}
          </>
        )}
      </div>
    </>
  );
}
