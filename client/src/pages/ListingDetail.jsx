import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import ListingSkeleton from '../components/ListingSkeleton';
import QRCode from 'qrcode';

const KIND_LABELS = {
  lim: 'LIM Report',
  title: 'Title',
  builders_report: "Builder's Report",
  other: 'Other',
};

const KIND_TONES = {
  lim: '#3b82f6',
  title: '#1e3a5f',
  builders_report: '#d97706',
  other: '#64748b',
};

const STATUS_STYLES = {
  active: { bg: '#dcfce7', fg: '#166534', dot: '#16a34a' },
  draft: { bg: '#f1f5f9', fg: '#475569', dot: '#94a3b8' },
  sold: { bg: '#dbeafe', fg: '#1e40af', dot: '#3b82f6' },
  withdrawn: { bg: '#fef3c7', fg: '#92400e', dot: '#d97706' },
};

const ANIM_STYLES = `
@keyframes ldFloatIn {
  0% { opacity: 0; transform: translateY(14px) scale(0.985); }
  60% { opacity: 1; transform: translateY(-2px) scale(1.004); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes ldPopIn {
  0% { opacity: 0; transform: scale(0.6) rotate(-6deg); }
  60% { opacity: 1; transform: scale(1.1) rotate(2deg); }
  100% { opacity: 1; transform: scale(1) rotate(0); }
}
@keyframes ldPulseDot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.7; }
}
`;

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h === 1 ? '' : 's'} ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return d.toLocaleDateString('en-NZ');
}

function initialsFor(name) {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function hashHue(str) {
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % 360;
}

async function copyTextToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function Icon({ name, size = 16, stroke = 1.75, style }) {
  const common = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round',
    style: { display: 'inline-block', verticalAlign: '-2px', ...style },
  };
  switch (name) {
    case 'bed': return <svg {...common}><path d="M3 17V7"/><path d="M3 11h14a4 4 0 0 1 4 4v2"/><path d="M3 17h18"/><circle cx="7.5" cy="11" r="2"/></svg>;
    case 'bath': return <svg {...common}><path d="M3 11h18v4a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-4z"/><path d="M7 11V6a2 2 0 0 1 2-2h1l-.5 2"/><path d="M5 19l-1 2M19 19l1 2"/></svg>;
    case 'ruler': return <svg {...common}><path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M11 9l2 2M15 5l2 2"/></svg>;
    case 'tree': return <svg {...common}><path d="M12 21v-6"/><path d="M8 15a4 4 0 0 1-1-7.7A5 5 0 0 1 17 7a4 4 0 0 1-1 7.7"/></svg>;
    case 'download': return <svg {...common}><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 21h16"/></svg>;
    case 'plus': return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
    case 'copy': return <svg {...common}><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>;
    case 'eye': return <svg {...common}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'qr': return <svg {...common}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3M21 14v3M14 21h7M17 17v4"/></svg>;
    case 'arrow-left': return <svg {...common}><path d="M19 12H5M12 5l-7 7 7 7"/></svg>;
    case 'arrow-right': return <svg {...common}><path d="M5 12h14M12 5l7 7-7 7"/></svg>;
    case 'chevron-left': return <svg {...common}><path d="M15 6l-6 6 6 6"/></svg>;
    case 'chevron-right': return <svg {...common}><path d="M9 6l6 6-6 6"/></svg>;
    case 'mail': return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>;
    case 'phone': return <svg {...common}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.7a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z"/></svg>;
    case 'check': return <svg {...common}><path d="M5 13l4 4L19 7"/></svg>;
    case 'edit': return <svg {...common}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>;
    case 'trash': return <svg {...common}><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M9 7V4h6v3"/></svg>;
    case 'x': return <svg {...common}><path d="M6 6l12 12M18 6L6 18"/></svg>;
    case 'zap': return <svg {...common}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>;
    case 'expand': return <svg {...common}><path d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"/></svg>;
    default: return <svg {...common}/>;
  }
}

