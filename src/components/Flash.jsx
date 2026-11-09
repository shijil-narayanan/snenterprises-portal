import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/** Short confirmation toast. Pages pass it via navigate(path, { state: { flash: 'Saved' } }). */
export default function Flash() {
  const location = useLocation();
  const [message, setMessage] = useState(location.state?.flash || '');

  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(() => setMessage(''), 3500);
    return () => clearTimeout(t);
  }, [message]);

  if (!message) return null;
  return <div className="flash no-print" role="status">✓ {message}</div>;
}
