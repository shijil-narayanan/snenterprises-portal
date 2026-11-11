import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import Flash from './Flash';
import { ensureCompanySettings } from '../services/settings';
import { auth, isFirebaseConfigured } from '../firebase';
import { useAuth } from '../auth/useAuth';
import { LogoutIcon, SidebarIcon } from './Icons';

// Sidebar open/closed is remembered per browser (open by default)
const SIDEBAR_KEY = 'sn.sidebarOpen';
const readSidebarOpen = () => {
  try {
    return localStorage.getItem(SIDEBAR_KEY) !== 'false';
  } catch {
    return true;
  }
};

const tabs = [
  { to: '/', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/tax-invoices', label: 'Tax Invoices', icon: '🧾' },
  { to: '/commercial-invoices', label: 'Commercial Invoices', icon: '📄' },
  { to: '/packing-lists', label: 'Packing Lists', icon: '📦' },
  { section: 'Master Data' },
  { to: '/companies', label: 'Companies', icon: '🏢' },
  { to: '/products', label: 'Products', icon: '🏷️' },
  { section: 'Setup' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(readSidebarOpen);

  const toggleSidebar = () =>
    setOpen((o) => {
      try {
        localStorage.setItem(SIDEBAR_KEY, String(!o));
      } catch {
        // storage unavailable: the choice just isn't remembered
      }
      return !o;
    });

  // Load the company details saved in Settings (used on invoices and PDFs)
  useEffect(() => {
    ensureCompanySettings();
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/login', { replace: true });
  };
  return (
    <div className={`admin${open ? '' : ' sidebar-closed'}`}>
      <aside className="sidebar no-print" aria-label="Main navigation">
        <div className="sidebar-top">
          <Link to="/" className="sidebar-brand" title="SN Enterprises">
            <span className="brand-mark">SN</span> <span className="sidebar-text">Enterprises</span>
          </Link>
          <button type="button" className="sidebar-toggle" onClick={toggleSidebar}
            aria-expanded={open} aria-label={open ? 'Close sidebar' : 'Open sidebar'} title={open ? 'Close sidebar' : 'Open sidebar'}>
            <SidebarIcon size={18} />
          </button>
        </div>
        <nav>
          {tabs.map((t) =>
            t.section ? (
              <div key={t.section} className="sidebar-section"><span className="sidebar-text">{t.section}</span></div>
            ) : (
              <NavLink key={t.to} to={t.to} end={t.end} className="sidebar-link" title={open ? undefined : t.label}>
                <span aria-hidden="true" className="sidebar-icon">{t.icon}</span>
                <span className="sidebar-text">{t.label}</span>
              </NavLink>
            ),
          )}
        </nav>
        {user && (
          <div className="sidebar-user">
            <div className="sidebar-user-email sidebar-text" title={user.email}>{user.email}</div>
            <button type="button" className="sidebar-signout" onClick={handleSignOut} title={`Sign out (${user.email})`}>
              <LogoutIcon size={14} /> <span className="sidebar-text">Sign out</span>
            </button>
          </div>
        )}
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
