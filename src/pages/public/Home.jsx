import { Link } from 'react-router-dom';
import { COMPANY } from '../../config/company';

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>{COMPANY.name}</h1>
          <p className="lead">{COMPANY.tagline}</p>
          <div className="hero-actions">
            <Link to="/services" className="btn btn-light">Our Services</Link>
            <Link to="/contact" className="btn btn-outline-light">Get in touch</Link>
          </div>
        </div>
      </section>
      <section className="container section">
        <div className="feature-grid">
          <div className="card">
            <h3>Quality products</h3>
            <p>Electrical and industrial components sourced from trusted manufacturers.</p>
          </div>
          <div className="card">
            <h3>On-time delivery</h3>
            <p>Dependable logistics for domestic and export orders.</p>
          </div>
          <div className="card">
            <h3>Transparent billing</h3>
            <p>GST-compliant tax invoices, commercial invoices and packing lists.</p>
          </div>
        </div>
      </section>
    </>
  );
}