function AnimatedNumber({ value, duration = 900, format = (v) => v }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf; const start = performance.now(); const from = 0; const to = Number(value) || 0;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * e);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span>{format(display)}</span>;
}

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api, token } = useAuth();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  const [activePhoto, setActivePhoto] = useState(0);
  const [galleryExpanded, setGalleryExpanded] = useState(false);
  const [heroOk, setHeroOk] = useState(true);

  const [uploadKind, setUploadKind] = useState('lim');
  const [uploadLabel, setUploadLabel] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [confirmState, setConfirmState] = useState(null);
  const [deletingListing, setDeletingListing] = useState(false);

  const [docsOpen, setDocsOpen] = useState(true);
  const [docsCardHov, setDocsCardHov] = useState(false);
  const [hoveredDoc, setHoveredDoc] = useState(null);

  const [leadsOpen, setLeadsOpen] = useState(true);
  const [leadsCardHov, setLeadsCardHov] = useState(false);
  const [expandedLead, setExpandedLead] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api(`/api/listings/${id}`)
      .then(data => { if (!cancelled) setListing(data); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, api]);

  useEffect(() => {
    setHeroOk(true);
    setActivePhoto(0);
  }, [listing?.id]);

  const shareUrl = listing
    ? `${window.location.origin}/p/${listing.short_code}`
    : '';

  useEffect(() => {
    if (!showQr || !shareUrl) return;
    let cancelled = false;
    QRCode.toDataURL(shareUrl, { width: 320, margin: 1, color: { dark: '#1e3a5f', light: '#ffffff' } })
      .then(url => { if (!cancelled) setQrDataUrl(url); })
      .catch(() => { if (!cancelled) setQrDataUrl(''); });
    return () => { cancelled = true; };
  }, [showQr, shareUrl]);

  const handleCopy = async () => {
    setCopyError(false);
    const ok = await copyTextToClipboard(shareUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopyError(true);
      setTimeout(() => setCopyError(false), 3000);
    }
  };

  const askDeleteListing = () => {
    setActionError('');
    setConfirmState({
      kind: 'deleteListing',
      title: `Delete ${listing.address}?`,
      message: `This removes ${(listing.documents || []).length} document(s) and ${(listing.leads || []).length} lead record(s) permanently. This can't be undone.`,
      confirmText: 'Delete listing',
      danger: true,
    });
  };

  const askDeleteDoc = (doc) => {
    setActionError('');
    setConfirmState({
      kind: 'deleteDoc',
      docId: doc.id,
      title: `Delete "${doc.label}"?`,
      message: 'This removes the document and breaks any existing download links. This cannot be undone.',
      confirmText: 'Delete document',
      danger: true,
    });
  };

  const runConfirm = async () => {
    if (!confirmState) return;
    if (confirmState.kind === 'deleteListing') {
      setDeletingListing(true);
      try {
        await api(`/api/listings/${id}`, { method: 'DELETE' });
        navigate('/listings');
      } catch (err) {
        setActionError(err.message);
        setDeletingListing(false);
        setConfirmState(null);
      }
      return;
    }
    if (confirmState.kind === 'deleteDoc') {
      const docId = confirmState.docId;
      try {
        await api(`/api/listings/${id}/documents/${docId}`, { method: 'DELETE' });
        setListing(prev => ({
          ...prev,
          documents: (prev.documents || []).filter(d => d.id !== docId),
        }));
        setConfirmState(null);
      } catch (err) {
        setActionError(err.message);
        setConfirmState(null);
      }
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploadError('');

    if (!uploadFile) { setUploadError('Please choose a PDF file'); return; }
    if (uploadFile.size > 20 * 1024 * 1024) { setUploadError('Max 20MB'); return; }
    if (uploadFile.type && uploadFile.type !== 'application/pdf') { setUploadError('Only PDF files are allowed'); return; }
    if (!uploadLabel.trim()) { setUploadError('Label is required'); return; }
    if (uploadLabel.length > 120) { setUploadError('Label must be 120 characters or fewer'); return; }

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('kind', uploadKind);
    formData.append('label', uploadLabel.trim());

    setUploading(true);
    try {
      const res = await fetch(`/api/listings/${id}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setListing(prev => ({
        ...prev,
        documents: [data, ...(prev.documents || [])],
      }));
      setUploadFile(null);
      setUploadLabel('');
      setUploadKind('lim');
      const fileInput = document.getElementById('upload-file');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <ListingSkeleton variant="detail" />;

  if (error || !listing) {
    return (
      <div>
        <Link to="/listings" className="text-sm text-primary hover:underline mb-4 inline-block">← Back to Listings</Link>
        <div className="card text-center py-12">
          <p className="text-slate-500">{error || 'Listing not found'}</p>
        </div>
      </div>
    );
  }

  const docs = listing.documents || [];
  const leads = listing.leads || [];
  const images = Array.isArray(listing.images) ? listing.images : [];
  const hasImages = images.length > 0;
  const heroImageUrl = hasImages
    ? (images.find(i => i.is_hero)?.url || images[0].url)
    : (listing.hero_image_url && heroOk ? listing.hero_image_url : null);
  const currentPhoto = hasImages ? images[Math.min(activePhoto, images.length - 1)] : null;

  const status = listing.status || 'active';
  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.draft;
  const subtitle = [listing.suburb, listing.city].filter(Boolean).join(', ');
  const hue = hashHue(listing.address || listing.short_code || '');

  const totalDownloads = docs.reduce((s, d) => s + (d.download_count || 0), 0);

  return (
    <div style={{ animation: 'ldFloatIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
      <style>{ANIM_STYLES}</style>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5 text-[13px] text-slate-500 flex-wrap">
        <Link to="/listings" className="inline-flex items-center gap-1.5 hover:text-slate-700">
          <Icon name="arrow-left" size={13} /> Back to listings
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-700 font-medium truncate">{listing.address}</span>
        <div className="flex-1" />
        <Link to={`/listings/${id}/edit`} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12.5 }}>
          <Icon name="edit" size={13}/> Edit
        </Link>
        <button onClick={askDeleteListing} disabled={deletingListing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium text-red-600 hover:bg-red-50 transition-colors">
          <Icon name="trash" size={13}/> Delete
        </button>
      </div>

      {actionError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">
          {actionError}
        </div>
      )}

      <div className="flex flex-col gap-5">
        {/* ──────────────────────── HERO ──────────────────────── */}
        <Card delay={0.05}>
          <div style={{
            position: 'relative',
            height: 320,
            background: heroImageUrl
              ? 'transparent'
              : `linear-gradient(135deg, hsl(${hue}, 25%, 70%) 0%, hsl(${(hue + 40) % 360}, 30%, 50%) 100%)`,
            overflow: 'hidden',
          }}>
            {heroImageUrl && (
              <img
                key={heroImageUrl + activePhoto}
                src={currentPhoto ? currentPhoto.url : heroImageUrl}
                alt={listing.address}
                onError={() => setHeroOk(false)}
                style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  transition: 'opacity 500ms',
                }}
              />
            )}

            {/* Top actions */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              padding: 18, display: 'flex', justifyContent: 'space-between',
              background: 'linear-gradient(180deg, rgba(15,23,42,0.35) 0%, transparent 100%)',
            }}>
              <Link to="/listings" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 999,
                background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(6px)',
                fontSize: 12.5, fontWeight: 600, color: '#0f172a',
              }}>
                <Icon name="arrow-left" size={13}/> All listings
              </Link>
            </div>

            {/* Gallery arrows */}
            {hasImages && images.length > 1 && (
              <>
                <ArrowBtn side="left" onClick={() => setActivePhoto(i => (i - 1 + images.length) % images.length)} />
                <ArrowBtn side="right" onClick={() => setActivePhoto(i => (i + 1) % images.length)} />
              </>
            )}

            {/* Photo indicators */}
            {hasImages && images.length > 1 && (
              <div style={{
                position: 'absolute', top: 20, right: 20,
                display: 'flex', gap: 4,
              }}>
                {images.slice(0, 6).map((_, i) => (
                  <div key={i} style={{
                    height: 3, width: i === activePhoto ? 22 : 10,
                    borderRadius: 3,
                    background: i === activePhoto ? '#fff' : 'rgba(255,255,255,0.55)',
                    transition: 'width 320ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}/>
                ))}
                {images.length > 6 && (
                  <div style={{
                    fontSize: 11, color: '#fff', marginLeft: 6, fontWeight: 600,
                    textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                  }}>+{images.length - 6}</div>
                )}
              </div>
            )}

            {/* Bottom overlay */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '28px 28px 24px',
              background: 'linear-gradient(0deg, rgba(15,23,42,0.72) 0%, transparent 100%)',
              color: '#fff',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 10px', borderRadius: 999,
                  background: statusStyle.bg, color: statusStyle.fg,
                  fontSize: 11, fontWeight: 600, letterSpacing: '-0.005em',
                  textTransform: 'capitalize',
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', background: statusStyle.dot,
                    animation: status === 'active' ? 'ldPulseDot 1.8s infinite' : 'none',
                  }}/>
                  {status}
                </span>
                <span style={{ fontSize: 12, opacity: 0.92 }}>
                  {listing.created_at ? `Listed ${timeAgo(listing.created_at)}` : ''}
                  {hasImages ? ` · ${images.length} photo${images.length === 1 ? '' : 's'}` : ''}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <h1 style={{
                    margin: 0,
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontSize: 38, lineHeight: 1.04,
                    letterSpacing: '-0.025em', fontWeight: 700,
                  }}>
                    {listing.address}
                  </h1>
                  {subtitle && (
                    <div style={{ fontSize: 14, opacity: 0.92, marginTop: 6, fontWeight: 500 }}>
                      {subtitle}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link to={`/listings/${id}/edit`} className="btn-secondary" style={{
                    background: 'rgba(255,255,255,0.95)', border: 'none', padding: '8px 14px', fontSize: 13,
                  }}>
                    <Icon name="edit" size={13}/> Edit
                  </Link>
                  <a href={shareUrl} target="_blank" rel="noreferrer" className="btn-primary" style={{
                    padding: '8px 14px', fontSize: 13,
                  }}>
                    <Icon name="eye" size={13}/> Preview
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Gallery strip */}
          {hasImages && (
            <div style={{ padding: '16px 20px 18px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Gallery</span>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>
                    {activePhoto + 1} / {images.length}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <Link to={`/listings/${id}/edit`} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 12.5, fontWeight: 500, color: '#3b82f6',
                    padding: '6px 10px', borderRadius: 8,
                  }}>
                    <Icon name="plus" size={13}/> Manage photos
                  </Link>
                  {images.length > 8 && (
                    <button type="button" onClick={() => setGalleryExpanded(v => !v)} style={{
                      fontSize: 12.5, fontWeight: 500, color: '#475569',
                      padding: '6px 10px', borderRadius: 8,
                    }}>
                      {galleryExpanded ? 'Collapse' : 'View all'}
                    </button>
                  )}
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: galleryExpanded ? 'repeat(auto-fill, minmax(90px, 1fr))' : 'repeat(auto-fit, minmax(100px, 1fr))',
                gap: 8,
                transition: 'all 300ms',
              }}>
                {(galleryExpanded ? images : images.slice(0, 10)).map((p, i) => (
                  <Thumb key={p.id ?? i} img={p}
                    active={i === activePhoto}
                    onClick={() => setActivePhoto(i)}
                    delay={i * 0.03} />
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* ──────────────────────── SPECS CARD ──────────────────────── */}
        <Card delay={0.12}>
          {/* Share bar */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            background: 'linear-gradient(180deg, #f8fafc 0%, #fff 100%)',
          }}>
            <div style={{
              fontSize: 10.5, color: '#94a3b8', fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>Public link</div>
            <div style={{
              flex: 1, minWidth: 200,
              padding: '7px 12px',
              background: '#fff', border: '1px solid #e2e8f0',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', gap: 8,
              fontFamily: 'ui-monospace, Menlo, monospace',
              fontSize: 12.5, color: '#334155',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              <Icon name="zap" size={13} style={{ color: '#3b82f6', flexShrink: 0 }}/>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{shareUrl}</span>
            </div>
            <button type="button" onClick={handleCopy} className={copied ? 'btn-secondary' : 'btn-primary'}
              style={{ padding: '7px 12px', fontSize: 12.5 }}>
              {copied ? <><Icon name="check" size={13}/> Copied</> : <><Icon name="copy" size={13}/> Copy link</>}
            </button>
            <button type="button" onClick={() => setShowQr(v => !v)} className="btn-secondary"
              style={{ padding: '7px 12px', fontSize: 12.5 }} aria-expanded={showQr}>
              <Icon name="qr" size={13}/> QR
            </button>
          </div>

          {copyError && (
            <div style={{ padding: '8px 20px 0' }}>
              <p className="text-xs text-red-600">Could not copy — please select and copy the URL manually.</p>
            </div>
          )}

          {showQr && (
            <div style={{
              margin: '14px 20px 0',
              padding: 14, borderRadius: 12,
              background: '#f8fafc', border: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', gap: 16,
              animation: 'ldFloatIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both',
            }}>
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR code for listing URL" style={{ width: 120, height: 120, borderRadius: 8, background: '#fff' }} />
              ) : (
                <div style={{ width: 120, height: 120, background: '#fff', borderRadius: 8 }} className="animate-pulse"/>
              )}
              <div style={{ fontSize: 13, color: '#475569' }}>
                <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>Scan to open the listing</p>
                <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Useful for auction signage or print handouts.</p>
                {qrDataUrl && (
                  <a href={qrDataUrl} download={`listing-${listing.short_code}.png`}
                    style={{ display: 'inline-block', marginTop: 8, fontSize: 12, color: '#3b82f6' }}>
                    Download PNG
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Price + description */}
          <div style={{ padding: '20px 20px 4px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px', minWidth: 240 }}>
              <div style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Asking price</div>
              {listing.asking_price ? (
                <div style={{
                  fontSize: 38, lineHeight: 1.05, letterSpacing: '-0.025em', fontWeight: 700, color: '#1e3a5f',
                }}>
                  {listing.asking_price}
                </div>
              ) : (
                <div style={{ fontSize: 20, color: '#94a3b8', fontWeight: 500 }}>Price on request</div>
              )}
            </div>
            {listing.description && (
              <div style={{ flex: '2 1 400px', minWidth: 260 }}>
                <div style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>About this home</div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#334155', whiteSpace: 'pre-wrap' }}>
                  {listing.description}
                </p>
              </div>
            )}
          </div>

          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 1,
            background: '#e2e8f0',
            borderTop: '1px solid #e2e8f0',
            marginTop: 20,
          }}>
            <StatTile icon="bed" label="Bedrooms" value={listing.bedrooms} suffix="" delay={0.18} />
            <StatTile icon="bath" label="Bathrooms" value={listing.bathrooms} suffix="" delay={0.24} />
            <StatTile icon="ruler" label="Floor area" value={listing.floor_area} suffix=" m²" delay={0.30} />
            <StatTile icon="tree" label="Land area" value={listing.land_area} suffix=" m²" delay={0.36} />
          </div>
        </Card>

        {/* ──────────────────────── DOCS + LEADS GRID ──────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)',
          gap: 20,
        }} className="ld-docs-leads-grid">
          {/* DOCUMENTS CARD */}
          <Card
            delay={0.18}
            onMouseEnter={() => setDocsCardHov(true)}
            onMouseLeave={() => setDocsCardHov(false)}
            style={{
              padding: 0,
              boxShadow: (docsCardHov || docsOpen)
                ? '0 24px 60px -24px rgba(15,23,42,0.22), 0 1px 0 rgba(15,23,42,0.04)'
                : undefined,
            }}
          >
            <button type="button" onClick={() => setDocsOpen(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '18px 20px', width: '100%', textAlign: 'left',
                background: (docsCardHov || docsOpen) ? '#f8fafc' : 'transparent',
                borderRadius: docsOpen ? '12px 12px 0 0' : 12,
                transition: 'background 220ms ease',
                cursor: 'pointer',
              }}>
              <DocIconStack active={docsCardHov || docsOpen} docs={docs} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', color: '#0f172a' }}>
                    Documents
                  </h3>
                  <Chip>{docs.length}</Chip>
                </div>
                {docsOpen ? (
                  <div style={{ fontSize: 12.5, color: '#64748b' }}>
                    Uploaded files buyers can request during enquiry.
                  </div>
                ) : docs.length > 0 ? (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {docs.slice(0, 4).map(d => {
                      const tone = KIND_TONES[d.kind] || KIND_TONES.other;
                      return (
                        <Chip key={d.id} bg={tone + '15'} fg={tone} border={tone + '33'}>
                          {KIND_LABELS[d.kind] || d.kind}
                        </Chip>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, color: '#94a3b8' }}>
                    No documents uploaded yet.
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                {!docsOpen && docs.length > 0 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 999,
                    background: '#f1f5f9', fontSize: 11.5, fontWeight: 600, color: '#475569',
                  }}>
                    <Icon name="download" size={12}/>
                    {totalDownloads}
                  </div>
                )}
                <div style={{
                  width: 28, height: 28, borderRadius: 9,
                  display: 'grid', placeItems: 'center',
                  background: '#f1f5f9',
                }}>
                  <Icon name="chevron-right" size={14} style={{
                    color: '#475569',
                    transition: 'transform 360ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    transform: docsOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                  }}/>
                </div>
              </div>
            </button>

            <div style={{
              maxHeight: docsOpen ? 1800 : 0,
              opacity: docsOpen ? 1 : 0,
              overflow: 'hidden',
              transition: 'max-height 500ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 320ms ease',
            }}>
              <div style={{ borderTop: '1px solid #e2e8f0' }}>
                {/* Upload form */}
                <form onSubmit={handleUpload} style={{
                  margin: '14px 18px',
                  padding: '14px 16px',
                  background: '#f8fafc',
                  border: '1.5px dashed #cbd5e1',
                  borderRadius: 14,
                }}>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
                    <div>
                      <label className="label" htmlFor="upload-kind">Type</label>
                      <select id="upload-kind" className="input"
                        value={uploadKind} onChange={e => setUploadKind(e.target.value)}>
                        <option value="lim">LIM Report</option>
                        <option value="title">Title</option>
                        <option value="builders_report">Builder's Report</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label" htmlFor="upload-label">Label</label>
                      <input id="upload-label" className="input"
                        value={uploadLabel} onChange={e => setUploadLabel(e.target.value)}
                        maxLength={120} placeholder="e.g. LIM Report 2026"/>
                    </div>
                    <div>
                      <label className="label" htmlFor="upload-file">PDF file</label>
                      <input id="upload-file" type="file" accept="application/pdf"
                        onChange={e => setUploadFile(e.target.files?.[0] || null)}
                        className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-slate-300 file:text-sm file:font-medium file:bg-white file:text-slate-700 hover:file:bg-slate-100"/>
                    </div>
                  </div>

                  {uploadError && (
                    <p className="text-sm text-red-600 mb-2">{uploadError}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">PDF only · Max 20 MB</p>
                    <button type="submit" disabled={uploading} className="btn-primary">
                      {uploading ? (
                        <>
                          <span className="inline-block w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                          Uploading...
                        </>
                      ) : 'Upload'}
                    </button>
                  </div>
                </form>

                {/* Doc rows */}
                {docs.length === 0 ? (
                  <div style={{ padding: '12px 20px 22px' }}>
                    <EmptyState
                      title="No documents yet"
                      hint="Upload the LIM, Title, and builders report so buyers can request them."
                    />
                  </div>
                ) : (
                  <div style={{ padding: '4px 10px 14px' }}>
                    {docs.map((d, i) => (
                      <DocRow key={d.id} doc={d}
                        delay={0.05 + i * 0.07}
                        hovered={hoveredDoc === d.id}
                        onEnter={() => setHoveredDoc(d.id)}
                        onLeave={() => setHoveredDoc(null)}
                        onDelete={() => askDeleteDoc(d)} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* LEADS CARD */}
          <Card
            delay={0.24}
            onMouseEnter={() => setLeadsCardHov(true)}
            onMouseLeave={() => setLeadsCardHov(false)}
            style={{
              padding: 0,
              boxShadow: (leadsCardHov || leadsOpen)
                ? '0 24px 60px -24px rgba(15,23,42,0.22), 0 1px 0 rgba(15,23,42,0.04)'
                : undefined,
            }}
          >
            <button type="button" onClick={() => setLeadsOpen(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '18px 20px', width: '100%', textAlign: 'left',
                background: (leadsCardHov || leadsOpen) ? '#f8fafc' : 'transparent',
                borderRadius: leadsOpen ? '12px 12px 0 0' : 12,
                transition: 'background 220ms ease',
                cursor: 'pointer',
              }}>
              <LeadAvatarCluster active={leadsCardHov || leadsOpen} leads={leads} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', color: '#0f172a' }}>
                    Leads
                  </h3>
                  <Chip>{leads.length}</Chip>
                </div>
                {leadsOpen ? (
                  <div style={{ fontSize: 12.5, color: '#64748b' }}>
                    Enquiries from buyers who've viewed your listing.
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, color: '#64748b' }}>
                    {leads.length === 0
                      ? 'Share the listing URL to start getting enquiries.'
                      : `${leads.length} enquir${leads.length === 1 ? 'y' : 'ies'} received.`}
                  </div>
                )}
              </div>

              <div style={{
                width: 28, height: 28, borderRadius: 9,
                display: 'grid', placeItems: 'center',
                background: '#f1f5f9', flexShrink: 0,
              }}>
                <Icon name="chevron-right" size={14} style={{
                  color: '#475569',
                  transition: 'transform 360ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transform: leadsOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                }}/>
              </div>
            </button>

            <div style={{
              maxHeight: leadsOpen ? 1600 : 0,
              opacity: leadsOpen ? 1 : 0,
              overflow: 'hidden',
              transition: 'max-height 500ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 320ms ease',
            }}>
              <div style={{ borderTop: '1px solid #e2e8f0' }}>
                {leads.length === 0 ? (
                  <div style={{ padding: '16px 20px 24px' }}>
                    <EmptyState
                      title="No leads yet"
                      hint="Share your listing URL to start getting enquiries."
                      action={
                        <button type="button" onClick={handleCopy} className="btn-primary">
                          {copied ? 'Copied!' : 'Copy share URL'}
                        </button>
                      }
                    />
                  </div>
                ) : (
                  <div style={{ padding: '8px 10px 14px' }}>
                    {leads.map((l, i) => (
                      <LeadRow key={l.id} lead={l}
                        delay={0.05 + i * 0.07}
                        expanded={expandedLead === l.id}
                        onToggle={() => setExpandedLead(expandedLead === l.id ? null : l.id)} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 4px',
          fontSize: 11.5, color: '#94a3b8',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 8,
          animation: 'ldFloatIn 0.6s 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        }}>
          <span>Listing ID · <span style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>#{listing.short_code}</span></span>
          <span>{listing.updated_at ? `Last edited ${timeAgo(listing.updated_at)}` : 'Never edited'}</span>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .ld-docs-leads-grid { grid-template-columns: minmax(0, 1fr) !important; }
        }
      `}</style>

      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title || ''}
        message={confirmState?.message || ''}
        confirmText={confirmState?.confirmText}
        danger={confirmState?.danger}
        busy={deletingListing}
        onConfirm={runConfirm}
        onCancel={() => { if (!deletingListing) setConfirmState(null); }}
      />
    </div>
  );
}

