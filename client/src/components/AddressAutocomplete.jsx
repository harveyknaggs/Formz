import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function AddressAutocomplete({ value, onChange, onSelect, disabled, placeholder = '12 Kauri Street, Auckland' }) {
  const { api } = useAuth();
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lookupUnavailable, setLookupUnavailable] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const runSearch = (q) => {
    clearTimeout(debounceRef.current);
    if (q.trim().length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api(`/api/listings/address-search?q=${encodeURIComponent(q.trim())}`);
        setResults(data.results || []);
        setOpen(true);
        setActiveIndex(-1);
        setLookupUnavailable(false);
      } catch (err) {
        if (err.message && err.message.toLowerCase().includes('not configured')) {
          setLookupUnavailable(true);
        }
        setResults([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleInput = (e) => {
    const v = e.target.value;
    setQuery(v);
    if (onChange) onChange(v);
    runSearch(v);
  };

  const handlePick = async (item) => {
    setQuery(item.full_address || '');
    setResults([]);
    setOpen(false);
    if (onChange) onChange(item.full_address || '');
    if (!onSelect) return;

    let parcel = { legal_description: null, land_area_m2: null, title_references: [], tenure_type: null };
    if (item.latitude != null && item.longitude != null) {
      try {
        parcel = await api(`/api/listings/address-details?latitude=${item.latitude}&longitude=${item.longitude}`);
      } catch {
        // parcel lookup is optional; keep address-only select
      }
    }
    onSelect({
      address: item.full_address || '',
      suburb: item.suburb || '',
      city: item.city || '',
      postcode: item.postcode || '',
      latitude: item.latitude ?? null,
      longitude: item.longitude ?? null,
      legal_description: parcel.legal_description || null,
      land_area_m2: parcel.land_area_m2 ?? null,
      title_references: Array.isArray(parcel.title_references) ? parcel.title_references : [],
      tenure_type: parcel.tenure_type || null,
    });
  };

  const handleKeyDown = (e) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handlePick(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        className="input"
        value={query}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        maxLength={200}
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
        </div>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-72 overflow-auto">
          {results.map((r, i) => (
            <li
              key={r.linz_id || i}
              onMouseDown={(e) => { e.preventDefault(); handlePick(r); }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`px-3 py-2 text-sm cursor-pointer ${i === activeIndex ? 'bg-primary/10 text-primary' : 'text-slate-700 hover:bg-slate-50'}`}
            >
              <div className="font-medium">{r.full_address}</div>
              {(r.suburb || r.city) && (
                <div className="text-xs text-slate-500">
                  {[r.suburb, r.city, r.postcode].filter(Boolean).join(' · ')}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {lookupUnavailable && (
        <p className="text-xs text-slate-500 mt-1">
          Address lookup is unavailable — type the address manually.
        </p>
      )}
    </div>
  );
}
