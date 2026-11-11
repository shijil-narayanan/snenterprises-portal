import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deletePackingList, listPackingLists } from '../../../services/packingLists';
import { formatDate, todayISO } from '../../../utils/invoice';
import { formatWeight } from '../../../utils/packing';
import { downloadPackingPdf } from '../../../utils/invoicePdf';
import { CopyIcon, EditIcon, PlusIcon, SearchIcon, TrashIcon } from '../../../components/Icons';
import DownloadPdfButton from '../../../components/DownloadPdfButton';

const byInvoiceDate = (a, b) =>
  (b.invoiceDate || '').localeCompare(a.invoiceDate || '') || (b.createdAt || '').localeCompare(a.createdAt || '');

export default function PackingListList() {
  const navigate = useNavigate();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    listPackingLists()
      .then((l) => setLists([...l].sort(byInvoiceDate)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lists;
    return lists.filter((l) =>
      [l.invoiceNumber, l.poNumber, l.consignee?.name, l.destination, l.portOfDischarge].some((v) => (v || '').toLowerCase().includes(q)),
    );
  }, [lists, search]);

  const thisMonth = useMemo(() => {
    const month = todayISO().slice(0, 7);
    return lists.filter((l) => (l.invoiceDate || '').startsWith(month));
  }, [lists]);
  const monthGross = thisMonth.reduce((s, l) => s + (l.totals?.gross || 0), 0);
  const monthBoxes = thisMonth.reduce((s, l) => s + (l.totals?.boxes || 0), 0);

  const handleDelete = async (l) => {
    if (!window.confirm(`Delete packing list ${l.invoiceNumber || ''}? This cannot be undone.`)) return;
    try {
      await deletePackingList(l.id);
      setLists((all) => all.filter((x) => x.id !== l.id));
    } catch (e) {
      setError(e.message);
    }
  };

  const stop = (e) => e.stopPropagation();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Packing Lists</h1>
          <p className="muted">Packages, quantities and weights for each export shipment.</p>
        </div>
        <div className="page-head-actions">
          <Link to="/admin/packing-lists/new" className="btn btn-primary"><PlusIcon /> New Packing List</Link>
        </div>
      </div>

      {!loading && lists.length > 0 && (
        <div className="stat-strip">
          <div className="stat-chip"><span>Packing lists this month</span><strong>{thisMonth.length}</strong></div>
          <div className="stat-chip"><span>Boxes shipped this month</span><strong>{monthBoxes}</strong></div>
          <div className="stat-chip"><span>Gross weight this month</span><strong>{formatWeight(monthGross)} kg</strong></div>
        </div>
      )}

      <div className="panel">
        {error && <div className="alert alert-error">{error}</div>}
        {loading ? (
          <p className="muted">Loading…</p>
        ) : lists.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📦</div>
            <h2>No packing lists yet</h2>
            <p className="muted">Create one from scratch, or from a commercial invoice to copy its details.</p>
            <Link to="/admin/packing-lists/new" className="btn btn-primary"><PlusIcon /> Create your first packing list</Link>
          </div>
        ) : (
          <>
            <div className="list-toolbar">
              <div className="search-box">
                <SearchIcon />
                <input className="input" placeholder="Search invoice #, PO #, consignee, destination…" value={search}
                  onChange={(e) => setSearch(e.target.value)} aria-label="Search packing lists" />
              </div>
              <span className="muted small">{filtered.length} of {lists.length}</span>
            </div>
            <div className="table-wrap">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Date</th>
                    <th>Consignee</th>
                    <th className="num hide-sm">Packages</th>
                    <th className="num">Net / Gross (kg)</th>
                    <th className="actions"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => (
                    <tr key={l.id} className="row-link" onClick={() => navigate(`/admin/packing-lists/${l.id}`)}>
                      <td>
                        <Link to={`/admin/packing-lists/${l.id}`} onClick={stop} className="strong">{l.invoiceNumber || '(no number)'}</Link>
                        <div className="muted small">{[l.portOfDischarge, l.vesselFlight].filter(Boolean).join(' · ') || `${l.items?.length || 0} items`}</div>
                      </td>
                      <td className="nowrap">{formatDate(l.invoiceDate)}</td>
                      <td>{l.consignee?.name || '—'}</td>
                      <td className="num hide-sm">{l.totals?.boxes ?? '—'}</td>
                      <td className="num nowrap">
                        <span className="muted">{formatWeight(l.totals?.net)}</span> / <strong>{formatWeight(l.totals?.gross)}</strong>
                      </td>
                      <td className="actions" onClick={stop}>
                        <DownloadPdfButton iconOnly getInvoice={() => l} download={downloadPackingPdf} />
                        <Link to={`/admin/packing-lists/${l.id}/edit`} className="icon-btn" title="Edit" aria-label="Edit"><EditIcon /></Link>
                        <Link to={`/admin/packing-lists/new?from=${l.id}`} className="icon-btn" title="Duplicate" aria-label="Duplicate"><CopyIcon /></Link>
                        <button className="icon-btn icon-btn-danger" title="Delete" aria-label="Delete" onClick={() => handleDelete(l)}><TrashIcon /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && <p className="muted">No packing lists match “{search}”.</p>}
          </>
        )}
      </div>
    </>
  );
}