/* ───────────── presentational sub-components ───────────── */

function Card({ children, delay = 0, style = {}, onMouseEnter, onMouseLeave }) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 0 rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.04)',
        overflow: 'hidden',
        animation: `ldFloatIn 0.7s ${delay}s cubic-bezier(0.34, 1.56, 0.64, 1) both`,
        transition: 'box-shadow 260ms ease',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Chip({ children, bg, fg, border }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 999,
      background: bg || '#f1f5f9',
      color: fg || '#475569',
      border: `1px solid ${border || '#e2e8f0'}`,
      fontSize: 11, fontWeight: 600, letterSpacing: '-0.005em',
    }}>{children}</span>
  );
}

function Thumb({ img, active, onClick, delay }) {
  const [hov, setHov] = useState(false);
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative',
        aspectRatio: '4/3', borderRadius: 10,
        background: '#f1f5f9',
        border: active ? '2px solid #3b82f6' : '2px solid transparent',
        outline: active ? '3px solid rgba(59,130,246,0.2)' : 'none',
        padding: 0, overflow: 'hidden',
        transition: 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), outline 200ms',
        transform: hov ? 'translateY(-3px) scale(1.03)' : 'translateY(0)',
        boxShadow: hov ? '0 12px 22px -10px rgba(15,23,42,0.35)' : '0 1px 2px rgba(15,23,42,0.06)',
        animation: `ldFloatIn 0.55s ${delay}s cubic-bezier(0.34, 1.56, 0.64, 1) both`,
        cursor: 'pointer',
      }}
    >
      <img src={img.thumb_url || img.url} alt="" loading="lazy"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
    </button>
  );
}

