import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function PhotoManager({ listingId, images, onChange }) {
  const { token } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [dragImageId, setDragImageId] = useState(null);
  const fileInputRef = useRef(null);

  const sorted = [...(images || [])].sort((a, b) => {
    if (a.is_hero !== b.is_hero) return b.is_hero - a.is_hero;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;

    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      for (const f of files) formData.append('files', f);

      const res = await fetch(`/api/listings/${listingId}/images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      const existingIds = new Set((images || []).map(i => i.id));
      const newImages = data.filter(d => !existingIds.has(d.id));
      onChange([...(images || []), ...newImages]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e) => {
    handleFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
  };

  const handleDelete = async (imageId) => {
    const img = (images || []).find(i => i.id === imageId);
    if (!img) return;
    if (!window.confirm(`Remove this photo?${img.is_hero ? ' (The next photo will become the cover.)' : ''}`)) return;

    setError('');
    try {
      const res = await fetch(`/api/listings/${listingId}/images/${imageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Delete failed');
      }
      const remaining = (images || []).filter(i => i.id !== imageId);
      if (img.is_hero && remaining.length > 0) {
        remaining[0] = { ...remaining[0], is_hero: 1 };
      }
      onChange(remaining);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSetHero = async (imageId) => {
    setError('');
    try {
      const res = await fetch(`/api/listings/${listingId}/images/${imageId}/hero`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not set cover');
      onChange(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const commitReorder = async (nextOrder) => {
    onChange(nextOrder);
    try {
      const res = await fetch(`/api/listings/${listingId}/images/reorder`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order: nextOrder.map(i => i.id) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Reorder failed');
      onChange(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDragStart = (id) => (e) => {
    setDragImageId(id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOverImage = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDropOnImage = (targetId) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragImageId || dragImageId === targetId) {
      setDragImageId(null);
      return;
    }
    const current = sorted;
    const fromIdx = current.findIndex(i => i.id === dragImageId);
    const toIdx = current.findIndex(i => i.id === targetId);
    if (fromIdx < 0 || toIdx < 0) { setDragImageId(null); return; }
    const next = [...current];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setDragImageId(null);
    commitReorder(next);
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragActive ? 'border-primary bg-primary/5' : 'border-slate-300 bg-slate-50'
        }`}
      >
        <svg className="w-10 h-10 mx-auto text-slate-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm text-slate-700 font-medium">
          {uploading ? 'Uploading...' : 'Drag photos here or click to choose'}
        </p>
        <p className="text-xs text-slate-500 mt-1">JPG, PNG, WEBP or HEIC · up to 12 MB each · max 20 at a time</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleInputChange}
          className="sr-only"
          id="photo-manager-input"
          disabled={uploading}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="btn-primary mt-3"
        >
          {uploading ? 'Uploading...' : 'Choose photos'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}

      {sorted.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-700">
              {sorted.length} photo{sorted.length === 1 ? '' : 's'}
            </p>
            <p className="text-xs text-slate-500">Drag to reorder · star = cover photo</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {sorted.map(img => (
              <div
                key={img.id}
                draggable
                onDragStart={handleDragStart(img.id)}
                onDragOver={handleDragOverImage}
                onDrop={handleDropOnImage(img.id)}
                className={`relative group rounded-lg overflow-hidden border-2 ${
                  img.is_hero ? 'border-primary' : 'border-slate-200'
                } ${dragImageId === img.id ? 'opacity-50' : ''} bg-slate-100 cursor-move`}
              >
                <img
                  src={img.thumb_url || img.url}
                  alt={img.alt || ''}
                  className="w-full h-32 object-cover pointer-events-none"
                  draggable={false}
                />
                {img.is_hero && (
                  <div className="absolute top-1 left-1 bg-primary text-white text-xs px-2 py-0.5 rounded-full font-medium">
                    Cover
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {!img.is_hero && (
                    <button
                      type="button"
                      onClick={() => handleSetHero(img.id)}
                      className="bg-white text-slate-800 text-xs font-medium px-2 py-1 rounded hover:bg-slate-100"
                    >
                      Set as cover
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(img.id)}
                    aria-label="Delete photo"
                    className="bg-white text-red-600 w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-50"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
