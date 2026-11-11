import { formatDateTime, userLabel } from '../utils/audit';

/** "Emailed to … by … on …" for the latest send, with the earlier ones on hover. */
export default function EmailHistory({ emails }) {
  if (!emails?.length) return null;
  const sorted = [...emails].sort((a, b) => (b.sentAt || '').localeCompare(a.sentAt || ''));
  const line = (e) => `${e.to.join(', ')}${e.cc?.length ? ` (cc ${e.cc.join(', ')})` : ''}${e.sentBy ? ` by ${userLabel(e.sentBy)}` : ''} on ${formatDateTime(e.sentAt)}`;
  const latest = sorted[0];
  return (
    <p className="audit-line email-history" title={sorted.map((e) => `Emailed to ${line(e)}`).join('\n')}>
      ✉️ Emailed to {line(latest)}
      {sorted.length > 1 && <> · sent {sorted.length} times</>}
    </p>
  );
}
