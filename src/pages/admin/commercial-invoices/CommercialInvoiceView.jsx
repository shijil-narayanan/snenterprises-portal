import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteCommercialInvoice, getCommercialInvoice } from '../../../services/commercialInvoices';
import { listPackingLists } from '../../../services/packingLists';
import { formatDate, formatMoney } from '../../../utils/invoice';
import { commercialPdfFileName, downloadCommercialPdf } from '../../../utils/invoicePdf';
import CommercialInvoiceDocument from '../../../components/CommercialInvoiceDocument';
import DownloadPdfButton from '../../../components/DownloadPdfButton';
import { ArrowLeftIcon, BoxIcon, CopyIcon, EditIcon, PrintIcon, TrashIcon } from '../../../components/Icons';

export default function CommercialInvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(undefined);
  const [error, setError] = useState('');
  const [packingList, setPackingList] = useState(null);

  useEffect(() => {
    getCommercialInvoice(id).then(setInvoice).catch((e) => setError(e.message));
    // Is there already a packing list made from this invoice?
    listPackingLists()
      .then((lists) => setPackingList(lists.find((l) => l.commercialInvoiceId === id) || null))
      .catch(() => {});
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm(`Delete commercial invoice ${invoice.invoiceNumber}? This cannot be undone.`)) return;
    try {
      await deleteCommercialInvoice(id);
      navigate('/admin/commercial-invoices', { state: { flash: `Invoice ${invoice.invoiceNumber} deleted` } });
    } catch (e) {
      setError(e.message);
    }
  };

  if (error) return <div className="alert alert-error">{error}</div>;
  if (invoice === undefined) return <p className="muted">Loading…</p>;
  if (invoice === null)
    return (
      <div className="panel">
        <p>Commercial invoice not found.</p>
        <Link to="/admin/commercial-invoices">← Back to Commercial Invoices</Link>
      </div>
    );

  const handlePrint = () => {
    const title = document.title;
    document.title = commercialPdfFileName(invoice).replace(/\.pdf$/, '');
    window.print();
    document.title = title;
  };

  return (
    <>
      <div className="page-head no-print">
        <div>
          <Link to="/admin/commercial-invoices" className="crumb"><ArrowLeftIcon size={14} /> Commercial Invoices</Link>
          <h1>{invoice.invoiceNumber}</h1>
          <p className="muted">
            {invoice.consignee?.name || 'No consignee'} · {formatDate(invoice.invoiceDate)} · {formatMoney(invoice.total, invoice.currency)}
          </p>
        </div>
        <div className="page-head-actions">
          <button className="btn" onClick={() => navigate(`/admin/commercial-invoices/new?from=${id}`)} title="Start a new invoice with the same consignee, shipping and items">
            <CopyIcon /> Duplicate
          </button>
          {packingList ? (
            <Link to={`/admin/packing-lists/${packingList.id}`} className="btn"><BoxIcon /> View packing list</Link>
          ) : (
            <Link to={`/admin/packing-lists/new?invoice=${id}`} className="btn btn-accent" title="Opens a packing list prefilled with this invoice's details">
              <BoxIcon /> Create packing list
            </Link>
          )}
          <Link to={`/admin/commercial-invoices/${id}/edit`} className="btn"><EditIcon /> Edit</Link>
          <button className="btn" onClick={handlePrint}><PrintIcon /> Print</button>
          <DownloadPdfButton className="btn btn-primary" getInvoice={() => invoice} download={downloadCommercialPdf} />
          <button className="btn btn-danger-outline" onClick={handleDelete}><TrashIcon /> Delete</button>
        </div>
      </div>
      <CommercialInvoiceDocument invoice={invoice} />
    </>
  );
}
