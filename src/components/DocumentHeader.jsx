import { COMPANY } from '../config/company';
import logo from '../assets/logo.png';

const PhoneIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1Z" />
  </svg>
);
const MailIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M2 5h20v14H2V5Zm2 2v.5l8 5 8-5V7H4Z" />
  </svg>
);

/**
 * Shared header for printed documents: centred title, logo on the left,
 * company details on the right (same layout as the commercial invoice sample).
 */
export default function DocumentHeader({ title, showIec = false }) {
  const a = COMPANY.address;
  const ids = [showIec && `IEC : ${COMPANY.iec}`, `GST: ${COMPANY.gst}`].filter(Boolean).join(', ');
  return (
    <>
      <div className="doc-title">{title}</div>
      <header className="doc-head">
        <img src={logo} alt={`${COMPANY.name} logo`} className="doc-logo" />
        <div className="doc-company">
          <div className="doc-company-name">{COMPANY.name}</div>
          <div>{a.addressline1},</div>
          <div>{a.addressline2},</div>
          <div>{a.city} {a.pincode}, {a.country}</div>
          <div className="doc-contact">
            <span><PhoneIcon /> {COMPANY.mobile}</span>
            <span><MailIcon /> {COMPANY.email}</span>
          </div>
          <div>{ids}</div>
        </div>
      </header>
    </>
  );
}
