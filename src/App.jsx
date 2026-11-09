import { Navigate, Route, Routes } from 'react-router-dom';
import PublicLayout from './components/PublicLayout';
import AdminLayout from './components/AdminLayout';
import Home from './pages/public/Home';
import About from './pages/public/About';
import Services from './pages/public/Services';
import Contact from './pages/public/Contact';
import Dashboard from './pages/admin/Dashboard';
import ComingSoon from './pages/admin/ComingSoon';
import TaxInvoiceList from './pages/admin/tax-invoices/TaxInvoiceList';
import TaxInvoiceForm from './pages/admin/tax-invoices/TaxInvoiceForm';
import TaxInvoiceView from './pages/admin/tax-invoices/TaxInvoiceView';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="services" element={<Services />} />
        <Route path="contact" element={<Contact />} />
      </Route>

      {/* TODO: wrap in an auth guard (Firebase Auth) before going live */}
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="tax-invoices" element={<TaxInvoiceList />} />
        <Route path="tax-invoices/new" element={<TaxInvoiceForm />} />
        <Route path="tax-invoices/:id" element={<TaxInvoiceView />} />
        <Route path="tax-invoices/:id/edit" element={<TaxInvoiceForm />} />
        <Route path="commercial-invoices" element={<ComingSoon title="Commercial Invoices" />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