function ArrowBtn({ side, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      aria-label={side === 'left' ? 'Previous photo' : 'Next photo'}
      style={{
        position: 'absolute',
        [side]: 14,
        top: '50%', transform: `translateY(-50%) ${hov ? 'scale(1.08)' : 'scale(1)'}`,
        width: 36, height: 36, borderRadius: 999,
        background: hov ? '#fff' : 'rgba(255,255,255,0.92)',
        color: '#0f172a',
        display: 'grid', placeItems: 'center',
        boxShadow: '0 4px 12px -4px rgba(15,23,42,0.35)',
        transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        backdropFilter: 'blur(6px)',
      }}>
      <Icon name={side === 'left' ? 'chevron-left' : 'chevron-right'} size={16}/>
    </button>
  );
}

function StatTile({ icon, label, value, suffix, delay }) {
  const [hov, setHov] = useState(false);
  const missing = value === null || value === undefined || value === '';
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '16px 18px',
        background: hov ? '#f8fafc' : '#fff',
        transition: 'background 200ms',
        animation: `ldFloatIn 0.55s ${delay}s cubic-bezier(0.34, 1.56, 0.64, 1) both`,
      }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 30, height: 30, borderRadius: 8,
        background: hov ? '#1e3a5f' : '#f1f5f9',
        color: hov ? '#fff' : '#1e3a5f',
        transition: 'all 260ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: hov ? 'rotate(-8deg) scale(1.1)' : 'rotate(0)',
        marginBottom: 9,
      }}>
        <Icon name={icon} size={15}/>
      </div>
      <div style={{
        fontSize: 10.5, color: '#94a3b8', fontWeight: 600,
        letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2,
      }}>{label}</div>
      <div style={{ fontSize: 24, lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 700, color: '#0f172a' }}>
        {missing ? (
          <span style={{ color: '#cbd5e1', fontWeight: 500 }}>—</span>
        ) : (
          <>
            <AnimatedNumber value={value} format={(v) => Math.round(v).toLocaleString()} />
            <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>{suffix}</span>
          </>
        )}
      </div>
    </div>
  );
}

