import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AddressAutocomplete from '../components/AddressAutocomplete';
import ListingSkeleton from '../components/ListingSkeleton';
import PhotoManager from '../components/PhotoManager';

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
  latitude: null,
  longitude: null,
  legal_description: '',
  land_area_m2: null,
  parcel_titles: '',
  tenure_type: '',
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
  const [dirty, setDirty] = useState(false);
  const [heroPreviewError, setHeroPreviewError] = useState(false);
  const [images, setImages] = useState([]);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    api(`/api/listings/${id}`)
      .then(data => {
        if (cancelled) return;
        setImages(Array.isArray(data.images) ? data.images : []);
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
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
          legal_description: data.legal_description || '',
          land_area_m2: data.land_area_m2 ?? null,
          parcel_titles: data.parcel_titles || '',
          tenure_type: data.tenure_type || '',
        });
      })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, isEdit, api]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSaved(false);
    setDirty(true);
    if (field === 'hero_image_url') setHeroPreviewError(false);
  };

  const handleAddressSelect = (picked) => {
    setForm(prev => ({
      ...prev,
      address: picked.address,
      suburb: picked.suburb || prev.suburb,
      city: picked.city || prev.city,
      latitude: picked.latitude,
      longitude: picked.longitude,
      legal_description: picked.legal_description || prev.legal_description,
      land_area:
        picked.land_area_m2 != null && (prev.land_area === '' || prev.land_area == null)
          ? picked.land_area_m2
          : prev.land_area,
      land_area_m2: picked.land_area_m2 ?? prev.land_area_m2,
      parcel_titles:
        Array.isArray(picked.title_references) && picked.title_references.length
          ? picked.title_references.join(', ')
          : prev.parcel_titles,
      tenure_type: picked.tenure_type || prev.tenure_type,
    }));
    setSaved(false);
    setDirty(true);
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
      legal_description: form.legal_description.trim(),
      latitude: form.latitude,
      longitude: form.longitude,
      land_area_m2: form.land_area_m2 ?? null,
      parcel_titles: form.parcel_titles ? form.parcel_titles.trim() : null,
      tenure_type: form.tenure_type || null,
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
        setDirty(false);
        setTimeout(() => setSaved(false), 4000);
      } else {
        const created = await api('/api/listings', { method: 'POST', body: JSON.stringify(payload) });
        setDirty(false);
        navigate(`/listings/${created.id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ListingSkeleton variant="form" />;
  }

  const heroUrl = form.hero_image_url.trim();
  const heroPreviewable = heroUrl && /^https?:\/\//i.test(heroUrl) && !heroPreviewError;

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

      {isEdit && (
        <div className="card mb-6">
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-slate-900">Photos</h2>
            <p className="text-xs text-slate-500 mt-0.5">The cover photo shows first on the public listing. Drag to reorder.</p>
          </div>
          <PhotoManager
            listingId={id}
            images={images}
            onChange={setImages}
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-5">
        {!isEdit && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 text-blue-900 px-4 py-3 text-sm">
            Create the listing first, then come back to add photos.
          </div>
        )}
        <div>
          <label className="label" htmlFor="address">Address *</label>
          <AddressAutocomplete
            value={form.address}
            onChange={v => update('address', v)}
            onSelect={handleAddressSelect}
            placeholder="Start typing — e.g. 99 Queen Street"
          />
          <p className="text-xs text-slate-500 mt-1">Type 3+ characters to see NZ address suggestions. Suburb, city, land area and legal description auto-fill when you pick one.</p>
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
          <label className="label" htmlFor="legal_description">Legal description</label>
          <input
            id="legal_description"
            className="input"
            value={form.legal_description}
            onChange={e => update('legal_description', e.target.value)}
            maxLength={500}
            placeholder='e.g. "Lot 2 Deposited Plan 123456"'
          />
          <p className="text-xs text-slate-500 mt-1">Auto-filled from LINZ when you pick an address. Editable.</p>
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
            <label className="label" htmlFor="hero_image_url">Hero image URL (fallback)</label>
            <input
              id="hero_image_url"
              type="url"
              className="input"
              value={form.hero_image_url}
              onChange={e => update('hero_image_url', e.target.value)}
              maxLength={500}
              placeholder="https://..."
            />
            <p className="text-xs text-slate-500 mt-1">Only shown if no photos uploaded above.</p>
            {heroUrl && (
              heroPreviewable ? (
                <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                  <img
                    src={heroUrl}
                    alt="Hero preview"
                    className="w-full max-h-32 object-cover"
                    onError={() => setHeroPreviewError(true)}
                  />
                </div>
              ) : heroPreviewError ? (
                <p className="text-xs text-amber-700 mt-2">Could not load image — check the URL.</p>
              ) : null
            )}
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
