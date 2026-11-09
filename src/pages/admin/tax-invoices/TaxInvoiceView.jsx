import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteTaxInvoice, getTaxInvoice } from '../../../services/taxInvoices';
import { COMPANY } from '../../../config/company';
import { computeTotals, formatDate, formatMoney } from '../../../utils/invoice';
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
            <div className="muted">{COMPANY.address}</div>
            <div className="muted">GSTIN: {COMPANY.gstin}</div>
          </div>
          <h1 className="invoice-title">TAX INVOICE</h1>
        </header>

        <dl className="meta-grid">
          <div><dt>Invoice Number</dt><dd>{invoice.invoiceNumber}</dd></div>
          <div><dt>Invoice Date</dt><dd>{formatDate(invoice.invoiceDate)}</dd></div>
          <div><dt>PO Number</dt><dd>{invoice.poNumber || '—'}</dd></div>
          <div><dt>PO Date</dt><dd>{formatDate(invoice.poDate)}</dd></div>
          <div><dt>PO Company</dt><dd>{invoice.poCompany || '—'}</dd></div>
          <div><dt>Currency</dt><dd>{invoice.currency}</dd></div>
          <div><dt>Payment Terms</dt><dd>{invoice.paymentTerms || '—'}</dd></div>
        </dl>

        <table className="table">
          <thead>
            <tr><th>#</th><th>Item</th><th className="num">Qty</th><th className="num">Rate</th><th className="num">Amount</th></tr>
          </thead>
          <tbody>
            {invoice.items.map((it, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{it.description}</td>
                <td className="num">{it.qty}</td>
                <td className="num">{formatMoney(it.rate, invoice.currency)}</td>
                <td className="num">{formatMoney(it.amount, invoice.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <InvoiceTotals totals={totals} taxType={invoice.taxType} currency={invoice.currency} />
      </article>
    </>
  );
}
