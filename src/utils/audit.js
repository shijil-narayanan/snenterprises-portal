// Display helpers for "created by / updated by" information on records.

/** Name to show for a user saved on a record: their display name, else their email. */
export const userLabel = (actor) => (actor ? actor.name || actor.email || 'Unknown user' : '');

/** ISO timestamp -> "11/11/2026, 14:05" */
export function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