function DocIconStack({ active, docs }) {
  const take = docs.slice(0, 3);
  while (take.length < 3) take.push({ id: `stub-${take.length}`, kind: 'other' });
  return (
    <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
      {take.map((d, i) => {
        const offsets = [
          { x: -8, y: 4, r: -10 },
          { x:  0, y: 0, r:  0  },
          { x:  8, y: 4, r:  10 },
        ];
        const o = offsets[i];
        const tone = KIND_TONES[d.kind] || KIND_TONES.other;
        return (
          <div key={d.id} style={{
            position: 'absolute',
            left: '50%', top: '50%',
            width: 30, height: 38,
            background: '#fff', borderRadius: 5,
            border: '1px solid #e2e8f0',
            boxShadow: active ? `0 8px 16px -6px ${tone}55` : '0 2px 4px rgba(15,23,42,0.07)',
            transition: 'transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 280ms ease',
            transform: active
              ? `translate(calc(-50% + ${o.x}px), calc(-50% + ${o.y}px)) rotate(${o.r}deg)`
              : `translate(calc(-50% + ${i * 2 - 2}px), calc(-50% - ${i * 1}px))`,
            zIndex: i + 1,
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, right: 0,
              width: 9, height: 9,
              background: 'linear-gradient(225deg, transparent 50%, #e2e8f0 50%)',
            }}/>
            <div style={{ padding: '7px 3px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[90, 70, 85, 60].map((w, j) => (
                <div key={j} style={{ height: 2, width: `${w}%`, background: '#e2e8f0', borderRadius: 1 }}/>
              ))}
            </div>
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: 4, background: tone,
            }}/>
          </div>
        );
      })}
    </div>
  );
}

