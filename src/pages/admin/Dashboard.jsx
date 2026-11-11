import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listTaxInvoices } from '../../services/taxInvoices';
import { companiesService } from '../../services/companies';
import { productsService } from '../../services/products';
import { listCommercialInvoices } from '../../services/commercialInvoices';
import { listPackingLists } from '../../services/packingLists';
import { formatDate, formatMoney } from '../../utils/invoice';

export default function Dashboard() {
  const [invoices, setInvoices] = useState(null);
  const [counts, setCounts] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    listTaxInvoices().then(setInvoices).catch((e) => setError(e.message));
    companiesService.list().then((l) => setCounts((c) => ({ ...c, companies: l.length }))).catch(() => {});
    productsService.list().then((l) => setCounts((c) => ({ ...c, products: l.length }))).catch(() => {});
    listCommercialInvoices().then((l) => setCounts((c) => ({ ...c, commercial: l.length }))).catch(() => {});
    listPackingLists().then((l) => setCounts((c) => ({ ...c, packing: l.length }))).catch(() => {});
  }, []);

  const recent = (invoices || []).slice(0, 5);

  return (
    <>
      <div className="welcome card">
        <h1>Welcome to SN Enterprises</h1>
        <p>Manage your tax invoices, commercial invoices and other business documents from one place.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="stat-grid">
        <div className="card stat">
          <div className="stat-label">Tax Invoices</div>
          <div className="stat-value">{invoices ? invoices.length : '…'}</div>
          <Link to="/admin/tax-invoices">View all →</Link>
        </div>
        <div className="card stat">
          <div className="stat-label">Commercial Invoices</div>
          <div className="stat-value">{counts.commercial ?? '…'}</div>
          <Link to="/admin/commercial-invoices">View all →</Link>
        </div>
        <div className="card stat">
          <div className="stat-label">Packing Lists</div>
          <div className="stat-value">{counts.packing ?? '…'}</div>
          <Link to="/admin/packing-lists">View all →</Link>
        </div>
        <div className="card stat">
          <div className="stat-label">Companies</div>
          <div className="stat-value">{counts.companies ?? '…'}</div>
          <Link to="/admin/companies">Manage →</Link>
        </div>
        <div className="card stat">
          <div className="stat-label">Products</div>
          <div className="stat-value">{counts.products ?? '…'}</div>
          <Link to="/admin/products">Manage →</Link>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Recent tax invoices</h2>
          <Link to="/admin/tax-invoices/new" className="btn btn-primary btn-sm">+ New Tax Invoice</Link>
        </div>
        {invoices && recent.length === 0 && <p className="muted">No invoices yet.</p>}
        {recent.length > 0 && (
          <table className="table">
            <thead>
              <tr><th>Invoice #</th><th>Date</th><th>Company</th><th className="num">Total</th></tr>
            </thead>
            <tbody>
              {recent.map((inv) => (
                <tr key={inv.id}>
                  <td><Link to={`/admin/tax-invoices/${inv.id}`}>{inv.invoiceNumber || '(no number)'}</Link></td>
                  <td>{formatDate(inv.invoiceDate)}</td>
                  <td>{inv.poCompany || '—'}</td>
                  <td className="num">{formatMoney(inv.totals?.grandTotal, inv.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
