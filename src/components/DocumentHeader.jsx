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
 * `company` is the seller's details (an invoice's saved copy, or the current Settings).
 */
export default function DocumentHeader({ title, company, showIec = false }) {
  const a = company.address || {};
  const ids = [showIec && company.iec && `IEC : ${company.iec}`, company.gst && `GST: ${company.gst}`].filter(Boolean).join(', ');
  const cityLine = [[a.city, a.pincode].filter(Boolean).join(' '), a.state, a.country].filter(Boolean).join(', ');
  return (
    <>
      <div className="doc-title">{title}</div>
      <header className="doc-head">
        <img src={logo} alt={`${company.name} logo`} className="doc-logo" />
        <div className="doc-company">
          <div className="doc-company-name">{company.name}</div>
          {a.addressline1 && <div>{a.addressline1},</div>}
          {a.addressline2 && <div>{a.addressline2},</div>}
          {cityLine && <div>{cityLine}</div>}
          <div className="doc-contact">
            {company.mobile && <span><PhoneIcon /> {company.mobile}</span>}
            {company.phone && <span><PhoneIcon /> {company.phone}</span>}
            {company.email && <span><MailIcon /> {company.email}</span>}
          </div>
          {ids && <div>{ids}</div>}
        </div>
      </header>
    </>
  );
}
