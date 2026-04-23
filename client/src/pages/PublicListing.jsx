import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ListingSkeleton from '../components/ListingSkeleton';
import PhotoGallery from '../components/PhotoGallery';
import ListingMap from '../components/ListingMap';
import ShareRow from '../components/ShareRow';
import { buildOpenHomeIcs, downloadIcs } from '../utils/ics';

const TENURE_LABELS = {
  freehold: 'Freehold',
  leasehold: 'Leasehold',
  cross_lease: 'Cross Lease',
  unit_title: 'Unit Title',
  unknown: 'Unknown',
};

const KIND_LABELS = {
  lim: 'LIM Report',
  title: 'Title',
  builders_report: "Builder's Report",
  other: 'Document',
};

const SALE_METHOD_LABELS = {
  price: 'Price',
  by_negotiation: 'By Negotiation',
  auction: 'Auction',
  tender: 'Tender',
  deadline_sale: 'Deadline Sale',
};

const CONSTRUCTION_LABELS = {
  weatherboard: 'Weatherboard',
  brick: 'Brick',
  plaster: 'Plaster',
  mixed: 'Mixed materials',
  other: 'Other',
};

function youtubeEmbedUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
      const shorts = u.pathname.match(/^\/shorts\/([^/]+)/);
      if (shorts) return `https://www.youtube.com/embed/${shorts[1]}`;
    }
  } catch {
    return null;
  }
  return null;
}

function matterportEmbedUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!u.hostname.includes('matterport.com')) return null;
    if (u.pathname.startsWith('/show')) return url;
    return url;
  } catch {
    return null;
  }
}

