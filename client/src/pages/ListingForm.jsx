import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const EMPTY = {
  address: '',
  suburb: '',
  city: '',
  description: '',
  asking_price: '',
  bedrooms: '',
  bathrooms: '',
  floor_area: '',
  land_area: '',
  status: 'active',
  hero_image_url: '',
};

export default function ListingForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { api } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api(`/api/listings/${id}`)
      .then(data => {
        setForm({
          address: data.address || '',
          suburb: data.suburb || '',
          city: data.city || '',
          description: data.description || '',
          asking_price: data.asking_price || '',
          bedrooms: data.bedrooms ?? '',
          bathrooms: data.bathrooms ?? '',
          floor_area: data.floor_area ?? '',
          land_area: data.land_area ?? '',
          status: data.status || 'active',
          hero_image_url: data.hero_image_url || '',
        });
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.address.trim()) {
      setError('Address is required');
      return;
    }
    if (form.hero_image_url && !/^https?:\/\//i.test(form.hero_image_url.trim())) {
      setError('Hero image URL must start with http:// or https://');
      return;
    }

    const payload = {
      address: form.address.trim(),
      suburb: form.suburb.trim(),
      city: form.city.trim(),
      description: form.description.trim(),
      asking_price: form.asking_price.trim(),
      status: form.status,
      hero_image_url: form.hero_image_url.trim(),
    };
    for (const f of ['bedrooms', 'bathrooms', 'floor_area', 'land_area']) {
      const v = form[f];
      if (v === '' || v === null || v === undefined) {
        payload[f] = null;
      } else {
        const n = Number(v);
        if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
          setError(`${f.replace('_', ' ')} must be a non-negative whole number`);
          return;
        }
        payload[f] = n;
      }
    }

    setSaving(true);
    try {
      if (isEdit) {
        await api(`/api/listings/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        setSaved(true);
        setTimeout(() => setSaved(false), 4000);
      } else {
        const created = await api('/api/listings', { method: 'POST', body: JSON.stringify(payload) });
        navigate(`/listings/${created.id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Link to={isEdit ? `/listings/${id}` : '/listings'} className="text-sm text-primary hover:underline mb-4 inline-block">
        ← {isEdit ? 'Back to listing' : 'Back to listings'}
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {isEdit ? 'Edit listing' : 'New listing'}
        </h1>
        <p className="text-slate-500 mt-1">
          {isEdit ? 'Update property details and settings.' : 'Create a property to share with potential buyers.'}
        </p>
      </div>

      {saved && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 text-green-800 px-4 py-3 text-sm flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Saved
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-5">
        <div>
          <label className="label" htmlFor="address">Address *</label>
          <input
            id="address"
            className="input"
            value={form.address}
            onChange={e => update('address', e.target.value)}
            maxLength={200}
            required
            placeholder="12 Kauri Street"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="suburb">Suburb</label>
            <input
              id="suburb"
              className="input"
              value={form.suburb}
              onChange={e => update('suburb', e.target.value)}
              maxLength={120}
              placeholder="Remuera"
            />
          </div>
          <div>
            <label className="label" htmlFor="city">City</label>
            <input
              id="city"
              className="input"
              value={form.city}
              onChange={e => update('city', e.target.value)}
              maxLength={120}
              placeholder="Auckland"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea
            id="description"
            className="input"
            rows={4}
            value={form.description}
            onChange={e => update('description', e.target.value)}
            maxLength={5000}
            placeholder="Character, features, renovations, location highlights..."
          />
        </div>

        <div>
          <label className="label" htmlFor="asking_price">Asking price</label>
          <input
            id="asking_price"
            className="input"
            value={form.asking_price}
            onChange={e => update('asking_price', e.target.value)}
            maxLength={60}
            placeholder='e.g. "$1,250,000" or "By Negotiation"'
          />
          <p className="text-xs text-slate-500 mt-1">Free text — can be a range, a method of sale, or a figure.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="label" htmlFor="bedrooms">Bedrooms</label>
            <input
              id="bedrooms"
              type="number"
              min="0"
              className="input"
              value={form.bedrooms}
              onChange={e => update('bedrooms', e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="bathrooms">Bathrooms</label>
            <input
              id="bathrooms"
              type="number"
              min="0"
              className="input"
              value={form.bathrooms}
              onChange={e => update('bathrooms', e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="floor_area">Floor area (m²)</label>
            <input
              id="floor_area"
              type="number"
              min="0"
              className="input"
              value={form.floor_area}
              onChange={e => update('floor_area', e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="land_area">Land area (m²)</label>
            <input
              id="land_area"
              type="number"
              min="0"
              className="input"
              value={form.land_area}
              onChange={e => update('land_area', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="status">Status</label>
            <select
              id="status"
              className="input"
              value={form.status}
              onChange={e => update('status', e.target.value)}
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="sold">Sold</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="hero_image_url">Hero image URL</label>
            <input
              id="hero_image_url"
              type="url"
              className="input"
              value={form.hero_image_url}
              onChange={e => update('hero_image_url', e.target.value)}
              maxLength={500}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
          <Link to={isEdit ? `/listings/${id}` : '/listings'} className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : (isEdit ? 'Save changes' : 'Create listing')}
          </button>
        </div>
      </form>
    </div>
  );
}
