import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deletePackingList, getPackingList } from '../../../services/packingLists';
import { formatDate } from '../../../utils/invoice';
import { formatWeight } from '../../../utils/packing';
import { downloadPackingPdf, packingPdfFileName } from '../../../utils/invoicePdf';
import PackingListDocument from '../../../components/PackingListDocument';
import DownloadPdfButton from '../../../components/DownloadPdfButton';
import { ArrowLeftIcon, CopyIcon, EditIcon, PrintIcon, TrashIcon } from '../../../components/Icons';
import { AuditLine } from '../../../components/AuditInfo';

export default function PackingListView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [list, setList] = useState(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    getPackingList(id).then(setList).catch((e) => setError(e.message));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm(`Delete packing list ${list.invoiceNumber}? This cannot be undone.`)) return;
    try {
      await deletePackingList(id);
      navigate('/admin/packing-lists', { state: { flash: `Packing list ${list.invoiceNumber} deleted` } });
    } catch (e) {
      setError(e.message);
    }
  };

  if (error) return <div className="alert alert-error">{error}</div>;
  if (list === undefined) return <p className="muted">Loading…</p>;
  if (list === null)
    return (
      <div className="panel">
        <p>Packing list not found.</p>
        <Link to="/admin/packing-lists">← Back to Packing Lists</Link>
      </div>
    );

  const handlePrint = () => {
    const title = document.title;
    document.title = packingPdfFileName(list).replace(/\.pdf$/, '');
    window.print();
    document.title = title;
  };

  return (
    <>
      <div className="page-head no-print">
        <div>
          <Link to="/admin/packing-lists" className="crumb"><ArrowLeftIcon size={14} /> Packing Lists</Link>
          <h1>Packing list {list.invoiceNumber}</h1>
          <p className="muted">
            {list.consignee?.name || 'No consignee'} · {formatDate(list.invoiceDate)} · {list.totals?.boxes || 0} boxes · {formatWeight(list.totals?.gross)} kg gross
            {list.commercialInvoiceId && <> · <Link to={`/admin/commercial-invoices/${list.commercialInvoiceId}`}>View commercial invoice</Link></>}
          </p>
          <AuditLine record={list} />
        </div>
        <div className="page-head-actions">
          <button className="btn" onClick={() => navigate(`/admin/packing-lists/new?from=${id}`)} title="Start a new packing list with the same consignee, shipping and items">
            <CopyIcon /> Duplicate
          </button>
          <Link to={`/admin/packing-lists/${id}/edit`} className="btn"><EditIcon /> Edit</Link>
          <button className="btn" onClick={handlePrint}><PrintIcon /> Print</button>
          <DownloadPdfButton className="btn btn-primary" getInvoice={() => list} download={downloadPackingPdf} />
          <button className="btn btn-danger-outline" onClick={handleDelete}><TrashIcon /> Delete</button>
        </div>
      </div>
      <PackingListDocument list={list} />
    </>
  );
}