function formatOpenHome(startIso, endIso) {
  const s = new Date(startIso);
  const e = new Date(endIso);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return '—';
  const dayFmt = new Intl.DateTimeFormat('en-NZ', { weekday: 'short', day: 'numeric', month: 'long' });
  const timeFmt = new Intl.DateTimeFormat('en-NZ', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${dayFmt.format(s)} · ${timeFmt.format(s)} – ${timeFmt.format(e)}`;
}

function formatSaleDeadline(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const fmt = new Intl.DateTimeFormat('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
  return fmt.format(d);
}

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
  const [mode, setMode] = useState('docs'); // 'docs' | 'interest'
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
        intent: mode === 'interest' ? 'register_interest' : 'doc_request',
      };
      if (mode !== 'interest' && form.phone.trim()) body.phone = form.phone.trim();

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
      setSubmitted({ name: body.name, email: body.email, intent: body.intent });
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
  const openHomes = Array.isArray(listing.open_homes) ? listing.open_homes : [];

  const saleMethodLabel = listing.sale_method ? SALE_METHOD_LABELS[listing.sale_method] : null;
  const saleDeadlineText = formatSaleDeadline(listing.sale_deadline_at);
  const saleBadgeText = saleMethodLabel
    ? (saleDeadlineText ? `${saleMethodLabel} — ${saleDeadlineText}` : saleMethodLabel)
    : null;

  const chattelsList = (listing.chattels || '')
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(Boolean);

  const hasAboutHome = listing.year_built || listing.construction_type || chattelsList.length > 0;
  const hasCosts = listing.rates_annual || listing.capital_value;

  const matterportSrc = matterportEmbedUrl(listing.matterport_url);
  const youtubeSrc = youtubeEmbedUrl(listing.youtube_url);
  const hasMedia = matterportSrc || youtubeSrc || listing.floor_plan_url;

  const handleAddToCalendar = (openHome) => {
    const ics = buildOpenHomeIcs({
      uid: `open-home-${openHome.id}@formz`,
      start: openHome.start_at,
      end: openHome.end_at,
      summary: `Open home — ${listing.address}`,
      location: [listing.address, locationLine].filter(Boolean).join(', '),
      description: `Open home viewing for ${listing.address}.`,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    });
    downloadIcs(`open-home-${listing.short_code}-${openHome.id}`, ics);
  };

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

          {(saleBadgeText || listing.asking_price) && (
            <div className="mt-6 pb-6 border-b border-slate-100">
              {saleBadgeText && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wide mb-2">
                  {saleBadgeText}
                </span>
              )}
              {listing.asking_price && (
                <>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Asking price</p>
                  <p className="text-3xl sm:text-4xl font-bold text-navy mt-1">{listing.asking_price}</p>
                </>
              )}
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

        {/* Open homes */}
        {openHomes.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Open homes</h2>
            <ul className="space-y-2">
              {openHomes.map(o => (
                <li key={o.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-primary shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="font-medium text-slate-800 truncate">{formatOpenHome(o.start_at, o.end_at)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddToCalendar(o)}
                    className="text-xs font-semibold text-primary hover:underline shrink-0"
                  >
                    Add to calendar
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* About the home */}
        {hasAboutHome && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">About the home</h2>
            {(listing.year_built || listing.construction_type) && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                {listing.year_built && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Year built</p>
                    <p className="text-lg font-semibold text-slate-900 mt-0.5">{listing.year_built}</p>
                  </div>
                )}
                {listing.construction_type && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Construction</p>
                    <p className="text-lg font-semibold text-slate-900 mt-0.5">
                      {CONSTRUCTION_LABELS[listing.construction_type] || listing.construction_type}
                    </p>
                  </div>
                )}
              </div>
            )}
            {chattelsList.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Chattels &amp; extras</p>
                <ul className="flex flex-wrap gap-2">
                  {chattelsList.map((c, i) => (
                    <li key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                      <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Costs */}
        {hasCosts && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Costs</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {listing.rates_annual && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Rates (annual)</p>
                  <p className="text-lg font-semibold text-slate-900 mt-0.5">{listing.rates_annual}</p>
                </div>
              )}
              {listing.capital_value && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Capital value</p>
                  <p className="text-lg font-semibold text-slate-900 mt-0.5">{listing.capital_value}</p>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-3">Figures supplied by the vendor or taken from the most recent rating assessment.</p>
          </div>
        )}

        {/* Media — virtual tour / video / floor plan */}
        {hasMedia && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6 space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">Virtual tour &amp; floor plan</h2>

            {matterportSrc && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">3D tour</p>
                <div className="aspect-video rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                  <iframe
                    title="Matterport 3D tour"
                    src={matterportSrc}
                    allow="fullscreen; xr-spatial-tracking"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              </div>
            )}

            {youtubeSrc && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Video</p>
                <div className="aspect-video rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                  <iframe
                    title="Property video"
                    src={youtubeSrc}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              </div>
            )}

            {listing.floor_plan_url && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Floor plan</p>
                <a
                  href={listing.floor_plan_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Open floor plan
                </a>
              </div>
            )}
          </div>
        )}

        {/* Location map (free — OpenStreetMap) */}
        <ListingMap latitude={listing.latitude} longitude={listing.longitude} address={listing.address} />

        {/* Optional Google Street View (only if API key is set) */}
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

        {/* Title & land — collapsible legal info */}
        {(listing.legal_description || listing.parcel_titles || listing.tenure_type) && (
          <details className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6 group">
            <summary className="flex items-center justify-between cursor-pointer select-none list-none">
              <h2 className="text-sm font-semibold text-slate-900">Title &amp; land</h2>
              <svg className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
              </svg>
            </summary>
            <dl className="mt-4 space-y-3 text-sm">
              {listing.tenure_type && (
                <div className="flex gap-3">
                  <dt className="w-32 shrink-0 text-slate-500">Tenure</dt>
                  <dd className="text-slate-800 font-medium">{TENURE_LABELS[listing.tenure_type] || listing.tenure_type}</dd>
                </div>
              )}
              {listing.legal_description && (
                <div className="flex gap-3">
                  <dt className="w-32 shrink-0 text-slate-500">Legal description</dt>
                  <dd className="text-slate-800 font-medium break-words">{listing.legal_description}</dd>
                </div>
              )}
              {listing.parcel_titles && (
                <div className="flex gap-3">
                  <dt className="w-32 shrink-0 text-slate-500">Title reference</dt>
                  <dd className="text-slate-800 font-medium break-words">{listing.parcel_titles}</dd>
                </div>
              )}
              {listing.land_area_m2 && !listing.land_area && (
                <div className="flex gap-3">
                  <dt className="w-32 shrink-0 text-slate-500">Parcel area</dt>
                  <dd className="text-slate-800 font-medium">{Math.round(Number(listing.land_area_m2)).toLocaleString()} m² (LINZ)</dd>
                </div>
              )}
            </dl>
          </details>
        )}

        {/* Share */}
        <ShareRow url={typeof window !== 'undefined' ? window.location.href : ''} title={listing.address} />

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
                {submitted.intent === 'register_interest' ? (
                  <>
                    <p className="text-green-800 mt-1">
                      We've noted your interest at <strong>{submitted.email}</strong>.
                    </p>
                    <p className="text-sm text-green-700 mt-2">
                      We'll let you know about open homes and price changes. When you're ready to see the full document pack, come back and hit "Request documents".
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-green-800 mt-1">
                      We've emailed the document links to <strong>{submitted.email}</strong>.
                    </p>
                    <p className="text-sm text-green-700 mt-2">
                      If you don't see the email in 5 minutes, please check your spam folder.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 mb-6">
            <div className="flex gap-2 mb-5" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'docs'}
                onClick={() => setMode('docs')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  mode === 'docs'
                    ? 'bg-primary text-white shadow'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Request documents
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'interest'}
                onClick={() => setMode('interest')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  mode === 'interest'
                    ? 'bg-primary text-white shadow'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Just register interest
              </button>
            </div>

            <h2 className="text-xl font-semibold text-slate-900">
              {mode === 'interest' ? 'Register your interest' : 'Request documents'}
            </h2>
            <p className="text-slate-500 text-sm mt-1 mb-5">
              {mode === 'interest'
                ? "Get notified about open homes and price changes — no phone number needed."
                : "Leave your details and we'll email you the full document pack (LIM, title, etc.)."}
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
              {mode === 'docs' && (
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
              )}

              {submitError && (
                <p className="text-sm text-red-600">{submitError}</p>
              )}

              <button type="submit" disabled={submitting} className="btn-primary w-full justify-center">
                {submitting
                  ? 'Sending...'
                  : mode === 'interest' ? 'Register interest' : 'Request documents'}
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
