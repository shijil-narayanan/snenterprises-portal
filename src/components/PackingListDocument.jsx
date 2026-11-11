import DocumentHeader from './DocumentHeader';
import { useCompany } from '../config/companySettings';
import { ExportMarksAndFoot, ExportPartiesAndShipping } from './export/ExportDocParts';
import { groupItemsByHsn } from '../utils/commercial';
import { formatQty, formatWeight, packingTotals, rowTotals, withPackageRanges } from '../utils/packing';

function BreakdownTable({ item }) {
  const rows = item.packing || [];
  return (
    <table className="pl-breakdown">
      <thead>
        <tr>
          <th>Total<br />Boxes</th><th>Pieces<br />per Box</th><th>NT.WT<br />kgs/Box</th><th>GR.WT<br />kgs/Box</th>
          <th>Total<br />NT.WT kgs</th><th>Total<br />GR.WT kgs</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const t = rowTotals(r);
          return (
            <tr key={i}>
              <td>{formatQty(r.boxes)}</td>
              <td>{formatQty(r.piecesPerBox)} {item.unit}</td>
              <td>{formatWeight(r.netPerBox)}</td>
              <td>{formatWeight(r.grossPerBox)}</td>
              <td>{formatWeight(t.net)}</td>
              <td>{formatWeight(t.gross)}</td>
            </tr>
          );
        })}
        <tr className="pl-breakdown-total">
          <td colSpan={4}>Total</td>
          <td>{formatWeight(item.totals.net)}</td>
          <td>{formatWeight(item.totals.gross)}</td>
        </tr>
      </tbody>
    </table>
  );
}

/**
 * Printable packing list (export). Same parties, shipping, marks and footer as the
 * commercial invoice; the item table shows packages, pieces and weights instead of prices.
 */
export default function PackingListDocument({ list, fillPage = false }) {
  const current = useCompany();
  const items = withPackageRanges(list.items || []);
  const groups = groupItemsByHsn(items);
  const totals = list.totals || packingTotals(list.items);
  const doc = { ...list, packages: list.packages || totals.boxes };
  const showItemLabels = items.length > 1;

  return (
    <article className={`paper ci-doc doc-a4${fillPage ? ' ci-fill' : ''}`}>
      <DocumentHeader title="Packing List" company={list.seller || current} showIec />
      <ExportPartiesAndShipping doc={doc} />

      <div className="ci-items pl-items">
        <div className="ci-row ci-items-head">
          <div className="ci-th">Packages</div>
          <div className="ci-th ci-left">Description</div>
          <div className="ci-th">No of Pieces</div>
          <div className="ci-th">NT. WT Kgs</div>
          <div className="ci-th">GR. WT Kgs</div>
        </div>
        {groups.map((group) => (
          <div key={group.hsn || 'no-hsn'}>
            {group.hsn && (
              <div className="ci-row">
                <div className="ci-cell" />
                <div className="ci-cell ci-left">HSN CODE: {group.hsn}</div>
                <div className="ci-cell" /><div className="ci-cell" /><div className="ci-cell" />
              </div>
            )}
            {group.items.map((it) => (
              <div className="ci-row ci-item" key={it.lineNo}>
                <div className="ci-cell">{it.packages || '—'}</div>
                <div className="ci-cell ci-left ci-desc"><span className="ci-no">{it.lineNo}.</span><span>{it.description}</span></div>
                <div className="ci-cell">{formatQty(it.totals.pieces)} {it.unit}</div>
                <div className="ci-cell">{formatWeight(it.totals.net)}</div>
                <div className="ci-cell">{formatWeight(it.totals.gross)}</div>
              </div>
            ))}
          </div>
        ))}
        {/* Filler keeps the column lines running; packing breakdown and notes sit at its bottom */}
        <div className="ci-row ci-filler">
          <div className="ci-cell" />
          <div className="ci-cell ci-left pl-bottom">
            {groups.flatMap((g) => g.items).map((it) => (
              <div key={it.lineNo} className="pl-breakdown-wrap">
                {showItemLabels && <div className="pl-breakdown-label">{it.lineNo}. {it.description}</div>}
                <BreakdownTable item={it} />
              </div>
            ))}
            {list.notes && <div className="ci-notes pl-notes">{list.notes}</div>}
          </div>
          <div className="ci-cell" /><div className="ci-cell" /><div className="ci-cell" />
        </div>
        <div className="ci-row pl-total">
          <div className="ci-cell" />
          <div className="ci-cell ci-strong">{formatWeight(totals.net)}</div>
          <div className="ci-cell ci-strong">{formatWeight(totals.gross)}</div>
        </div>
      </div>

      <ExportMarksAndFoot doc={doc} />
    </article>
  );
}