function DocRow({ doc, delay, hovered, onEnter, onLeave, onDelete }) {
  const tone = KIND_TONES[doc.kind] || KIND_TONES.other;
  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '10px 12px',
        borderRadius: 12,
        background: hovered ? '#f8fafc' : 'transparent',
        transition: 'all 260ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: hovered ? 'translateX(3px)' : 'translateX(0)',
        animation: `ldFloatIn 0.55s ${delay}s cubic-bezier(0.34, 1.56, 0.64, 1) both`,
      }}
    >
      <div style={{
        position: 'relative',
        width: 46, height: 56,
        background: '#fff', borderRadius: 6,
        border: '1px solid #e2e8f0',
        boxShadow: hovered ? `0 10px 18px -8px ${tone}55` : '0 1px 2px rgba(15,23,42,0.06)',
        transition: 'all 260ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: hovered ? 'rotate(-4deg) translateY(-2px)' : 'rotate(0)',
        flexShrink: 0, overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: 12, height: 12,
          background: 'linear-gradient(225deg, transparent 50%, #e2e8f0 50%)',
        }}/>
        <div style={{ padding: '9px 5px 0', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {[90, 70, 85, 60, 75].map((w, i) => (
            <div key={i} style={{ height: 2, width: `${w}%`, background: '#e2e8f0', borderRadius: 1 }}/>
          ))}
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: tone }}/>
        <div style={{ position: 'absolute', bottom: 7, left: 3, fontSize: 7, fontWeight: 700, color: tone, letterSpacing: '0.05em' }}>PDF</div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', letterSpacing: '-0.005em' }}>
            {doc.label}
          </span>
          <Chip bg={tone + '15'} fg={tone} border={tone + '33'}>
            {KIND_LABELS[doc.kind] || doc.kind}
          </Chip>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748b', flexWrap: 'wrap' }}>
          <span>{formatBytes(doc.file_size)}</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#cbd5e1' }}/>
          <span>Uploaded {doc.uploaded_at ? timeAgo(doc.uploaded_at) : '—'}</span>
          {(doc.download_count || 0) > 0 && (
            <>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#cbd5e1' }}/>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name="download" size={11}/> {doc.download_count}
              </span>
            </>
          )}
        </div>
      </div>

      <div style={{
        display: 'flex', gap: 4, flexShrink: 0,
        opacity: hovered ? 1 : 0.35,
        transition: 'opacity 220ms',
      }}>
        <button type="button" onClick={onDelete} aria-label={`Delete ${doc.label}`} title="Delete document"
          style={{
            width: 30, height: 30, borderRadius: 8,
            color: hovered ? '#dc2626' : '#94a3b8',
            display: 'grid', placeItems: 'center',
            transition: 'all 180ms',
            background: hovered ? '#fef2f2' : 'transparent',
          }}>
          <Icon name="trash" size={15}/>
        </button>
      </div>
    </div>
  );
}

