import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { productsService } from '../../../services/products';

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState({ code: '', name: '', hsnCode: '' });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    productsService
      .get(id)
      .then((p) => {
        if (!p) throw new Error('Product not found');
        setForm({ code: p.code || '', name: p.name || '', hsnCode: p.hsnCode || '' });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const setField = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isEdit) await productsService.update(id, form);
      else await productsService.create(form);
      navigate('/admin/products');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) return <p className="muted">Loading…</p>;

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="card-header">
        <h1>{isEdit ? 'Edit Product' : 'New Product'}</h1>
        <Link to="/admin/products" className="btn">Cancel</Link>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="form-row">
        <label className="field">
          <span>Product Code</span>
          <input className="input" value={form.code} onChange={setField('code')} placeholder="e.g. BJC00002" />
        </label>
        <label className="field">
          <span>HSN Code</span>
          <input className="input" value={form.hsnCode} onChange={setField('hsnCode')} placeholder="e.g. 73089090" />
        </label>
      </div>
      <div className="form-row">
        <label className="field field-wide">
          <span>Product Name / Description *</span>
          <textarea className="input" rows={3} required value={form.name} onChange={setField('name')} />
        </label>
      </div>
      <div className="form-actions">
        <Link to="/admin/products" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Update Product' : 'Save Product'}
        </button>
      </div>
    </form>
  );
}
