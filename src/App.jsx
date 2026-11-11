import { Navigate, Route, Routes } from 'react-router-dom';
import PublicLayout from './components/PublicLayout';
import AdminLayout from './components/AdminLayout';
import Home from './pages/public/Home';
import About from './pages/public/About';
import Services from './pages/public/Services';
import Contact from './pages/public/Contact';
import Login from './pages/Login';
import RequireAuth from './auth/RequireAuth';
import Dashboard from './pages/admin/Dashboard';
import TaxInvoiceList from './pages/admin/tax-invoices/TaxInvoiceList';
import TaxInvoiceForm from './pages/admin/tax-invoices/TaxInvoiceForm';
import TaxInvoiceView from './pages/admin/tax-invoices/TaxInvoiceView';
import CommercialInvoiceList from './pages/admin/commercial-invoices/CommercialInvoiceList';
import CommercialInvoiceForm from './pages/admin/commercial-invoices/CommercialInvoiceForm';
import CommercialInvoiceView from './pages/admin/commercial-invoices/CommercialInvoiceView';
import PackingListList from './pages/admin/packing-lists/PackingListList';
import PackingListForm from './pages/admin/packing-lists/PackingListForm';
import PackingListView from './pages/admin/packing-lists/PackingListView';
import CompanyList from './pages/admin/companies/CompanyList';
import CompanyForm from './pages/admin/companies/CompanyForm';
import ProductList from './pages/admin/products/ProductList';
import ProductForm from './pages/admin/products/ProductForm';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="services" element={<Services />} />
        <Route path="contact" element={<Contact />} />
      </Route>

      <Route path="login" element={<Login />} />

      {/* Portal: signed-in users only */}
      <Route path="admin" element={<RequireAuth><AdminLayout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="tax-invoices" element={<TaxInvoiceList />} />
        <Route path="tax-invoices/new" element={<TaxInvoiceForm />} />
        <Route path="tax-invoices/:id" element={<TaxInvoiceView />} />
        <Route path="tax-invoices/:id/edit" element={<TaxInvoiceForm />} />
        <Route path="commercial-invoices" element={<CommercialInvoiceList />} />
        <Route path="commercial-invoices/new" element={<CommercialInvoiceForm />} />
        <Route path="commercial-invoices/:id" element={<CommercialInvoiceView />} />
        <Route path="commercial-invoices/:id/edit" element={<CommercialInvoiceForm />} />
        <Route path="packing-lists" element={<PackingListList />} />
        <Route path="packing-lists/new" element={<PackingListForm />} />
        <Route path="packing-lists/:id" element={<PackingListView />} />
        <Route path="packing-lists/:id/edit" element={<PackingListForm />} />
        <Route path="companies" element={<CompanyList />} />
        <Route path="companies/new" element={<CompanyForm />} />
        <Route path="companies/:id/edit" element={<CompanyForm />} />
        <Route path="products" element={<ProductList />} />
        <Route path="products/new" element={<ProductForm />} />
        <Route path="products/:id/edit" element={<ProductForm />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