function LeadAvatarCluster({ active, leads }) {
  if (leads.length === 0) {
    return (
      <div style={{
        width: 52, height: 52, borderRadius: 999,
        background: '#f1f5f9', border: '1px dashed #cbd5e1',
        display: 'grid', placeItems: 'center', color: '#94a3b8',
        flexShrink: 0,
      }}>
        <Icon name="mail" size={18}/>
      </div>
    );
  }
  const take = leads.slice(0, 5);
  return (
    <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
      {take.map((l, i) => {
        const fanAngles = [-40, -20, 0, 20, 40];
        const fanRadius = 16;
        const angle = (fanAngles[Math.min(i, 4)] * Math.PI) / 180;
        const fx = Math.sin(angle) * fanRadius;
        const fy = -Math.abs(Math.cos(angle)) * fanRadius * 0.4;
        const sx = (i - 2) * 3;
        const hue = hashHue(l.name || l.email || String(l.id));
        const color = `hsl(${hue}, 55%, 45%)`;
        return (
          <div key={l.id} style={{
            position: 'absolute',
            left: '50%', top: '50%',
            width: 28, height: 28, borderRadius: '50%',
            background: `linear-gradient(135deg, ${color} 0%, hsl(${hue}, 55%, 55%) 100%)`,
            border: '2px solid #fff',
            boxShadow: active ? `0 6px 14px -4px ${color}55` : '0 1px 2px rgba(15,23,42,0.1)',
            display: 'grid', placeItems: 'center',
            color: '#fff', fontSize: 10, fontWeight: 700,
            transition: 'transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 280ms ease',
            transform: active
              ? `translate(calc(-50% + ${fx}px), calc(-50% + ${fy}px))`
              : `translate(calc(-50% + ${sx}px), -50%)`,
            zIndex: i + 1,
          }}>
            {initialsFor(l.name)}
          </div>
        );
      })}
    </div>
  );
}

