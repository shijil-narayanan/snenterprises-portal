import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deletePackingList, getPackingList, addPackingListEmailLog } from '../../../services/packingLists';
import { formatDate } from '../../../utils/invoice';
import { formatWeight } from '../../../utils/packing';
import { downloadPackingPdf, packingPdfFileName, buildPackingPdf } from '../../../utils/invoicePdf';
import PackingListDocument from '../../../components/PackingListDocument';
import DownloadPdfButton from '../../../components/DownloadPdfButton';
import { ArrowLeftIcon, CopyIcon, EditIcon, PrintIcon, TrashIcon, MailIcon } from '../../../components/Icons';
import { AuditLine } from '../../../components/AuditInfo';
import EmailModal from '../../../components/EmailModal';
import EmailHistory from '../../../components/EmailHistory';
import { isEmailConfigured } from '../../../services/email';

export default function PackingListView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [list, setList] = useState(undefined);
  const [error, setError] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);

  useEffect(() => {
    getPackingList(id).then(setList).catch((e) => setError(e.message));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm(`Delete packing list ${list.invoiceNumber}? This cannot be undone.`)) return;
    try {
      await deletePackingList(id);
      navigate('/packing-lists', { state: { flash: `Packing list ${list.invoiceNumber} deleted` } });
    } catch (e) {
      setError(e.message);
    }
  };

  const closeEmail = useCallback(() => setEmailOpen(false), []);
  // After a successful send: save it in the document's email history and show it
  const handleEmailSent = async (entry) => {
    setEmailOpen(false);
    setList((d) => ({ ...d, emails: [...(d.emails || []), entry] }));
    navigate(`${window.location.pathname}${window.location.search}`, { replace: true, state: { flash: `Email sent to ${entry.to.join(', ')}` } });
    try {
      await addPackingListEmailLog(id, entry);
    } catch {
      // the email went out; only the history note failed to save
    }
  };

  if (error) return <div className="alert alert-error">{error}</div>;
  if (list === undefined) return <p className="muted">Loading…</p>;
  if (list === null)
    return (
      <div className="panel">
        <p>Packing list not found.</p>
        <Link to="/packing-lists">← Back to Packing Lists</Link>
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
          <Link to="/packing-lists" className="crumb"><ArrowLeftIcon size={14} /> Packing Lists</Link>
          <h1>Packing list {list.invoiceNumber}</h1>
          <p className="muted">
            {list.consignee?.name || 'No consignee'} · {formatDate(list.invoiceDate)} · {list.totals?.boxes || 0} boxes · {formatWeight(list.totals?.gross)} kg gross
            {list.commercialInvoiceId && <> · <Link to={`/commercial-invoices/${list.commercialInvoiceId}`}>View commercial invoice</Link></>}
          </p>
          <AuditLine record={list} />
          <EmailHistory emails={list.emails} />
        </div>
        <div className="page-head-actions">
          <button className="btn" onClick={() => navigate(`/packing-lists/new?from=${id}`)} title="Start a new packing list with the same consignee, shipping and items">
            <CopyIcon /> Duplicate
          </button>
          <Link to={`/packing-lists/${id}/edit`} className="btn"><EditIcon /> Edit</Link>
          {isEmailConfigured && (
            <button className="btn" onClick={() => setEmailOpen(true)} title="Email the PDF"><MailIcon /> Email</button>
          )}
          <button className="btn" onClick={handlePrint}><PrintIcon /> Print</button>
          <DownloadPdfButton className="btn btn-primary" getInvoice={() => list} download={downloadPackingPdf} />
          <button className="btn btn-danger-outline" onClick={handleDelete}><TrashIcon /> Delete</button>
        </div>
      </div>
      <PackingListDocument list={list} />
      {emailOpen && <EmailModal kind="packing" doc={list} build={buildPackingPdf} onClose={closeEmail} onSent={handleEmailSent} />}
    </>
  );
}
