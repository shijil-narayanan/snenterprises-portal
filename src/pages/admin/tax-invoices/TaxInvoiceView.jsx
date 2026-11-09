import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteTaxInvoice, getTaxInvoice } from '../../../services/taxInvoices';
import { COMPANY } from '../../../config/company';
import { addressLines, computeTotals, formatDate, formatMoney } from '../../../utils/invoice';
import InvoiceTotals from './InvoiceTotals';

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
      navigate('/admin/tax-invoices');
    } catch (e) {
      setError(e.message);
    }
  };

  if (error) return <div className="alert alert-error">{error}</div>;
  if (invoice === undefined) return <p className="muted">Loading…</p>;
  if (invoice === null)
    return (
      <div className="card">
        <p>Invoice not found.</p>
        <Link to="/admin/tax-invoices">← Back to Tax Invoices</Link>
      </div>
    );

  const totals = invoice.totals || computeTotals(invoice.items, invoice.taxType);
  const buyer = invoice.buyer || {};

  return (
    <>
      <div className="toolbar no-print">
        <Link to="/admin/tax-invoices" className="btn">← Back</Link>
        <div className="toolbar-right">
          <button className="btn" onClick={() => window.print()}>Print / PDF</button>
          <Link to={`/admin/tax-invoices/${id}/edit`} className="btn btn-primary">Edit</Link>
          <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      <article className="card invoice-doc">
        <header className="invoice-doc-header">
          <div>
            <h2>{COMPANY.name}</h2>
            {addressLines(COMPANY.address).map((l) => <div key={l} className="muted">{l}</div>)}
            <div className="muted">Tel: {COMPANY.phone} · Mob: {COMPANY.mobile}</div>
            <div className="muted">Email: {COMPANY.email}</div>
            <div><strong>GSTIN:</strong> {COMPANY.gst}</div>
          </div>
          <h1 className="invoice-title">TAX INVOICE</h1>
        </header>

        <section className="bill-to">
          <h3>Bill To</h3>
          <div className="bill-to-name">{buyer.name || invoice.poCompany || '—'}</div>
          {addressLines(buyer.address).map((l) => <div key={l}>{l}</div>)}
          {buyer.gst && <div><strong>GSTIN:</strong> {buyer.gst}</div>}
        </section>

        <dl className="meta-grid">
          <div><dt>Invoice Number</dt><dd>{invoice.invoiceNumber}</dd></div>
          <div><dt>Invoice Date</dt><dd>{formatDate(invoice.invoiceDate)}</dd></div>
          <div><dt>PO Number</dt><dd>{invoice.poNumber || '—'}</dd></div>
          <div><dt>PO Date</dt><dd>{formatDate(invoice.poDate)}</dd></div>
          <div><dt>Currency</dt><dd>{invoice.currency}</dd></div>
          <div><dt>Payment Terms</dt><dd>{invoice.paymentTerms || '—'}</dd></div>
        </dl>

        <table className="table">
          <thead>
            <tr><th>#</th><th>Item</th><th>HSN</th><th className="num">Qty</th><th className="num">Rate</th><th className="num">Amount</th></tr>
          </thead>
          <tbody>
            {invoice.items.map((it, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{it.description}</td>
                <td>{it.hsnCode || '—'}</td>
                <td className="num">{it.qty}</td>
                <td className="num">{formatMoney(it.rate, invoice.currency)}</td>
                <td className="num">{formatMoney(it.amount, invoice.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <InvoiceTotals totals={totals} taxType={invoice.taxType} currency={invoice.currency} />

        <section className="bank-details">
          <h3>Bank Details</h3>
          <div>Bank: {COMPANY.bankDetails.bankName}</div>
          <div>A/c No: {COMPANY.bankDetails.accountNumber}</div>
          <div>IFSC: {COMPANY.bankDetails.ifsc}</div>
          <div>Branch: {COMPANY.bankDetails.branch}</div>
        </section>
      </article>
    </>
  );
}
