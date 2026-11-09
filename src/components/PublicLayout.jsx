import { Link, NavLink, Outlet } from 'react-router-dom';
import { COMPANY } from '../config/company';

const YEAR = new Date().getFullYear();

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About Us' },
  { to: '/services', label: 'Services' },
  { to: '/contact', label: 'Contact Us' },
];

export default function PublicLayout() {
  return (
    <div className="public">
      <header className="public-header">
        <div className="container public-header-inner">
          <Link to="/" className="brand">
            <span className="brand-mark">SN</span> {COMPANY.name}
          </Link>
          <nav className="public-nav">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end}>
                {l.label}
              </NavLink>
            ))}
            <Link to="/admin" className="btn btn-primary btn-sm">
              Portal
            </Link>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="public-footer">
        <div className="container">
          © {YEAR} {COMPANY.name}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
