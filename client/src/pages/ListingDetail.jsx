import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const KIND_LABELS = {
  lim: 'LIM',
  title: 'Title',
  builders_report: "Builder's Report",
  other: 'Other',
};

const KIND_COLORS = {
  lim: 'bg-purple-100 text-purple-800',
  title: 'bg-blue-100 text-blue-800',
  builders_report: 'bg-amber-100 text-amber-800',
  other: 'bg-slate-100 text-slate-700',
};

const STATUS_CLASSES = {
  active: 'bg-green-100 text-green-800',
  draft: 'bg-slate-100 text-slate-700',
  sold: 'bg-blue-100 text-blue-800',
  withdrawn: 'bg-amber-100 text-amber-800',
};

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api, token } = useAuth();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const [uploadKind, setUploadKind] = useState('lim');
  const [uploadLabel, setUploadLabel] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [deletingListing, setDeletingListing] = useState(false);

  const load = () => api(`/api/listings/${id}`).then(setListing).catch(err => setError(err.message));

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [id]);

  const shareUrl = listing
    ? `${window.location.origin}/p/${listing.short_code}`
    : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert('Copy failed: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this listing? All documents and lead records will be removed permanently.')) return;
    setDeletingListing(true);
    try {
      await api(`/api/listings/${id}`, { method: 'DELETE' });
      navigate('/listings');
    } catch (err) {
      alert(err.message);
      setDeletingListing(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploadError('');

    if (!uploadFile) {
      setUploadError('Please choose a PDF file');
      return;
    }
    if (uploadFile.size > 20 * 1024 * 1024) {
      setUploadError('Max 20MB');
      return;
    }
    if (uploadFile.type && uploadFile.type !== 'application/pdf') {
      setUploadError('Only PDF files are allowed');
      return;
    }
    if (!uploadLabel.trim()) {
      setUploadError('Label is required');
      return;
    }
    if (uploadLabel.length > 120) {
      setUploadError('Label must be 120 characters or fewer');
      return;
    }

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

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    try {
      await api(`/api/listings/${id}/documents/${docId}`, { method: 'DELETE' });
      setListing(prev => ({
        ...prev,
        documents: (prev.documents || []).filter(d => d.id !== docId),
      }));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

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

  return (
    <div>
      <Link to="/listings" className="text-sm text-primary hover:underline mb-4 inline-block">← Back to Listings</Link>

      {/* Sticky header */}
      <div className="lg:sticky lg:top-0 lg:z-10 lg:-mx-8 lg:px-8 lg:py-4 lg:bg-white/80 lg:backdrop-blur lg:border-b lg:border-slate-200 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 truncate">{listing.address}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_CLASSES[listing.status] || 'bg-slate-100 text-slate-700'}`}>
                {listing.status}
              </span>
            </div>
            <p className="text-slate-500 mt-1">
              {[listing.suburb, listing.city].filter(Boolean).join(', ') || '—'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/listings/${id}/edit`} className="btn-secondary">Edit</Link>
            <button onClick={handleDelete} disabled={deletingListing} className="btn-danger">
              {deletingListing ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>

        {/* Share URL row */}
        <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 font-mono truncate">
            {shareUrl}
          </div>
          <button onClick={handleCopy} className="btn-primary whitespace-nowrap">
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary whitespace-nowrap"
          >
            Preview
          </a>
        </div>
      </div>

      {/* Details */}
      <div className="card mb-6">
        {listing.hero_image_url && (
          <img
            src={listing.hero_image_url}
            alt={listing.address}
            className="w-full h-64 sm:h-80 object-cover rounded-lg mb-6"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}

        {listing.asking_price && (
          <div className="mb-6">
            <p className="text-sm text-slate-500 uppercase tracking-wide">Asking price</p>
            <p className="text-2xl font-bold text-navy">{listing.asking_price}</p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Stat label="Bedrooms" value={listing.bedrooms} />
          <Stat label="Bathrooms" value={listing.bathrooms} />
          <Stat label="Floor area" value={listing.floor_area ? `${listing.floor_area} m²` : null} />
          <Stat label="Land area" value={listing.land_area ? `${listing.land_area} m²` : null} />
        </div>

        {listing.description && (
          <div>
            <p className="text-sm text-slate-500 uppercase tracking-wide mb-2">Description</p>
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{listing.description}</p>
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Documents ({docs.length})</h2>
        </div>

        <form onSubmit={handleUpload} className="bg-slate-50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="label" htmlFor="upload-kind">Type</label>
              <select
                id="upload-kind"
                className="input"
                value={uploadKind}
                onChange={e => setUploadKind(e.target.value)}
              >
                <option value="lim">LIM Report</option>
                <option value="title">Title</option>
                <option value="builders_report">Builder's Report</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="upload-label">Label</label>
              <input
                id="upload-label"
                className="input"
                value={uploadLabel}
                onChange={e => setUploadLabel(e.target.value)}
                maxLength={120}
                placeholder="e.g. LIM Report 2026"
              />
            </div>
            <div>
              <label className="label" htmlFor="upload-file">PDF file</label>
              <input
                id="upload-file"
                type="file"
                accept="application/pdf"
                onChange={e => setUploadFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-slate-300 file:text-sm file:font-medium file:bg-white file:text-slate-700 hover:file:bg-slate-100"
              />
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

        {docs.length === 0 ? (
          <p className="text-slate-400 text-center py-6 text-sm">No documents uploaded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Type</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Label</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Size</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Uploaded</th>
                  <th className="text-right py-3 px-2 font-medium text-slate-500"></th>
                </tr>
              </thead>
              <tbody>
                {docs.map(d => (
                  <tr key={d.id} className="border-b border-slate-50">
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${KIND_COLORS[d.kind] || KIND_COLORS.other}`}>
                        {KIND_LABELS[d.kind] || d.kind}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-slate-700 font-medium">{d.label}</td>
                    <td className="py-3 px-2 text-slate-500">{formatBytes(d.file_size)}</td>
                    <td className="py-3 px-2 text-slate-500">
                      {d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString('en-NZ') : '—'}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button
                        onClick={() => handleDeleteDoc(d.id)}
                        aria-label={`Delete ${d.label}`}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Leads */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Leads ({leads.length})</h2>
        </div>

        {leads.length === 0 ? (
          <p className="text-slate-400 text-center py-6 text-sm">
            No leads yet — share your listing URL to start getting enquiries.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Name</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Email</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Phone</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(l => (
                  <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-3 px-2 font-medium">{l.name}</td>
                    <td className="py-3 px-2">
                      <a href={`mailto:${l.email}`} className="text-primary hover:underline">{l.email}</a>
                    </td>
                    <td className="py-3 px-2">
                      {l.phone ? (
                        <a href={`tel:${l.phone}`} className="text-primary hover:underline">{l.phone}</a>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-3 px-2 text-slate-500">
                      {l.created_at ? new Date(l.created_at).toLocaleString('en-NZ') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold text-slate-900">
        {value !== null && value !== undefined && value !== '' ? value : <span className="text-slate-300">—</span>}
      </p>
    </div>
  );
}