function LeadRow({ lead, delay, expanded, onToggle }) {
  const [hov, setHov] = useState(false);
  const hue = hashHue(lead.name || lead.email || String(lead.id));
  const color = `hsl(${hue}, 55%, 45%)`;
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 12,
        background: hov || expanded ? '#f8fafc' : 'transparent',
        transition: 'background 200ms',
        animation: `ldFloatIn 0.55s ${delay}s cubic-bezier(0.34, 1.56, 0.64, 1) both`,
        overflow: 'hidden',
        marginBottom: 2,
      }}
    >
      <button type="button" onClick={onToggle} style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 12px',
        width: '100%', textAlign: 'left',
        transition: 'transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: hov && !expanded ? 'translateX(3px)' : 'translateX(0)',
      }}>
        <div style={{
          position: 'relative',
          width: 38, height: 38, borderRadius: '50%',
          background: `linear-gradient(135deg, ${color} 0%, hsl(${hue}, 55%, 55%) 100%)`,
          display: 'grid', placeItems: 'center', color: '#fff',
          fontWeight: 600, fontSize: 13, letterSpacing: '-0.01em',
          boxShadow: hov ? `0 8px 16px -6px ${color}66` : '0 1px 2px rgba(15,23,42,0.1)',
          transition: 'all 260ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: hov ? 'scale(1.06) rotate(-4deg)' : 'scale(1)',
          flexShrink: 0,
        }}>
          {initialsFor(lead.name)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', letterSpacing: '-0.005em', marginBottom: 2 }}>
            {lead.name || lead.email}
          </div>
          <div style={{
            fontSize: 12.5, color: '#64748b',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {lead.message || lead.email || 'No message'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11.5, color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
            {timeAgo(lead.created_at)}
          </span>
          <Icon name="chevron-right" size={14} style={{
            color: '#94a3b8',
            transition: 'transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0)',
          }}/>
        </div>
      </button>

      <div style={{
        maxHeight: expanded ? 240 : 0,
        opacity: expanded ? 1 : 0,
        transition: 'max-height 360ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 280ms',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '4px 14px 14px 60px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lead.message && (
            <div style={{
              padding: 12, background: '#fff',
              borderRadius: 10, border: '1px solid #e2e8f0',
              fontSize: 13, lineHeight: 1.5, color: '#334155',
            }}>
              "{lead.message}"
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {lead.email && (
              <a href={`mailto:${lead.email}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#3b82f6' }}>
                <Icon name="mail" size={12}/> {lead.email}
              </a>
            )}
            {lead.phone && (
              <a href={`tel:${lead.phone}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#3b82f6' }}>
                <Icon name="phone" size={12}/> {lead.phone}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, hint, action }) {
  return (
    <div className="text-center py-6">
      <p className="text-slate-700 font-medium">{title}</p>
      {hint && <p className="text-sm text-slate-500 mt-1">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
