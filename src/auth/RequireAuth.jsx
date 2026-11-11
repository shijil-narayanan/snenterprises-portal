import { Navigate, useLocation } from 'react-router-dom';
import { isFirebaseConfigured } from '../firebase';
import { useAuth } from './useAuth';

/**
 * Shows its children only to signed-in users; everyone else is sent to the sign-in page
 * and brought back afterwards. In demo mode (no Firebase) there is nothing to protect.
 */
export default function RequireAuth({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!isFirebaseConfigured) return children;
  if (user === undefined) {
    return (
      <div className="auth-checking" role="status">
        <span className="spinner" /> Checking sign-in…
      </div>
    );
  }
  if (!user) {
    const next = location.pathname + location.search;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  return children;
}
