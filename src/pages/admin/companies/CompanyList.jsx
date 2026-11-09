import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { companiesService } from '../../../services/companies';
import { DEFAULT_COMPANIES } from '../../../data/seed';
import ImportDefaults from '../../../components/ImportDefaults';

export default function CompanyList() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    return companiesService
      .list()
      .then(setCompanies)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) =>
      [c.name, c.gst, c.email, c.address?.city, c.address?.country].some((v) => (v || '').toLowerCase().includes(q)),
    );
  }, [companies, search]);

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete company "${c.name}"? Existing invoices keep their copy of its details.`)) return;
    try {
      await companiesService.remove(c.id);
      setCompanies((list) => list.filter((x) => x.id !== c.id));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h1>Companies</h1>
        <Link to="/admin/companies/new" className="btn btn-primary">+ New Company</Link>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : companies.length === 0 ? (
        <ImportDefaults label="companies" items={DEFAULT_COMPANIES} service={companiesService} onDone={load} />
      ) : (
        <>
          <input className="input search" placeholder="Search by name, GST, email, city…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Name</th><th>City / Country</th><th>GSTIN</th><th>Contact</th><th className="actions">Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td><Link to={`/admin/companies/${c.id}/edit`}>{c.name}</Link></td>
                    <td>{[c.address?.city, c.address?.state, c.address?.country].filter(Boolean).join(', ') || '—'}</td>
                    <td>{c.gst || '—'}</td>
                    <td>{c.email || c.mobile || c.phone || '—'}</td>
                    <td className="actions">
                      <Link to={`/admin/companies/${c.id}/edit`} className="btn btn-sm">Edit</Link>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <p className="muted">No companies match your search.</p>}
        </>
      )}
    </div>
  );
}
