import { useState } from 'react';

/** Shown on an empty list: lets the user load the default records in one click. */
export default function ImportDefaults({ label, items, service, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleImport = async () => {
    setBusy(true);
    setError('');
    try {
      await service.createMany(items);
      onDone();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="empty-state">
      <p className="muted">No {label} yet. Add one, or import the default list of {items.length} {label}.</p>
      <button className="btn btn-primary" onClick={handleImport} disabled={busy}>
        {busy ? 'Importing…' : `Import default ${label} (${items.length})`}
      </button>
      {error && <div className="alert alert-error">{error}</div>}
    </div>
  );
}
