import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteTaxInvoice, listTaxInvoices } from '../../../services/taxInvoices';
import { formatDate, formatMoney } from '../../../utils/invoice';

export default function TaxInvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    listTaxInvoices()
      .then(setInvoices)
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

  const handleDelete = async (inv) => {
    if (!window.confirm(`Delete tax invoice ${inv.invoiceNumber || ''}? This cannot be undone.`)) return;
    try {
      await deleteTaxInvoice(inv.id);
      setInvoices((list) => list.filter((i) => i.id !== inv.id));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h1>Tax Invoices</h1>
        <Link to="/admin/tax-invoices/new" className="btn btn-primary">+ New Tax Invoice</Link>
      </div>

      <input
        className="input search"
        placeholder="Search by invoice #, PO # or company…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="muted">{invoices.length ? 'No invoices match your search.' : 'No tax invoices yet. Create your first one.'}</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Invoice Date</th>
                <th>PO #</th>
                <th>PO Company</th>
                <th className="num">Grand Total</th>
                <th className="actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id}>
                  <td><Link to={`/admin/tax-invoices/${inv.id}`}>{inv.invoiceNumber || '(no number)'}</Link></td>
                  <td>{formatDate(inv.invoiceDate)}</td>
                  <td>{inv.poNumber || '—'}</td>
                  <td>{inv.poCompany || '—'}</td>
                  <td className="num">{formatMoney(inv.totals?.grandTotal, inv.currency)}</td>
                  <td className="actions">
                    <Link to={`/admin/tax-invoices/${inv.id}`} className="btn btn-sm">View</Link>
                    <Link to={`/admin/tax-invoices/${inv.id}/edit`} className="btn btn-sm">Edit</Link>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(inv)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
