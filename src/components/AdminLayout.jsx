import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import Flash from './Flash';
import { ensureCompanySettings } from '../services/settings';
import { auth, isFirebaseConfigured } from '../firebase';
import { useAuth } from '../auth/useAuth';
import { CloseIcon, LogoutIcon, MenuIcon, SidebarIcon } from './Icons';

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
  // Phones: the menu is a drawer opened from the hamburger in the top bar
  const [menuOpen, setMenuOpen] = useState(false);

  // While the phone menu is open: Esc closes it and the page behind doesn't scroll
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [menuOpen]);

  // Choosing anything in the menu closes the phone drawer
  const closeMenuOnLink = (e) => {
    if (e.target.closest('a')) setMenuOpen(false);
  };

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
    <div className={`admin${open ? '' : ' sidebar-closed'}${menuOpen ? ' menu-open' : ''}`}>
      {/* Phones only: fixed top bar with the menu button */}
      <header className="mobile-topbar no-print">
        <button type="button" className="mobile-menu-btn" onClick={() => setMenuOpen(true)}
          aria-label="Open menu" aria-expanded={menuOpen} aria-controls="main-menu">
          <MenuIcon size={22} />
        </button>
        <Link to="/" className="sidebar-brand mobile-brand">
          <span className="brand-mark">SN</span> Enterprises
        </Link>
      </header>
      <div className="menu-backdrop no-print" onClick={() => setMenuOpen(false)} aria-hidden="true" />

      <aside className="sidebar no-print" aria-label="Main navigation" id="main-menu" onClick={closeMenuOnLink}>
        <div className="sidebar-top">
          <Link to="/" className="sidebar-brand" title="SN Enterprises">
            <span className="brand-mark">SN</span> <span className="sidebar-text">Enterprises</span>
          </Link>
          <button type="button" className="mobile-menu-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <CloseIcon size={20} />
          </button>
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
