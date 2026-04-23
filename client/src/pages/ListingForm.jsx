import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AddressAutocomplete from '../components/AddressAutocomplete';
import ListingSkeleton from '../components/ListingSkeleton';
import PhotoManager from '../components/PhotoManager';
import OpenHomesEditor from '../components/OpenHomesEditor';

const CONSTRUCTION_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'weatherboard', label: 'Weatherboard' },
  { value: 'brick', label: 'Brick' },
  { value: 'plaster', label: 'Plaster' },
  { value: 'mixed', label: 'Mixed materials' },
  { value: 'other', label: 'Other' },
];

const SALE_METHOD_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'price', label: 'Price' },
  { value: 'by_negotiation', label: 'By Negotiation' },
  { value: 'auction', label: 'Auction' },
  { value: 'tender', label: 'Tender' },
  { value: 'deadline_sale', label: 'Deadline Sale' },
];

const TENURE_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'freehold', label: 'Freehold' },
  { value: 'leasehold', label: 'Leasehold' },
  { value: 'cross_lease', label: 'Cross Lease' },
  { value: 'unit_title', label: 'Unit Title' },
  { value: 'unknown', label: 'Unknown' },
];

const SALE_METHODS_WITH_DEADLINE = new Set(['auction', 'tender', 'deadline_sale']);

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
  year_built: '',
  construction_type: '',
  chattels: '',
  rates_annual: '',
  capital_value: '',
  matterport_url: '',
  youtube_url: '',
  floor_plan_url: '',
  sale_method: '',
  sale_deadline_at: '',
};

function toLocalInputValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
  const [openHomes, setOpenHomes] = useState([]);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    api(`/api/listings/${id}`)
      .then(data => {
        if (cancelled) return;
        setImages(Array.isArray(data.images) ? data.images : []);
        setOpenHomes(Array.isArray(data.open_homes) ? data.open_homes : []);
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
          year_built: data.year_built ?? '',
          construction_type: data.construction_type || '',
          chattels: data.chattels || '',
          rates_annual: data.rates_annual || '',
          capital_value: data.capital_value || '',
          matterport_url: data.matterport_url || '',
          youtube_url: data.youtube_url || '',
          floor_plan_url: data.floor_plan_url || '',
          sale_method: data.sale_method || '',
          sale_deadline_at: toLocalInputValue(data.sale_deadline_at),
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
    for (const field of ['matterport_url', 'youtube_url', 'floor_plan_url']) {
      const v = (form[field] || '').trim();
      if (v && !/^https?:\/\//i.test(v)) {
        setError(`${field.replace(/_/g, ' ')} must start with http:// or https://`);
        return;
      }
    }
    if (form.sale_method && SALE_METHODS_WITH_DEADLINE.has(form.sale_method) && !form.sale_deadline_at) {
      // not required, just a nudge
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
      construction_type: form.construction_type || null,
      chattels: (form.chattels || '').trim(),
      rates_annual: (form.rates_annual || '').trim(),
      capital_value: (form.capital_value || '').trim(),
      matterport_url: (form.matterport_url || '').trim(),
      youtube_url: (form.youtube_url || '').trim(),
      floor_plan_url: (form.floor_plan_url || '').trim(),
      sale_method: form.sale_method || null,
      sale_deadline_at: form.sale_deadline_at ? new Date(form.sale_deadline_at).toISOString() : null,
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

    if (form.year_built === '' || form.year_built === null || form.year_built === undefined) {
      payload.year_built = null;
    } else {
      const n = Number(form.year_built);
      const currentYear = new Date().getFullYear();
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1800 || n > currentYear + 5) {
        setError(`Year built must be a year between 1800 and ${currentYear + 5}`);
        return;
      }
      payload.year_built = n;
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
  const showDeadline = SALE_METHODS_WITH_DEADLINE.has(form.sale_method);

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

      <form onSubmit={handleSubmit} className="space-y-6">
        {!isEdit && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 text-blue-900 px-4 py-3 text-sm">
            Create the listing first, then come back to add photos and open home times.
          </div>
        )}

        {/* Essentials */}
        <section className="card space-y-5">
          <header>
            <h2 className="text-lg font-semibold text-slate-900">Essentials</h2>
            <p className="text-xs text-slate-500 mt-0.5">Address, description, and status.</p>
          </header>

          <div>
            <label className="label" htmlFor="address">Address *</label>
            <AddressAutocomplete
              value={form.address}
              onChange={v => update('address', v)}
              onSelect={handleAddressSelect}
              placeholder="Start typing — e.g. 99 Queen Street"
            />
            <p className="text-xs text-slate-500 mt-1">Type 3+ characters to see NZ address suggestions. Suburb, city, land area, legal description, parcel titles and tenure all auto-fill when you pick one.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="suburb">Suburb</label>
              <input id="suburb" className="input" value={form.suburb} onChange={e => update('suburb', e.target.value)} maxLength={120} placeholder="Remuera"/>
            </div>
            <div>
              <label className="label" htmlFor="city">City</label>
              <input id="city" className="input" value={form.city} onChange={e => update('city', e.target.value)} maxLength={120} placeholder="Auckland"/>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="description">Description</label>
            <textarea id="description" className="input" rows={4}
              value={form.description}
              onChange={e => update('description', e.target.value)}
              maxLength={5000}
              placeholder="Character, features, renovations, location highlights..."/>
          </div>

          <div>
            <label className="label" htmlFor="status">Status</label>
            <select id="status" className="input" value={form.status} onChange={e => update('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="sold">Sold</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">Only "active" listings are visible to the public.</p>
          </div>
        </section>

        {/* Sale method */}
        <section className="card space-y-5">
          <header>
            <h2 className="text-lg font-semibold text-slate-900">Sale method</h2>
            <p className="text-xs text-slate-500 mt-0.5">How the property is being sold, and what buyers should look for.</p>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="sale_method">Sale method</label>
              <select id="sale_method" className="input" value={form.sale_method} onChange={e => update('sale_method', e.target.value)}>
                {SALE_METHOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {showDeadline && (
              <div>
                <label className="label" htmlFor="sale_deadline_at">Deadline / auction time</label>
                <input id="sale_deadline_at" type="datetime-local" className="input"
                  value={form.sale_deadline_at}
                  onChange={e => update('sale_deadline_at', e.target.value)}/>
                <p className="text-xs text-slate-500 mt-1">When the auction starts, or when tenders/deadline offers close.</p>
              </div>
            )}
          </div>

          <div>
            <label className="label" htmlFor="asking_price">Asking price / price note</label>
            <input id="asking_price" className="input"
              value={form.asking_price}
              onChange={e => update('asking_price', e.target.value)}
              maxLength={60}
              placeholder='e.g. "$1,250,000", "Enquiries over $2.3M" or "By Negotiation"'/>
            <p className="text-xs text-slate-500 mt-1">Free text — shown alongside the sale method badge.</p>
          </div>
        </section>

        {/* Specs */}
        <section className="card space-y-5">
          <header>
            <h2 className="text-lg font-semibold text-slate-900">Specs</h2>
            <p className="text-xs text-slate-500 mt-0.5">Beds, baths, floor area and land area.</p>
          </header>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="label" htmlFor="bedrooms">Bedrooms</label>
              <input id="bedrooms" type="number" min="0" className="input" value={form.bedrooms} onChange={e => update('bedrooms', e.target.value)}/>
            </div>
            <div>
              <label className="label" htmlFor="bathrooms">Bathrooms</label>
              <input id="bathrooms" type="number" min="0" className="input" value={form.bathrooms} onChange={e => update('bathrooms', e.target.value)}/>
            </div>
            <div>
              <label className="label" htmlFor="floor_area">Floor area (m²)</label>
              <input id="floor_area" type="number" min="0" className="input" value={form.floor_area} onChange={e => update('floor_area', e.target.value)}/>
            </div>
            <div>
              <label className="label" htmlFor="land_area">Land area (m²)</label>
              <input id="land_area" type="number" min="0" className="input" value={form.land_area} onChange={e => update('land_area', e.target.value)}/>
            </div>
          </div>
        </section>

        {/* About the home */}
        <section className="card space-y-5">
          <header>
            <h2 className="text-lg font-semibold text-slate-900">About the home</h2>
            <p className="text-xs text-slate-500 mt-0.5">Construction details and what's staying with the property.</p>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="year_built">Year built</label>
              <input id="year_built" type="number" min="1800" className="input"
                value={form.year_built}
                onChange={e => update('year_built', e.target.value)}
                placeholder="e.g. 1998"/>
            </div>
            <div>
              <label className="label" htmlFor="construction_type">Construction</label>
              <select id="construction_type" className="input"
                value={form.construction_type}
                onChange={e => update('construction_type', e.target.value)}>
                {CONSTRUCTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="chattels">Chattels &amp; extras</label>
            <textarea id="chattels" className="input" rows={3}
              value={form.chattels}
              onChange={e => update('chattels', e.target.value)}
              maxLength={2000}
              placeholder="e.g. heat pump, dishwasher, HRV, garden shed, spa pool"/>
            <p className="text-xs text-slate-500 mt-1">One per line or comma-separated. Listed on the public page.</p>
          </div>
        </section>

        {/* Costs */}
        <section className="card space-y-5">
          <header>
            <h2 className="text-lg font-semibold text-slate-900">Costs</h2>
            <p className="text-xs text-slate-500 mt-0.5">What buyers will ask about upfront.</p>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="rates_annual">Rates (annual)</label>
              <input id="rates_annual" className="input"
                value={form.rates_annual}
                onChange={e => update('rates_annual', e.target.value)}
                maxLength={60}
                placeholder='e.g. "$3,450 / year"'/>
            </div>
            <div>
              <label className="label" htmlFor="capital_value">Capital value (CV)</label>
              <input id="capital_value" className="input"
                value={form.capital_value}
                onChange={e => update('capital_value', e.target.value)}
                maxLength={60}
                placeholder='e.g. "$1,920,000"'/>
            </div>
          </div>
        </section>

        {/* Media */}
        <section className="card space-y-5">
          <header>
            <h2 className="text-lg font-semibold text-slate-900">Media</h2>
            <p className="text-xs text-slate-500 mt-0.5">Virtual tours, floor plan, and a hero image fallback.</p>
          </header>

          <div>
            <label className="label" htmlFor="matterport_url">Matterport / 3D tour URL</label>
            <input id="matterport_url" type="url" className="input"
              value={form.matterport_url}
              onChange={e => update('matterport_url', e.target.value)}
              maxLength={500}
              placeholder="https://my.matterport.com/show/?m=..."/>
          </div>

          <div>
            <label className="label" htmlFor="youtube_url">YouTube / video URL</label>
            <input id="youtube_url" type="url" className="input"
              value={form.youtube_url}
              onChange={e => update('youtube_url', e.target.value)}
              maxLength={500}
              placeholder="https://www.youtube.com/watch?v=..."/>
          </div>

          <div>
            <label className="label" htmlFor="floor_plan_url">Floor plan URL</label>
            <input id="floor_plan_url" type="url" className="input"
              value={form.floor_plan_url}
              onChange={e => update('floor_plan_url', e.target.value)}
              maxLength={500}
              placeholder="https://..."/>
            <p className="text-xs text-slate-500 mt-1">Link to an image or PDF of the floor plan.</p>
          </div>

          <div>
            <label className="label" htmlFor="hero_image_url">Hero image URL (fallback)</label>
            <input id="hero_image_url" type="url" className="input"
              value={form.hero_image_url}
              onChange={e => update('hero_image_url', e.target.value)}
              maxLength={500}
              placeholder="https://..."/>
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
        </section>

        {/* Title & land */}
        <section className="card space-y-5">
          <header>
            <h2 className="text-lg font-semibold text-slate-900">Title &amp; land</h2>
            <p className="text-xs text-slate-500 mt-0.5">Auto-filled from LINZ when you pick an address — editable.</p>
          </header>

          <div>
            <label className="label" htmlFor="legal_description">Legal description</label>
            <input id="legal_description" className="input"
              value={form.legal_description}
              onChange={e => update('legal_description', e.target.value)}
              maxLength={500}
              placeholder='e.g. "Lot 2 Deposited Plan 123456"'/>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="parcel_titles">Parcel titles</label>
              <input id="parcel_titles" className="input"
                value={form.parcel_titles}
                onChange={e => update('parcel_titles', e.target.value)}
                maxLength={500}
                placeholder="e.g. NA57D/444"/>
            </div>
            <div>
              <label className="label" htmlFor="tenure_type">Tenure</label>
              <select id="tenure_type" className="input"
                value={form.tenure_type}
                onChange={e => update('tenure_type', e.target.value)}>
                {TENURE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Open homes (edit only) */}
        <section className="card space-y-4">
          <header>
            <h2 className="text-lg font-semibold text-slate-900">Open homes</h2>
            <p className="text-xs text-slate-500 mt-0.5">Scheduled viewing times buyers can add to their calendar.</p>
          </header>
          <OpenHomesEditor
            listingId={id}
            openHomes={openHomes}
            onChange={setOpenHomes}
            disabled={!isEdit}
          />
        </section>

        <div className="flex gap-3 justify-end pt-2">
          <Link to={isEdit ? `/listings/${id}` : '/listings'} className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : (isEdit ? 'Save changes' : 'Create listing')}
          </button>
        </div>
      </form>
    </div>
  );
}
