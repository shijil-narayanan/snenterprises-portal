import { COMPANY } from '../../config/company';
import { addressLines } from '../../utils/invoice';

export default function Contact() {
  return (
    <section className="container section prose">
      <h1>Contact Us</h1>
      <div className="card">
        <p><strong>Address:</strong> {addressLines(COMPANY.address).join(', ')}</p>
        <p><strong>Phone:</strong> {COMPANY.phone} · {COMPANY.mobile}</p>
        <p><strong>Email:</strong> <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></p>
      </div>
    </section>
  );
}
