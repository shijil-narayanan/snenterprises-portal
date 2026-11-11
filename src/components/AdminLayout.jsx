import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import Flash from './Flash';
import { auth, isFirebaseConfigured } from '../firebase';
import { useAuth } from '../auth/useAuth';

const tabs = [
  { to: '/admin', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/admin/tax-invoices', label: 'Tax Invoices', icon: '🧾' },
  { to: '/admin/commercial-invoices', label: 'Commercial Invoices', icon: '📄' },
  { to: '/admin/packing-lists', label: 'Packing Lists', icon: '📦' },
  { section: 'Master Data' },
  { to: '/admin/companies', label: 'Companies', icon: '🏢' },
  { to: '/admin/products', label: 'Products', icon: '🏷️' },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/login', { replace: true });
  };
  return (
    <div className="admin">
      <aside className="sidebar no-print">
        <Link to="/admin" className="sidebar-brand">
          <span className="brand-mark">SN</span> Portal
        </Link>
        <nav>
          {tabs.map((t) =>
            t.section ? (
              <div key={t.section} className="sidebar-section">{t.section}</div>
            ) : (
              <NavLink key={t.to} to={t.to} end={t.end} className="sidebar-link">
                <span aria-hidden="true">{t.icon}</span> {t.label}
              </NavLink>
            ),
          )}
        </nav>
        {user && (
          <div className="sidebar-user">
            <div className="sidebar-user-email" title={user.email}>{user.email}</div>
            <button type="button" className="sidebar-signout" onClick={handleSignOut}>Sign out</button>
          </div>
        )}
        <Link to="/" className="sidebar-footer">← Back to website</Link>
      </aside>
      <div className="admin-main">
        {!isFirebaseConfigured && (
          <div className="banner no-print">
            Demo mode: Firebase is not configured, so data is saved only in this browser.
            Add your keys to <code>.env.local</code> to use Firestore.
          </div>
        )}
        <div className="admin-content">
          <Flash key={location.key} />
          <Outlet />
        </div>
      </div>
    </div>
  );
}
