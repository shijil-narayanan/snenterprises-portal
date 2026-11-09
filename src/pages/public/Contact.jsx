import { COMPANY } from '../../config/company';

export default function Contact() {
  return (
    <section className="container section prose">
      <h1>Contact Us</h1>
      <div className="card">
        <p><strong>Address:</strong> {COMPANY.address}</p>
        <p><strong>Phone:</strong> {COMPANY.phone}</p>
        <p><strong>Email:</strong> <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></p>
      </div>
    </section>
  );
}
