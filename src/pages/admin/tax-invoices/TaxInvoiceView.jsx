import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteTaxInvoice, getTaxInvoice } from '../../../services/taxInvoices';
import { COMPANY } from '../../../config/company';
import { TAX_TYPES } from '../../../config/catalog';
import { addressLines, amountInWords, computeTotals, formatDate, formatMoney } from '../../../utils/invoice';
import InvoiceTotals from './InvoiceTotals';
import { ArrowLeftIcon, CopyIcon, EditIcon, PrintIcon, TrashIcon } from '../../../components/Icons';

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
  const buyer = invoice.buyer || {};
  const buyerContact = [buyer.email, buyer.mobile || buyer.phone].filter(Boolean).join(' · ');
  const bank = COMPANY.bankDetails;
  const taxLabel = TAX_TYPES.find((t) => t.value === invoice.taxType)?.short;

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
        </div>
        <div className="page-head-actions">
          <button className="btn" onClick={() => navigate(`/admin/tax-invoices/new?from=${id}`)} title="Start a new invoice with the same buyer and items">
            <CopyIcon /> Duplicate
          </button>
          <Link to={`/admin/tax-invoices/${id}/edit`} className="btn"><EditIcon /> Edit</Link>
          <button className="btn btn-primary" onClick={handlePrint}><PrintIcon /> Print / PDF</button>
          <button className="btn btn-danger-outline" onClick={handleDelete} title="Delete invoice"><TrashIcon /> Delete</button>
        </div>
      </div>

      <article className="paper">
        <header className="paper-head">
          <div>
            <div className="paper-company">{COMPANY.name}</div>
            {addressLines(COMPANY.address).map((l) => <div key={l}>{l}</div>)}
            <div>Tel: {COMPANY.phone} · Mob: {COMPANY.mobile}</div>
            <div>Email: {COMPANY.email}</div>
            <div><strong>GSTIN:</strong> {COMPANY.gst}</div>
          </div>
          <div className="paper-title">TAX INVOICE</div>
        </header>

        <div className="paper-boxes">
          <div className="paper-box">
            <div className="paper-label">Bill to</div>
            <div className="paper-strong">{buyer.name || invoice.poCompany || '—'}</div>
            {addressLines(buyer.address).map((l) => <div key={l}>{l}</div>)}
            {buyer.gst && <div><strong>GSTIN:</strong> {buyer.gst}</div>}
            {buyerContact && <div>{buyerContact}</div>}
          </div>
          <div className="paper-box">
            <dl className="paper-dl">
              <dt>Invoice No.</dt><dd className="paper-strong">{invoice.invoiceNumber}</dd>
              <dt>Invoice Date</dt><dd>{formatDate(invoice.invoiceDate)}</dd>
              <dt>PO No.</dt><dd>{invoice.poNumber || '—'}</dd>
              <dt>PO Date</dt><dd>{formatDate(invoice.poDate)}</dd>
              <dt>Payment Terms</dt><dd>{invoice.paymentTerms || '—'}</dd>
              <dt>Currency</dt><dd>{invoice.currency}{taxLabel ? ` · ${taxLabel}` : ''}</dd>
            </dl>
          </div>
        </div>

        <table className="paper-table">
          <thead>
            <tr>
              <th className="col-sr">Sr.</th>
              <th>Description of Goods</th>
              <th>HSN</th>
              <th className="num">Qty</th>
              <th className="num">Rate</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it, i) => (
              <tr key={i}>
                <td className="col-sr">{i + 1}</td>
                <td>{it.description}</td>
                <td>{it.hsnCode || '—'}</td>
                <td className="num">{it.qty}</td>
                <td className="num">{formatMoney(it.rate, invoice.currency)}</td>
                <td className="num">{formatMoney(it.amount, invoice.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="paper-bottom">
          <div className="paper-left">
            <div className="paper-label">Amount in words</div>
            <div className="paper-strong">{amountInWords(totals.grandTotal, invoice.currency)}</div>

            <div className="paper-label paper-gap">Bank details</div>
            <dl className="paper-dl compact">
              <dt>Bank</dt><dd>{bank.bankName}</dd>
              <dt>A/c No.</dt><dd>{bank.accountNumber}</dd>
              <dt>IFSC</dt><dd>{bank.ifsc}</dd>
              <dt>Branch</dt><dd>{bank.branch}</dd>
            </dl>
          </div>
          <div className="paper-right">
            <InvoiceTotals totals={totals} taxType={invoice.taxType} currency={invoice.currency} />
          </div>
        </div>

        <footer className="paper-foot">
          <div className="paper-note">This is a computer-generated invoice.</div>
          <div className="paper-sign">
            <div>For <strong>{COMPANY.name}</strong></div>
            <div className="paper-sign-line">Authorised Signatory</div>
          </div>
        </footer>
      </article>
    </>
  );
}
