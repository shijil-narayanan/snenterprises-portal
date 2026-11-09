import { Link, NavLink, Outlet } from 'react-router-dom';
import { isFirebaseConfigured } from '../firebase';

const tabs = [
  { to: '/admin', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/admin/tax-invoices', label: 'Tax Invoices', icon: '🧾' },
  { to: '/admin/commercial-invoices', label: 'Commercial Invoices', icon: '📄' },
  { section: 'Master Data' },
  { to: '/admin/companies', label: 'Companies', icon: '🏢' },
  { to: '/admin/products', label: 'Products', icon: '📦' },
];

export default function AdminLayout() {
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
          <Outlet />
        </div>
      </div>
    </div>
  );
}
