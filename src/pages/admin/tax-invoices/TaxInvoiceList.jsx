import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteTaxInvoice, listTaxInvoices } from '../../../services/taxInvoices';
import { formatDate, formatMoney, todayISO } from '../../../utils/invoice';
import { CopyIcon, EditIcon, PlusIcon, SearchIcon, TrashIcon } from '../../../components/Icons';

// Newest invoice date first, then most recently created
const byInvoiceDate = (a, b) =>
  (b.invoiceDate || '').localeCompare(a.invoiceDate || '') || (b.createdAt || '').localeCompare(a.createdAt || '');

function sumByCurrency(invoices) {
  const sums = {};
  invoices.forEach((inv) => {
    sums[inv.currency] = (sums[inv.currency] || 0) + (inv.totals?.grandTotal || 0);
  });
  return Object.entries(sums).map(([cur, v]) => formatMoney(v, cur)).join(' · ') || '—';
}

export default function TaxInvoiceList() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    listTaxInvoices()
      .then((list) => setInvoices([...list].sort(byInvoiceDate)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((inv) =>
      [inv.invoiceNumber, inv.poNumber, inv.poCompany].some((v) => (v || '').toLowerCase().includes(q)),
    );
  }, [invoices, search]);

  const thisMonth = useMemo(() => {
    const month = todayISO().slice(0, 7);
    return invoices.filter((inv) => (inv.invoiceDate || '').startsWith(month));
  }, [invoices]);

  const handleDelete = async (inv) => {
    if (!window.confirm(`Delete tax invoice ${inv.invoiceNumber || ''}? This cannot be undone.`)) return;
    try {
      await deleteTaxInvoice(inv.id);
      setInvoices((list) => list.filter((i) => i.id !== inv.id));
    } catch (e) {
      setError(e.message);
    }
  };

  const stop = (e) => e.stopPropagation();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Tax Invoices</h1>
          <p className="muted">Create, view and print GST tax invoices.</p>
        </div>
        <div className="page-head-actions">
          <Link to="/admin/tax-invoices/new" className="btn btn-primary"><PlusIcon /> New Tax Invoice</Link>
        </div>
      </div>

      {!loading && invoices.length > 0 && (
        <div className="stat-strip">
          <div className="stat-chip"><span>Invoices this month</span><strong>{thisMonth.length}</strong></div>
          <div className="stat-chip"><span>Billed this month</span><strong>{sumByCurrency(thisMonth)}</strong></div>
          <div className="stat-chip"><span>All invoices</span><strong>{invoices.length}</strong></div>
        </div>
      )}

      <div className="panel">
        {error && <div className="alert alert-error">{error}</div>}
        {loading ? (
          <p className="muted">Loading…</p>
        ) : invoices.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🧾</div>
            <h2>No tax invoices yet</h2>
            <p className="muted">Your invoices will appear here.</p>
            <Link to="/admin/tax-invoices/new" className="btn btn-primary"><PlusIcon /> Create your first invoice</Link>
          </div>
        ) : (
          <>
            <div className="list-toolbar">
              <div className="search-box">
                <SearchIcon />
                <input
                  className="input"
                  placeholder="Search invoice #, PO # or company…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search invoices"
                />
              </div>
              <span className="muted small">{filtered.length} of {invoices.length}</span>
            </div>
            <div className="table-wrap">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Date</th>
                    <th>Bill to</th>
                    <th>PO #</th>
                    <th className="num">Amount</th>
                    <th className="actions"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => (
                    <tr key={inv.id} onClick={() => navigate(`/admin/tax-invoices/${inv.id}`)} className="row-link">
                      <td>
                        <Link to={`/admin/tax-invoices/${inv.id}`} onClick={stop} className="strong">{inv.invoiceNumber || '(no number)'}</Link>
                        <div className="muted small">{inv.items?.length || 0} item{inv.items?.length === 1 ? '' : 's'}</div>
                      </td>
                      <td className="nowrap">{formatDate(inv.invoiceDate)}</td>
                      <td>{inv.poCompany || '—'}</td>
                      <td>{inv.poNumber || '—'}</td>
                      <td className="num strong nowrap">{formatMoney(inv.totals?.grandTotal, inv.currency)}</td>
                      <td className="actions" onClick={stop}>
                        <Link to={`/admin/tax-invoices/${inv.id}/edit`} className="icon-btn" title="Edit" aria-label="Edit"><EditIcon /></Link>
                        <Link to={`/admin/tax-invoices/new?from=${inv.id}`} className="icon-btn" title="Duplicate" aria-label="Duplicate"><CopyIcon /></Link>
                        <button className="icon-btn icon-btn-danger" title="Delete" aria-label="Delete" onClick={() => handleDelete(inv)}><TrashIcon /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && <p className="muted">No invoices match “{search}”.</p>}
          </>
        )}
      </div>
    </>
  );
}
