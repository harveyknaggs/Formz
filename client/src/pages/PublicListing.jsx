import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ListingSkeleton from '../components/ListingSkeleton';
import PhotoGallery from '../components/PhotoGallery';
import { buildOpenHomeIcs, downloadIcs } from '../utils/ics';
import './PublicListing.css';

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

const KIND_BLURB = {
  lim: 'Land Information Memorandum — what the council knows about this property.',
  title: 'Legal ownership records and registered interests.',
  builders_report: 'Independent inspection of the property\'s condition.',
  other: 'Supporting document supplied by the vendor.',
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

function parsePriceParts(price) {
  if (!price) return null;
  const str = String(price).trim();
  const match = str.match(/^([^\d-]*)([\d,]+(?:\.\d+)?)(.*)$/);
  if (!match) return { currency: '', number: str, suffix: '' };
  return { currency: match[1].trim() || '$', number: match[2], suffix: match[3].trim() };
}

function osmEmbedSrc(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const offset = 0.004;
  const bbox = [lng - offset, lat - offset * 0.6, lng + offset, lat + offset * 0.6].join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat},${lng}`;
}

function osmFullLink(lat, lng) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
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
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

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

  const handleCopyLink = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* no-op */
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) window.history.back();
  };

  if (loading) {
    return <ListingSkeleton variant="public" />;
  }

  if (notFound || !listing) {
    return (
      <div className="pl-notfound">
        <div>
          <h1>This listing is no longer available</h1>
          <p>The link may have expired or the listing has been withdrawn. Please contact your agent for more information.</p>
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

  const lat = Number(listing.latitude);
  const lng = Number(listing.longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const mapSrc = hasCoords ? osmEmbedSrc(lat, lng) : null;
  const mapLink = hasCoords ? osmFullLink(lat, lng) : null;

  const hasTitleLand = listing.legal_description || listing.parcel_titles || listing.tenure_type || listing.land_area || listing.land_area_m2 || listing.floor_area || listing.year_built;
  const hasInfoRow = hasCoords || hasTitleLand;

  const priceParts = parsePriceParts(listing.asking_price);
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareBody = `${listing.address}\n${shareUrl}`;
  const shareSubject = `Listing: ${listing.address}`;

  return (
    <div className="pl-root">
      {galleryImages.length > 0 && <PhotoGallery images={galleryImages} address={listing.address} />}

      <div className="pl-hero-wrap">
        <div className="pl-hero-bg" />

        <div className="pl-shell">

          <div className="pl-topbar">
            <div className="pl-left">
              <button type="button" className="pl-back" onClick={handleBack}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"/>
                  <polyline points="12 19 5 12 12 5"/>
                </svg>
                Back
              </button>
              {listing.suburb && (
                <div className="pl-eyebrow-crumb">Listing · {listing.suburb}</div>
              )}
            </div>
            <button type="button" className="pl-save" onClick={() => setSaved(s => !s)}>
              <svg viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {saved ? 'Saved' : 'Save'}
            </button>
          </div>

          {/* HERO ROW */}
          <div className="pl-hero-row">
            <div className="pl-hero-card">
              {saleBadgeText ? (
                <span className="pl-listing-status">{saleBadgeText}</span>
              ) : (
                <span className="pl-listing-status">For sale</span>
              )}
              <h1 className="pl-addr">
                {listing.suburb ? (
                  <>{listing.address.replace(new RegExp(`,?\\s*${listing.suburb}\\s*$`, 'i'), '')}, <em>{listing.suburb}</em></>
                ) : listing.address}
              </h1>
              {listing.city && <div className="pl-suburb">{listing.city}</div>}

              {priceParts && (
                <div className="pl-price-block">
                  <div className="pl-price-label">Asking price</div>
                  <div className="pl-price">
                    <span className="pl-currency">{priceParts.currency || '$'}</span>
                    {priceParts.number}
                    {priceParts.suffix && <span style={{ fontSize: '24px', marginLeft: 6 }}>{priceParts.suffix}</span>}
                  </div>
                </div>
              )}

              {(listing.bedrooms != null || listing.bathrooms != null || listing.floor_area != null || listing.land_area != null) && (
                <div className="pl-specs">
                  {listing.bedrooms != null && (
                    <div className="pl-spec">
                      <div className="pl-spec-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 9V6a2 2 0 0 1 2-2h4"/>
                          <path d="M2 13v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5"/>
                          <path d="M2 13h20"/>
                          <path d="M14 4h4a2 2 0 0 1 2 2v3"/>
                        </svg>
                      </div>
                      <div className="pl-spec-val">{listing.bedrooms}</div>
                      <div className="pl-spec-label">{listing.bedrooms === 1 ? 'Bedroom' : 'Bedrooms'}</div>
                    </div>
                  )}
                  {listing.bathrooms != null && (
                    <div className="pl-spec">
                      <div className="pl-spec-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                          <path d="M4 10h16v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/>
                          <line x1="6" y1="22" x2="6" y2="19"/>
                          <line x1="18" y1="22" x2="18" y2="19"/>
                        </svg>
                      </div>
                      <div className="pl-spec-val">{listing.bathrooms}</div>
                      <div className="pl-spec-label">{listing.bathrooms === 1 ? 'Bathroom' : 'Bathrooms'}</div>
                    </div>
                  )}
                  {listing.floor_area != null && (
                    <div className="pl-spec">
                      <div className="pl-spec-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2"/>
                          <line x1="3" y1="9" x2="21" y2="9"/>
                          <line x1="9" y1="21" x2="9" y2="9"/>
                        </svg>
                      </div>
                      <div className="pl-spec-val">{listing.floor_area}<sup>m²</sup></div>
                      <div className="pl-spec-label">Floor</div>
                    </div>
                  )}
                  {listing.land_area != null && (
                    <div className="pl-spec">
                      <div className="pl-spec-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="3 3 21 3 19 21 5 21 3 3"/>
                        </svg>
                      </div>
                      <div className="pl-spec-val">{Number(listing.land_area).toLocaleString()}<sup>m²</sup></div>
                      <div className="pl-spec-label">Land</div>
                    </div>
                  )}
                </div>
              )}

              {listing.description && <p className="pl-desc">{listing.description}</p>}
            </div>

            <div className="pl-hero-side">
              {listing.agent_name && (
                <div className="pl-agent-card">
                  <div className="pl-agent-label">Presented by</div>
                  <div className="pl-agent-head">
                    <div className="pl-agent-avatar">{initialsFromName(listing.agent_name)}</div>
                    <div>
                      <div className="pl-agent-name">{listing.agent_name}</div>
                      <div className="pl-agent-role">Listing agent</div>
                    </div>
                  </div>
                  {(listing.agent_phone || listing.agent_email) && (
                    <div className="pl-agent-contact">
                      {listing.agent_phone && (
                        <a href={`tel:${listing.agent_phone}`}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                          </svg>
                          {listing.agent_phone}
                        </a>
                      )}
                      {listing.agent_email && (
                        <a href={`mailto:${listing.agent_email}`}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                            <polyline points="22,6 12,13 2,6"/>
                          </svg>
                          {listing.agent_email}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="pl-share-card">
                <div className="pl-share-title">Share this <em>listing</em></div>
                <div className="pl-share-row">
                  <a
                    className="pl-share-btn"
                    href={`https://wa.me/?text=${encodeURIComponent(shareBody)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                    </svg>
                    WhatsApp
                  </a>
                  <a
                    className="pl-share-btn"
                    href={`sms:?body=${encodeURIComponent(shareBody)}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    Text
                  </a>
                  <a
                    className="pl-share-btn"
                    href={`mailto:?subject=${encodeURIComponent(shareSubject)}&body=${encodeURIComponent(shareBody)}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    Email
                  </a>
                  <button type="button" className="pl-share-btn" onClick={handleCopyLink}>
                    {copied ? (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 13l4 4L19 7"/>
                        </svg>
                        Copied
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                        Copy link
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN GRID */}
          <div className="pl-main-grid">
            <div className="pl-main-left">

              {hasInfoRow && (
                <div className="pl-info-row">
                  {hasCoords && (
                    <div className="pl-panel p1">
                      <div className="pl-panel-head">
                        <span className="pl-title">Location <em>& map</em></span>
                        {mapLink && (
                          <a className="pl-link" href={mapLink} target="_blank" rel="noreferrer">
                            Larger map
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="15 3 21 3 21 9"/>
                              <line x1="10" y1="14" x2="21" y2="3"/>
                            </svg>
                          </a>
                        )}
                      </div>
                      <div className="pl-map-wrap">
                        <iframe
                          title={`Map for ${listing.address}`}
                          src={mapSrc}
                          loading="lazy"
                        />
                      </div>
                      <div className="pl-map-attr">© OpenStreetMap contributors</div>
                    </div>
                  )}

                  {hasTitleLand && (
                    <div className="pl-panel p2">
                      <div className="pl-panel-head">
                        <span className="pl-title">Title <em>& land</em></span>
                      </div>
                      {listing.tenure_type && (
                        <div className="pl-td-row"><dt>Title</dt><dd>{TENURE_LABELS[listing.tenure_type] || listing.tenure_type}</dd></div>
                      )}
                      {listing.legal_description && (
                        <div className="pl-td-row"><dt>Legal description</dt><dd>{listing.legal_description}</dd></div>
                      )}
                      {listing.parcel_titles && (
                        <div className="pl-td-row"><dt>Title reference</dt><dd>{listing.parcel_titles}</dd></div>
                      )}
                      {listing.land_area != null ? (
                        <div className="pl-td-row"><dt>Land area</dt><dd>{Number(listing.land_area).toLocaleString()} m²</dd></div>
                      ) : listing.land_area_m2 ? (
                        <div className="pl-td-row"><dt>Land area</dt><dd>{Math.round(Number(listing.land_area_m2)).toLocaleString()} m² <em style={{ fontStyle: 'italic', color: 'var(--pl-ink-muted)' }}>(LINZ)</em></dd></div>
                      ) : null}
                      {listing.floor_area != null && (
                        <div className="pl-td-row"><dt>Floor area</dt><dd>{listing.floor_area} m²</dd></div>
                      )}
                      {listing.year_built && (
                        <div className="pl-td-row"><dt>Year built</dt><dd>{listing.year_built}</dd></div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {openHomes.length > 0 && (
                <div className="pl-panel p3">
                  <div className="pl-panel-head">
                    <span className="pl-title">Open <em>homes</em></span>
                    <span className="pl-meta">{openHomes.length} scheduled</span>
                  </div>
                  {openHomes.map(o => (
                    <div key={o.id} className="pl-oh-row">
                      <div className="pl-oh-left">
                        <div className="pl-oh-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                        </div>
                        <span className="pl-oh-text">{formatOpenHome(o.start_at, o.end_at)}</span>
                      </div>
                      <button
                        type="button"
                        className="pl-oh-btn"
                        onClick={() => {
                          const ics = buildOpenHomeIcs({
                            uid: `open-home-${o.id}@formz`,
                            start: o.start_at,
                            end: o.end_at,
                            summary: `Open home — ${listing.address}`,
                            location: [listing.address, locationLine].filter(Boolean).join(', '),
                            description: `Open home viewing for ${listing.address}.`,
                            url: shareUrl || undefined,
                          });
                          downloadIcs(`open-home-${listing.short_code}-${o.id}`, ics);
                        }}
                      >
                        Add to calendar
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {hasAboutHome && (
                <div className="pl-panel p4">
                  <div className="pl-panel-head">
                    <span className="pl-title">About the <em>home</em></span>
                  </div>
                  {(listing.year_built || listing.construction_type) && (
                    <div className="pl-kv-grid" style={{ marginBottom: chattelsList.length ? 16 : 0 }}>
                      {listing.year_built && (
                        <div className="pl-kv">
                          <span className="pl-kv-label">Year built</span>
                          <span className="pl-kv-val">{listing.year_built}</span>
                        </div>
                      )}
                      {listing.construction_type && (
                        <div className="pl-kv">
                          <span className="pl-kv-label">Construction</span>
                          <span className="pl-kv-val">{CONSTRUCTION_LABELS[listing.construction_type] || listing.construction_type}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {chattelsList.length > 0 && (
                    <>
                      <div className="pl-kv-label" style={{ marginBottom: 8 }}>Chattels &amp; extras</div>
                      <div className="pl-chips">
                        {chattelsList.map((c, i) => (
                          <span key={i} className="pl-chip">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 13l4 4L19 7"/>
                            </svg>
                            {c}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {hasCosts && (
                <div className="pl-panel p5">
                  <div className="pl-panel-head">
                    <span className="pl-title">Costs <em>& rates</em></span>
                  </div>
                  <div className="pl-kv-grid">
                    {listing.rates_annual && (
                      <div className="pl-kv">
                        <span className="pl-kv-label">Rates (annual)</span>
                        <span className="pl-kv-val">{listing.rates_annual}</span>
                      </div>
                    )}
                    {listing.capital_value && (
                      <div className="pl-kv">
                        <span className="pl-kv-label">Capital value</span>
                        <span className="pl-kv-val">{listing.capital_value}</span>
                      </div>
                    )}
                  </div>
                  <p className="pl-kv-hint">Figures supplied by the vendor or taken from the most recent rating assessment.</p>
                </div>
              )}

              {hasMedia && (
                <div className="pl-panel p6">
                  <div className="pl-panel-head">
                    <span className="pl-title">Virtual <em>tour</em> & floor plan</span>
                  </div>
                  {matterportSrc && (
                    <div className="pl-media-block">
                      <div className="pl-media-label">3D tour</div>
                      <div className="pl-media-frame">
                        <iframe
                          title="Matterport 3D tour"
                          src={matterportSrc}
                          allow="fullscreen; xr-spatial-tracking"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}
                  {youtubeSrc && (
                    <div className="pl-media-block">
                      <div className="pl-media-label">Video</div>
                      <div className="pl-media-frame">
                        <iframe
                          title="Property video"
                          src={youtubeSrc}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}
                  {listing.floor_plan_url && (
                    <div className="pl-media-block">
                      <div className="pl-media-label">Floor plan</div>
                      <a href={listing.floor_plan_url} target="_blank" rel="noreferrer" className="pl-floor-link">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        Open floor plan
                      </a>
                    </div>
                  )}
                </div>
              )}

              {Array.isArray(listing.nearby_schools) && listing.nearby_schools.length > 0 && (
                <div className="pl-panel p7">
                  <div className="pl-panel-head">
                    <span className="pl-title">Nearby <em>schools</em></span>
                    <span className="pl-meta">{listing.nearby_schools.length} within 2km</span>
                  </div>
                  {listing.nearby_schools.map((s, i) => (
                    <div key={i} className="pl-school-row">
                      <div className="pl-school-l">
                        <div className="pl-school-name">{s.name}</div>
                        {s.type && <div className="pl-school-type">{s.type}</div>}
                      </div>
                      <div className="pl-school-dist">{s.distance_km} km</div>
                    </div>
                  ))}
                  <div className="pl-school-note">Based on straight-line distance. Check school zone maps for enrolment eligibility.</div>
                </div>
              )}

            </div>

            <div className="pl-main-right">

              {/* Form (sticky) */}
              {submitted ? (
                <div className="pl-panel p1 pl-success-card" style={{ animationDelay: '0s' }}>
                  <div className="pl-success-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                  <div>
                    <div className="pl-success-title">Thanks, {submitted.name}!</div>
                    <div className="pl-success-body">
                      {submitted.intent === 'register_interest' ? (
                        <>
                          <p>We've noted your interest at <strong>{submitted.email}</strong>.</p>
                          <p>We'll let you know about open homes and price changes. When you're ready to see the full document pack, come back and hit "Request documents".</p>
                        </>
                      ) : (
                        <>
                          <p>We've emailed the document links to <strong>{submitted.email}</strong>.</p>
                          <p>If you don't see the email in 5 minutes, please check your spam folder.</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pl-panel p1">
                  <div className="pl-form-tabs" role="tablist">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === 'docs'}
                      className={`pl-form-tab ${mode === 'docs' ? 'active' : ''}`}
                      onClick={() => setMode('docs')}
                    >
                      Request docs
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === 'interest'}
                      className={`pl-form-tab ${mode === 'interest' ? 'active' : ''}`}
                      onClick={() => setMode('interest')}
                    >
                      Register interest
                    </button>
                  </div>

                  <div className="pl-form-title">
                    {mode === 'interest' ? <>Register <em>interest</em></> : <>Request <em>documents</em></>}
                  </div>
                  <div className="pl-form-lead">
                    {mode === 'interest'
                      ? "Let the agent know you're interested — no document request, just a heads-up."
                      : "Leave your details and we'll email you the full document pack (LIM, title, etc.)."}
                  </div>

                  <form onSubmit={handleSubmit}>
                    <div className="pl-field">
                      <label htmlFor="lead-name">Full name <span className="pl-req">*</span></label>
                      <input
                        id="lead-name"
                        type="text"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        placeholder="Your full name"
                        autoComplete="name"
                        maxLength={100}
                        required
                      />
                    </div>
                    <div className="pl-field">
                      <label htmlFor="lead-email">Email <span className="pl-req">*</span></label>
                      <input
                        id="lead-email"
                        type="email"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                      />
                    </div>
                    {mode === 'docs' && (
                      <div className="pl-field">
                        <label htmlFor="lead-phone">Phone</label>
                        <input
                          id="lead-phone"
                          type="tel"
                          value={form.phone}
                          onChange={e => setForm({ ...form, phone: e.target.value })}
                          placeholder="+64 21 …"
                          autoComplete="tel"
                        />
                      </div>
                    )}

                    {submitError && <div className="pl-form-error">{submitError}</div>}

                    <button type="submit" className="pl-submit-btn" disabled={submitting}>
                      {submitting ? 'Sending…' : (mode === 'interest' ? 'Register interest' : 'Request documents')}
                    </button>
                    <div className="pl-privacy">Your details are shared with the listing agent only.</div>
                  </form>
                </div>
              )}

              {docs.length > 0 && (
                <div className="pl-panel p2">
                  <div className="pl-panel-head">
                    <span className="pl-title">Document <em>pack</em></span>
                    <span className="pl-meta">{docs.length} {docs.length === 1 ? 'file' : 'files'}</span>
                  </div>
                  {docs.map((d, i) => (
                    <div key={d.id} className="pl-doc-card">
                      <div className="pl-doc-top">
                        <span className="pl-doc-num">{String(i + 1).padStart(2, '0')}</span>
                        <span className={`pl-doc-status ${submitted ? 'emailed' : ''}`}>
                          {submitted ? 'Emailed' : 'Locked'}
                        </span>
                      </div>
                      <div className="pl-doc-illus">
                        <div className="pl-paper back1" />
                        <div className="pl-paper back2" />
                        <div className="pl-paper front">
                          <div className="pl-line-bar" />
                          <div className="pl-line-bar" />
                        </div>
                      </div>
                      <div className="pl-doc-title">{d.label || KIND_LABELS[d.kind] || 'Document'}</div>
                      <div className="pl-doc-desc">{KIND_BLURB[d.kind] || 'Supporting document supplied by the vendor.'}</div>
                      <div className="pl-doc-foot">
                        <span className="pl-left-text">{KIND_LABELS[d.kind] || 'Document'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
