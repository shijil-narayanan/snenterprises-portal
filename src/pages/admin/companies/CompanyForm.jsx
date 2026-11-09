import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { companiesService, toCompanyRecord } from '../../../services/companies';

const SECTIONS = [
  {
    title: 'Company',
    fields: [
      ['name', 'Company Name', { required: true, wide: true }],
      ['gst', 'GSTIN'],
    ],
  },
  {
    title: 'Address',
    fields: [
      ['address.addressline1', 'Address Line 1', { wide: true }],
      ['address.addressline2', 'Address Line 2', { wide: true }],
      ['address.city', 'City'],
      ['address.state', 'State'],
      ['address.pincode', 'Pincode / PO Box'],
      ['address.country', 'Country'],
    ],
  },
  {
    title: 'Contact',
    fields: [
      ['phone', 'Phone'],
      ['mobile', 'Mobile'],
      ['fax', 'Fax'],
      ['email', 'Email', { type: 'email' }],
    ],
  },
  {
    title: 'Shipping (export)',
    fields: [
      ['portOfDischarge', 'Port of Discharge'],
      ['finalDestinationPort', 'Final Destination Port'],
      ['countryOfFinalDestination', 'Country of Final Destination'],
    ],
  },
];

const getPath = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj) ?? '';

export default function CompanyForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(() => toCompanyRecord({}));
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    companiesService
      .get(id)
      .then((c) => {
        if (!c) throw new Error('Company not found');
        setForm(toCompanyRecord(c));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const setValue = (path, value) =>
    setForm((f) => {
      if (!path.startsWith('address.')) return { ...f, [path]: value };
      return { ...f, address: { ...f.address, [path.slice(8)]: value } };
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isEdit) await companiesService.update(id, form);
      else await companiesService.create(form);
      navigate('/admin/companies');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) return <p className="muted">Loading…</p>;

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="card-header">
        <h1>{isEdit ? 'Edit Company' : 'New Company'}</h1>
        <Link to="/admin/companies" className="btn">Cancel</Link>
      </div>
      {error && <div className="alert alert-error">{error}</div>}

      {SECTIONS.map((section) => (
        <fieldset key={section.title} className="form-section">
          <legend>{section.title}</legend>
          <div className="form-row">
            {section.fields.map(([path, label, opts = {}]) => (
              <label key={path} className={`field${opts.wide ? ' field-wide' : ''}`}>
                <span>{label}{opts.required && ' *'}</span>
                <input
                  className="input"
                  type={opts.type || 'text'}
                  required={opts.required}
                  value={getPath(form, path)}
                  onChange={(e) => setValue(path, e.target.value)}
                />
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <div className="form-actions">
        <Link to="/admin/companies" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Update Company' : 'Save Company'}
        </button>
      </div>
    </form>
  );
}
