import { formatDateTime, userLabel } from '../utils/audit';

/** Table cell content: who created the record, and when. */
export function CreatedByCell({ record }) {
  if (!record?.createdBy) return <span className="muted">—</span>;
  const name = userLabel(record.createdBy);
  return (
    <div className="created-by" title={`Created by ${record.createdBy.email || name} on ${formatDateTime(record.createdAt)}`}>
      <div className="created-by-name">{name}</div>
      <div className="muted small">{formatDateTime(record.createdAt)}</div>
    </div>
  );
}

/** One line for page headers: "Created by … on … · Last updated by … on …". */
export function AuditLine({ record }) {
  if (!record?.createdAt) return null;
  const created = record.createdBy ? `Created by ${userLabel(record.createdBy)}` : 'Created';
  const changed = record.updatedAt && record.updatedAt !== record.createdAt;
  return (
    <p className="audit-line">
      {created} on {formatDateTime(record.createdAt)}
      {changed && (
        <> · Last updated{record.updatedBy ? ` by ${userLabel(record.updatedBy)}` : ''} on {formatDateTime(record.updatedAt)}</>
      )}
    </p>
  );
}
