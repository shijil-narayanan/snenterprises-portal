import { useCompany } from '../config/companySettings';

/**
 * The signature area of a document: "For <company>", the uploaded signature and stamp
 * (from Settings, when switched on), and "Authorised Signatory".
 * variant: 'tax' (right-aligned, with a signing line), 'export' (centred, fills the box)
 * or 'declaration' (left-aligned, signed as Proprietor).
 */
export default function SignatureBlock({ companyName, variant }) {
  const { signatureImage, stampImage, signOnDocuments } = useCompany();
  const show = signOnDocuments !== false && (signatureImage || stampImage);
  const marks = show ? (
    <div className="sig-marks">
      {stampImage && <img src={stampImage} alt="Company stamp" className="sig-stamp" />}
      {signatureImage && <img src={signatureImage} alt="Signature" className="sig-image" />}
    </div>
  ) : null;

  if (variant === 'declaration') {
    // Left-aligned, signed as Proprietor (Export Value Declaration)
    return (
      <div className="decl-sign">
        <div className="decl-sign-for">For {companyName}</div>
        {marks || <div className="decl-sign-space" />}
        <div className="decl-sign-role">Proprietor</div>
      </div>
    );
  }
  if (variant === 'export') {
    return (
      <div className="ci-sign">
        <div>For {companyName}</div>
        {marks}
        <div className="ci-strong">Authorised Signatory</div>
      </div>
    );
  }
  return (
    <div className="paper-sign">
      <div>For <strong>{companyName}</strong></div>
      {marks || <div className="sig-space" />}
      <div className={`paper-sign-line${marks ? ' signed' : ''}`}>Authorised Signatory</div>
    </div>
  );
}
