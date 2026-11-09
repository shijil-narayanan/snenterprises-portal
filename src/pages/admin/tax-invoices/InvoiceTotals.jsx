import { formatMoney } from '../../../utils/invoice';

export default function InvoiceTotals({ totals, taxType, currency }) {
  const rows = [
    ['Sub Total', totals.subTotal],
    ...(taxType === 'IGST'
      ? [['IGST 18%', totals.igst]]
      : [['SGST 9%', totals.sgst], ['CGST 9%', totals.cgst]]),
  ];
  return (
    <div className="totals">
      {rows.map(([label, value]) => (
        <div className="totals-row" key={label}>
          <span>{label}</span>
          <span>{formatMoney(value, currency)}</span>
        </div>
      ))}
      <div className="totals-row grand">
        <span>Grand Total</span>
        <span>{formatMoney(totals.grandTotal, currency)}</span>
      </div>
    </div>
  );
}
