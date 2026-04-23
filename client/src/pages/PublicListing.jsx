import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ListingSkeleton from '../components/ListingSkeleton';
import PhotoGallery from '../components/PhotoGallery';

const KIND_LABELS = {
  lim: 'LIM Report',
  title: 'Title',
  builders_report: "Builder's Report",
  other: 'Document',
};

function initialsFromName(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() || '').join('') || '?';
}

export default function PublicListing() {
  const { shortCode } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/listings/public/${shortCode}`)
      .then(async res => {
        if (!res.ok) {
          if (cancelled) return;
          setNotFound(true);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setListing(data);
      })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [shortCode]);

  useEffect(() => {
    if (listing?.address) {
      document.title = `${listing.address} — Formz`;
    }
    return () => { document.title = 'Formz'; };
  }, [listing?.address]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!form.name.trim()) {
      setSubmitError('Please enter your name');
      return;
    }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setSubmitError('Please enter a valid email address');
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        name: form.name.trim(),
        email: form.email.trim(),
      };
      if (form.phone.trim()) body.phone = form.phone.trim();

      const res = await fetch(`/api/listings/public/${shortCode}/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('Too many requests — please wait a minute and try again.');
        }
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }
      setSubmitted({ name: body.name, email: body.email });
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <ListingSkeleton variant="public" />;
  }

  if (notFound || !listing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">This listing is no longer available</h1>
          <p className="text-slate-500 text-sm">
            The link may have expired or the listing has been withdrawn. Please contact your agent for more information.
          </p>
        </div>
      </div>
    );
  }

  const docs = listing.documents || [];
  const locationLine = [listing.suburb, listing.city].filter(Boolean).join(', ');
  const galleryImages = Array.isArray(listing.images) ? listing.images : [];

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <PhotoGallery images={galleryImages} address={listing.address} />

      <div className={`max-w-2xl mx-auto px-4 ${galleryImages.length > 1 ? 'mt-6' : '-mt-8 sm:-mt-12'} relative`}>
        {/* Property card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
            {listing.address}
          </h1>
          {locationLine && (
            <p className="text-slate-500 mt-1">{locationLine}</p>
          )}

          {listing.asking_price && (
            <div className="mt-6 pb-6 border-b border-slate-100">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Asking price</p>
              <p className="text-3xl sm:text-4xl font-bold text-navy mt-1">{listing.asking_price}</p>
            </div>
          )}

          {/* Stats row */}
          {(listing.bedrooms || listing.bathrooms || listing.floor_area || listing.land_area) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              {listing.bedrooms != null && (
                <PropertyStat
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12h18M5 12V8a2 2 0 012-2h10a2 2 0 012 2v4M3 12v6m18-6v6M7 12v-2a1 1 0 011-1h3a1 1 0 011 1v2" /></svg>}
                  value={listing.bedrooms}
                  label={listing.bedrooms === 1 ? 'Bedroom' : 'Bedrooms'}
                />
              )}
              {listing.bathrooms != null && (
                <PropertyStat
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 10h16M6 10V6a2 2 0 012-2h2a2 2 0 012 2M4 10v6a4 4 0 004 4h8a4 4 0 004-4v-6" /></svg>}
                  value={listing.bathrooms}
                  label={listing.bathrooms === 1 ? 'Bathroom' : 'Bathrooms'}
                />
              )}
              {listing.floor_area != null && (
                <PropertyStat
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h18v18H3V3zm0 6h18M9 3v18" /></svg>}
                  value={`${listing.floor_area} m²`}
                  label="Floor"
                />
              )}
              {listing.land_area != null && (
                <PropertyStat
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4h16v16H4z M4 12h16 M12 4v16" /></svg>}
                  value={`${listing.land_area} m²`}
                  label="Land"
                />
              )}
            </div>
          )}

          {listing.description && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                {listing.description}
              </p>
            </div>
          )}
        </div>

        {/* Street View */}
        {listing.latitude != null && listing.longitude != null && import.meta.env.VITE_GOOGLE_MAPS_API_KEY && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Street view</h2>
            <div className="w-full h-64 sm:h-80 rounded-lg overflow-hidden bg-slate-100">
              <iframe
                title="Street view"
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps/embed/v1/streetview?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&location=${listing.latitude},${listing.longitude}`}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">Imagery provided by Google. May not reflect current condition.</p>
          </div>
        )}

        {/* Nearby schools */}
        {Array.isArray(listing.nearby_schools) && listing.nearby_schools.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Nearby schools</h2>
            <ul className="divide-y divide-slate-100">
              {listing.nearby_schools.map((s, i) => (
                <li key={i} className="flex items-center justify-between py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 truncate">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.type}</p>
                  </div>
                  <span className="text-sm text-slate-600 font-medium shrink-0">{s.distance_km} km</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500 mt-3">Based on straight-line distance. Check school zone maps for enrolment eligibility.</p>
          </div>
        )}

        {/* Documents (locked) */}
        {docs.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Documents ({docs.length})
            </h2>
            <ul className="space-y-2">
              {docs.map(d => (
                <li
                  key={d.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 opacity-80"
                >
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-700 truncate">{d.label}</p>
                    <p className="text-xs text-slate-500">{KIND_LABELS[d.kind] || 'Document'}</p>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    {submitted ? 'Emailed' : 'Locked'}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500 mt-3">
              {submitted
                ? 'Check your inbox for download links.'
                : 'Request access below to have these emailed to you.'}
            </p>
          </div>
        )}

        {/* CTA / Success */}
        {submitted ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 sm:p-8 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-green-900">
                  Thanks, {submitted.name}!
                </h2>
                <p className="text-green-800 mt-1">
                  We've emailed the document links to <strong>{submitted.email}</strong>.
                </p>
                <p className="text-sm text-green-700 mt-2">
                  If you don't see the email in 5 minutes, please check your spam folder.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 mb-6">
            <h2 className="text-xl font-semibold text-slate-900">Request documents</h2>
            <p className="text-slate-500 text-sm mt-1 mb-5">
              Leave your details and we'll email you the full document pack.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label" htmlFor="lead-name">Full name *</label>
                <input
                  id="lead-name"
                  className="input"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                  autoComplete="name"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="label" htmlFor="lead-email">Email *</label>
                <input
                  id="lead-email"
                  type="email"
                  className="input"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="label" htmlFor="lead-phone">Phone</label>
                <input
                  id="lead-phone"
                  className="input"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  autoComplete="tel"
                  placeholder="+64 21 ..."
                />
              </div>

              {submitError && (
                <p className="text-sm text-red-600">{submitError}</p>
              )}

              <button type="submit" disabled={submitting} className="btn-primary w-full justify-center">
                {submitting ? 'Sending...' : 'Request documents'}
              </button>

              <p className="text-xs text-slate-500 text-center">
                Your details are shared with the listing agent only.
              </p>
            </form>
          </div>
        )}

        {/* Agent footer */}
        {listing.agent_name && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-navy to-primary text-white flex items-center justify-center font-semibold shrink-0">
              {initialsFromName(listing.agent_name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Presented by</p>
              <p className="font-semibold text-slate-900 truncate">{listing.agent_name}</p>
              {(listing.agent_email || listing.agent_phone) && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-sm">
                  {listing.agent_phone && (
                    <a href={`tel:${listing.agent_phone}`} className="text-primary hover:underline">
                      {listing.agent_phone}
                    </a>
                  )}
                  {listing.agent_email && (
                    <a href={`mailto:${listing.agent_email}`} className="text-primary hover:underline truncate">
                      {listing.agent_email}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PropertyStat({ icon, value, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900 leading-tight">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}
