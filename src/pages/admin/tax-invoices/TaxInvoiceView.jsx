import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteTaxInvoice, getTaxInvoice } from '../../../services/taxInvoices';
import { computeTotals, formatDate, formatMoney } from '../../../utils/invoice';
import InvoiceDocument from '../../../components/InvoiceDocument';
import DownloadPdfButton from '../../../components/DownloadPdfButton';
import { ArrowLeftIcon, CopyIcon, EditIcon, PrintIcon, TrashIcon } from '../../../components/Icons';
import { AuditLine } from '../../../components/AuditInfo';

export default function TaxInvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    getTaxInvoice(id).then(setInvoice).catch((e) => setError(e.message));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm(`Delete tax invoice ${invoice.invoiceNumber}? This cannot be undone.`)) return;
    try {
      await deleteTaxInvoice(id);
      navigate('/admin/tax-invoices', { state: { flash: `Invoice ${invoice.invoiceNumber} deleted` } });
    } catch (e) {
      setError(e.message);
    }
  };

  if (error) return <div className="alert alert-error">{error}</div>;
  if (invoice === undefined) return <p className="muted">Loading…</p>;
  if (invoice === null)
    return (
      <div className="panel">
        <p>Invoice not found.</p>
        <Link to="/admin/tax-invoices">← Back to Tax Invoices</Link>
      </div>
    );

  const totals = invoice.totals || computeTotals(invoice.items, invoice.taxType);

  // Set the PDF file name to the invoice number while printing
  const handlePrint = () => {
    const title = document.title;
    document.title = `Tax Invoice ${invoice.invoiceNumber}`.replace(/[/\\]/g, '-');
    window.print();
    document.title = title;
  };

  return (
    <>
      <div className="page-head no-print">
        <div>
          <Link to="/admin/tax-invoices" className="crumb"><ArrowLeftIcon size={14} /> Tax Invoices</Link>
          <h1>{invoice.invoiceNumber}</h1>
          <p className="muted">
            {invoice.poCompany || 'No company'} · {formatDate(invoice.invoiceDate)} · {formatMoney(totals.grandTotal, invoice.currency)}
          </p>
          <AuditLine record={invoice} />
        </div>
        <div className="page-head-actions">
          <button className="btn" onClick={() => navigate(`/admin/tax-invoices/new?from=${id}`)} title="Start a new invoice with the same buyer and items">
            <CopyIcon /> Duplicate
          </button>
          <Link to={`/admin/tax-invoices/${id}/edit`} className="btn"><EditIcon /> Edit</Link>
          <button className="btn" onClick={handlePrint}><PrintIcon /> Print</button>
          <DownloadPdfButton className="btn btn-primary" getInvoice={() => invoice} />
          <button className="btn btn-danger-outline" onClick={handleDelete} title="Delete invoice"><TrashIcon /> Delete</button>
        </div>
      </div>

      <InvoiceDocument invoice={invoice} />
    </>
  );
}
