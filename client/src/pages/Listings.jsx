import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Listings() {
  const { api } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    api('/api/listings')
      .then(data => { if (!cancelled) setListings(Array.isArray(data) ? data : []); })
      .catch(err => { if (!cancelled) console.error(err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [api]);

  const term = search.trim().toLowerCase();
  const filtered = term
    ? listings.filter(l =>
        (l.address || '').toLowerCase().includes(term) ||
        (l.suburb || '').toLowerCase().includes(term) ||
        (l.city || '').toLowerCase().includes(term) ||
        (l.short_code || '').toLowerCase().includes(term)
      )
    : listings;

  const activeCount = listings.filter(l => l.status === 'active').length;

  const statusClass = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-slate-100 text-slate-700';
      case 'sold': return 'bg-blue-100 text-blue-800';
      case 'withdrawn': return 'bg-amber-100 text-amber-800';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Listings</h1>
          <p className="text-slate-500 mt-1">
            {activeCount} active · {listings.length} total
          </p>
        </div>
        <Link to="/listings/new" className="btn-primary">+ Add listing</Link>
      </div>

      {listings.length > 0 && (
        <div className="mb-4 flex justify-end">
          <input
            type="search"
            aria-label="Search listings"
            className="input w-full sm:w-72"
            placeholder="Search by address, suburb or code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-4 py-2">
                <div className="animate-pulse bg-slate-200 h-4 w-20 rounded" />
                <div className="animate-pulse bg-slate-200 h-4 w-48 rounded" />
                <div className="animate-pulse bg-slate-200 h-4 w-20 rounded" />
                <div className="animate-pulse bg-slate-200 h-4 w-16 rounded" />
                <div className="animate-pulse bg-slate-200 h-4 w-16 rounded" />
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10" />
              </svg>
            </div>
            <p className="text-slate-500 mb-4">No listings yet</p>
            <Link to="/listings/new" className="btn-primary">+ Add your first listing</Link>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No matches for "{search}".</p>
        ) : (
          <>
            {/* Desktop list */}
            <div className="hidden sm:block">
              <div className="grid grid-cols-[90px_1fr_110px_60px_60px_110px] gap-3 py-3 px-2 text-xs font-medium text-slate-500 border-b border-slate-200 uppercase tracking-wide">
                <div>Code</div>
                <div>Address</div>
                <div>Status</div>
                <div>Docs</div>
                <div>Leads</div>
                <div>Created</div>
              </div>
              <ul>
                {filtered.map(l => (
                  <li key={l.id}>
                    <Link
                      to={`/listings/${l.id}`}
                      className="grid grid-cols-[90px_1fr_110px_60px_60px_110px] gap-3 items-center py-3 px-2 border-b border-slate-50 hover:bg-slate-50 transition-colors duration-100 rounded-md text-sm"
                    >
                      <div className="font-mono text-xs text-slate-500">{l.short_code}</div>
                      <div className="min-w-0">
                        <div className="font-medium text-navy truncate">{l.address}</div>
                        {(l.suburb || l.city) && (
                          <div className="text-xs text-slate-500 truncate">
                            {[l.suburb, l.city].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </div>
                      <div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusClass(l.status)}`}>
                          {l.status}
                        </span>
                      </div>
                      <div className="text-slate-600">{l.document_count ?? 0}</div>
                      <div className="text-slate-600">{l.lead_count ?? 0}</div>
                      <div className="text-slate-500 text-xs">
                        {l.created_at ? new Date(l.created_at).toLocaleDateString('en-NZ') : '—'}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
              {filtered.map(l => (
                <Link
                  key={l.id}
                  to={`/listings/${l.id}`}
                  className="block border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="font-medium text-navy">{l.address}</div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize shrink-0 ${statusClass(l.status)}`}>
                      {l.status}
                    </span>
                  </div>
                  {(l.suburb || l.city) && (
                    <div className="text-xs text-slate-500 mb-2">
                      {[l.suburb, l.city].filter(Boolean).join(', ')}
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="font-mono">{l.short_code}</span>
                    <span>{l.document_count ?? 0} docs</span>
                    <span>{l.lead_count ?? 0} leads</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
