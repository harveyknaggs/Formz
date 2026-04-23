import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function toLocalInputValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatRange(startIso, endIso) {
  const s = new Date(startIso);
  const e = new Date(endIso);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return '—';
  const dayFmt = new Intl.DateTimeFormat('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' });
  const timeFmt = new Intl.DateTimeFormat('en-NZ', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${dayFmt.format(s)} · ${timeFmt.format(s)} – ${timeFmt.format(e)}`;
}

export default function OpenHomesEditor({ listingId, openHomes, onChange, disabled }) {
  const { api } = useAuth();
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (disabled) {
    return (
      <p className="text-xs text-slate-500">
        Save the listing first, then add open home times here.
      </p>
    );
  }

  const sorted = [...(openHomes || [])].sort((a, b) => new Date(a.start_at) - new Date(b.start_at));

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    if (!startInput) { setError('Pick a start time'); return; }
    if (!endInput) { setError('Pick an end time'); return; }
    const start = new Date(startInput);
    const end = new Date(endInput);
    if (end.getTime() <= start.getTime()) { setError('End time must be after start time'); return; }

    setBusy(true);
    try {
      const created = await api(`/api/listings/${listingId}/open-homes`, {
        method: 'POST',
        body: JSON.stringify({ start_at: start.toISOString(), end_at: end.toISOString() }),
      });
      onChange([...(openHomes || []), created]);
      setStartInput('');
      setEndInput('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (openHomeId) => {
    setError('');
    try {
      await api(`/api/listings/${listingId}/open-homes/${openHomeId}`, { method: 'DELETE' });
      onChange((openHomes || []).filter(o => o.id !== openHomeId));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      {sorted.length > 0 && (
        <ul className="mb-3 space-y-2">
          {sorted.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <span className="text-sm text-slate-700 font-medium">{formatRange(o.start_at, o.end_at)}</span>
              <button
                type="button"
                onClick={() => handleDelete(o.id)}
                className="text-slate-400 hover:text-red-600 transition-colors p-1"
                aria-label="Delete open home"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <div>
            <label className="label text-xs" htmlFor={`open-home-start-${listingId}`}>Start</label>
            <input
              id={`open-home-start-${listingId}`}
              type="datetime-local"
              className="input"
              value={startInput}
              onChange={e => {
                setStartInput(e.target.value);
                if (!endInput && e.target.value) {
                  const d = new Date(e.target.value);
                  if (!Number.isNaN(d.getTime())) {
                    d.setMinutes(d.getMinutes() + 30);
                    setEndInput(toLocalInputValue(d.toISOString()));
                  }
                }
              }}
            />
          </div>
          <div>
            <label className="label text-xs" htmlFor={`open-home-end-${listingId}`}>End</label>
            <input
              id={`open-home-end-${listingId}`}
              type="datetime-local"
              className="input"
              value={endInput}
              onChange={e => setEndInput(e.target.value)}
            />
          </div>
          <div>
            <button type="submit" disabled={busy} className="btn-primary w-full sm:w-auto">
              {busy ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        <p className="text-xs text-slate-500 mt-2">Buyers will see these on the public listing with "Add to calendar" links.</p>
      </form>
    </div>
  );
}
