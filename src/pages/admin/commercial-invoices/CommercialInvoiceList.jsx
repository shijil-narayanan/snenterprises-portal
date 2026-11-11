import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteCommercialInvoice, listCommercialInvoices } from '../../../services/commercialInvoices';
import { listPackingLists } from '../../../services/packingLists';
import { formatDate, formatMoney, todayISO } from '../../../utils/invoice';
import { downloadCommercialPdf } from '../../../utils/invoicePdf';
import { BoxIcon, CopyIcon, EditIcon, PlusIcon, SearchIcon, TrashIcon } from '../../../components/Icons';
import DownloadPdfButton from '../../../components/DownloadPdfButton';

const byInvoiceDate = (a, b) =>
  (b.invoiceDate || '').localeCompare(a.invoiceDate || '') || (b.createdAt || '').localeCompare(a.createdAt || '');

function sumByCurrency(invoices) {
  const sums = {};
  invoices.forEach((inv) => { sums[inv.currency] = (sums[inv.currency] || 0) + (inv.total || 0); });
  return Object.entries(sums).map(([cur, v]) => formatMoney(v, cur)).join(' · ') || '—';
}

export default function CommercialInvoiceList() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  // commercial invoice id -> its packing list id
  const [packingByInvoice, setPackingByInvoice] = useState({});

  useEffect(() => {
    listCommercialInvoices()
      .then((list) => setInvoices([...list].sort(byInvoiceDate)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    listPackingLists()
      .then((lists) => setPackingByInvoice(Object.fromEntries(lists.filter((l) => l.commercialInvoiceId).map((l) => [l.commercialInvoiceId, l.id]))))
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((inv) =>
      [inv.invoiceNumber, inv.poNumber, inv.consignee?.name, inv.destination, inv.portOfDischarge]
        .some((v) => (v || '').toLowerCase().includes(q)),
    );
  }, [invoices, search]);

  const thisMonth = useMemo(() => {
    const month = todayISO().slice(0, 7);
    return invoices.filter((inv) => (inv.invoiceDate || '').startsWith(month));
  }, [invoices]);

  const handleDelete = async (inv) => {
    if (!window.confirm(`Delete commercial invoice ${inv.invoiceNumber || ''}? This cannot be undone.`)) return;
    try {
      await deleteCommercialInvoice(inv.id);
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
          <h1>Commercial Invoices</h1>
          <p className="muted">Export invoices under LUT, with shipping, marks and bank details.</p>
        </div>
        <div className="page-head-actions">
          <Link to="/admin/commercial-invoices/new" className="btn btn-primary"><PlusIcon /> New Commercial Invoice</Link>
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
            <div className="empty-icon">🚢</div>
            <h2>No commercial invoices yet</h2>
            <p className="muted">Your export invoices will appear here.</p>
            <Link to="/admin/commercial-invoices/new" className="btn btn-primary"><PlusIcon /> Create your first commercial invoice</Link>
          </div>
        ) : (
          <>
            <div className="list-toolbar">
              <div className="search-box">
                <SearchIcon />
                <input className="input" placeholder="Search invoice #, PO #, consignee, destination…" value={search}
                  onChange={(e) => setSearch(e.target.value)} aria-label="Search commercial invoices" />
              </div>
              <span className="muted small">{filtered.length} of {invoices.length}</span>
            </div>
            <div className="table-wrap">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Date</th>
                    <th>Consignee</th>
                    <th className="hide-sm">Shipping</th>
                    <th className="num">Amount</th>
                    <th className="actions"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => (
                    <tr key={inv.id} className="row-link" onClick={() => navigate(`/admin/commercial-invoices/${inv.id}`)}>
                      <td>
                        <Link to={`/admin/commercial-invoices/${inv.id}`} onClick={stop} className="strong">{inv.invoiceNumber || '(no number)'}</Link>
                        <div className="muted small">{inv.poNumber ? `PO ${inv.poNumber}` : `${inv.items?.length || 0} item${inv.items?.length === 1 ? '' : 's'}`}</div>
                      </td>
                      <td className="nowrap">{formatDate(inv.invoiceDate)}</td>
                      <td>{inv.consignee?.name || '—'}</td>
                      <td className="hide-sm">
                        <div className="small">{[inv.originPort, inv.portOfDischarge].filter(Boolean).join(' → ') || '—'}</div>
                        <div className="muted small">{[inv.vesselFlight, inv.destination].filter(Boolean).join(' · ')}</div>
                      </td>
                      <td className="num strong nowrap">{formatMoney(inv.total, inv.currency)}</td>
                      <td className="actions" onClick={stop}>
                        <DownloadPdfButton iconOnly getInvoice={() => inv} download={downloadCommercialPdf} />
                        {packingByInvoice[inv.id] ? (
                          <Link to={`/admin/packing-lists/${packingByInvoice[inv.id]}`} className="icon-btn icon-btn-done"
                            title="View packing list" aria-label="View packing list"><BoxIcon /></Link>
                        ) : (
                          <Link to={`/admin/packing-lists/new?invoice=${inv.id}`} className="icon-btn"
                            title="Create packing list (prefilled from this invoice)" aria-label="Create packing list"><BoxIcon /></Link>
                        )}
                        <Link to={`/admin/commercial-invoices/${inv.id}/edit`} className="icon-btn" title="Edit" aria-label="Edit"><EditIcon /></Link>
                        <Link to={`/admin/commercial-invoices/new?from=${inv.id}`} className="icon-btn" title="Duplicate" aria-label="Duplicate"><CopyIcon /></Link>
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
